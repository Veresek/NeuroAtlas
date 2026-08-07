"""
Tools for fetching research paper metadata and chemical/pharmacological information from:
- Europe PMC REST API
- PubMed (NCBI E-utilities) API
- PubChem REST API & PUG View
- PsychonautWiki GraphQL API
"""

import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Relevance & quality helpers
# ---------------------------------------------------------------------------

def _normalize(text: str) -> str:
    return (text or "").lower().strip()


def _query_tokens(query: str) -> List[str]:
    """Split a substance name into searchable tokens (e.g. 'gamma-hydroxybutyric acid')."""
    return [t for t in re.findall(r"[a-z0-9][a-z0-9\-']*", _normalize(query)) if len(t) > 1]


def is_relevant_paper(paper: Dict[str, Any], query: str) -> bool:
    """
    A paper is relevant when the substance name appears in its title or abstract.
    Multi-word names must match as a whole phrase OR all significant tokens.
    This filters out results that merely co-occur with the query (e.g. a
    tuberculosis paper that mentions alcohol once).
    """
    q = _normalize(query)
    tokens = _query_tokens(q)
    if not tokens:
        return True  # nothing meaningful to match against

    title = _normalize(paper.get("title", ""))
    abstract = _normalize(paper.get("abstract", ""))

    def matches(text: str) -> bool:
        if q in text:
            return True
        if len(tokens) > 1:
            return all(tok in text for tok in tokens)
        return tokens[0] in text

    return matches(title) or matches(abstract)


def has_minimum_metadata(paper: Dict[str, Any]) -> bool:
    """
    Keep only real, citable entries (title, abstract, publication year, journal).
    Drops stubs such as entries with no journal and no DOI that are just named
    after the substance.
    """
    if not paper.get("title") or not paper.get("abstract"):
        return False
    try:
        year = int(paper.get("year") or 0)
    except (TypeError, ValueError):
        year = 0
    return year > 0 and bool(paper.get("journal"))


def paper_quality_score(paper: Dict[str, Any]) -> int:
    """Higher is better: prefers complete metadata (journal, DOI, authors, year)."""
    score = 0
    if paper.get("journal"):
        score += 3
    if paper.get("doi"):
        score += 3
    if paper.get("authors"):
        score += 2
    if paper.get("year"):
        score += 2
    return score


def truncate_abstract(abstract: str, max_chars: int = 500, max_sentences: int = 3) -> str:
    """Keep abstracts SHORT: at most `max_sentences` sentences / `max_chars` characters."""
    if not abstract:
        return ""
    text = re.sub(r"\s+", " ", abstract).strip()
    sentences = re.split(r"(?<=[.!?])\s+", text)
    shortened = " ".join(sentences[:max_sentences]).strip()
    if len(shortened) > max_chars:
        shortened = shortened[:max_chars]
        cut = shortened.rfind(". ")
        if cut > max_chars // 2:
            shortened = shortened[: cut + 1]
        elif shortened.endswith(","):
            shortened = shortened[:-1]
        shortened = shortened.rstrip().rstrip(".,;:") + "."
    if not shortened.endswith((".", "!", "?")):
        shortened += "."
    return shortened


# ---------------------------------------------------------------------------
# Academic Paper Tools (Europe PMC & PubMed)
# ---------------------------------------------------------------------------

def fetch_europe_pmc_papers(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search Europe PMC API for research papers by substance query (e.g. 'alcohol', 'cannabis', 'caffeine').
    Retrieves titles, abstracts, DOIs, authors, publication year, and journal name.
    """
    base_url = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
    safe_query = query.replace('"', "").strip()
    search_query = f'(TITLE:"{safe_query}" OR ABSTRACT:"{safe_query}") AND (OPEN_ACCESS:y OR HAS_ABSTRACT:y)'
    params = {
        "query": search_query,
        "format": "json",
        "resultType": "core",
        "pageSize": str(max_results),
    }

    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NeuroAtlas/1.0 (https://github.com/NeuroAtlas)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
    except Exception as e:
        print(f"Error querying Europe PMC API: {e}")
        return []

    papers: List[Dict[str, Any]] = []
    for item in results:
        title = (item.get("title") or "").rstrip(".")

        # Extract authors
        author_list: List[str] = []
        if "authorList" in item and "author" in item["authorList"]:
            for a in item["authorList"]["author"]:
                full_name = a.get("fullName") or f"{a.get('lastName', '')} {a.get('initials', '')}".strip()
                if full_name:
                    author_list.append(full_name)
        elif item.get("authorString"):
            author_list = [a.strip() for a in item["authorString"].split(",") if a.strip()]

        # Extract publication year
        pub_year = item.get("pubYear")
        try:
            year = int(pub_year) if pub_year else 0
        except ValueError:
            year = 0

        # Extract journal
        journal_info = item.get("journalInfo", {})
        journal = item.get("journalTitle") or journal_info.get("journal", {}).get("title") or ""

        # Extract DOI
        doi_raw = item.get("doi", "")
        doi = f"https://doi.org/{doi_raw}" if doi_raw and not doi_raw.startswith("http") else doi_raw

        # Extract & clean abstract text
        abstract_raw = item.get("abstractText", "")
        abstract = re.sub(r"<[^>]+>", "", abstract_raw).strip()

        paper_id = item.get("id", item.get("pmid", ""))

        paper = {
            "id": paper_id,
            "title": title,
            "authors": author_list,
            "year": year,
            "journal": journal,
            "doi": doi,
            "abstract": truncate_abstract(abstract),
        }
        if is_relevant_paper(paper, query) and has_minimum_metadata(paper):
            papers.append(paper)

    return papers


def fetch_pubmed_papers(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search NCBI PubMed via E-utilities (esearch + efetch) for research papers by substance query.
    Retrieves titles, abstracts, DOIs, authors, publication year, and journal name.
    """
    # 1. Search for PMIDs matching query
    search_base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
    search_params = {
        "db": "pubmed",
        "term": f'"{query}"[Title/Abstract] AND hasabstract[text]',
        "retmode": "json",
        "retmax": str(max_results),
    }
    search_url = f"{search_base}?{urllib.parse.urlencode(search_params)}"

    req = urllib.request.Request(
        search_url,
        headers={"User-Agent": "NeuroAtlas/1.0 (https://github.com/NeuroAtlas)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            search_data = json.loads(response.read().decode("utf-8"))
            pmids = search_data.get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        print(f"Error executing PubMed esearch: {e}")
        return []

    if not pmids:
        return []

    # 2. Fetch XML details for PMIDs
    fetch_base = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
    fetch_params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
    }
    fetch_url = f"{fetch_base}?{urllib.parse.urlencode(fetch_params)}"

    req = urllib.request.Request(
        fetch_url,
        headers={"User-Agent": "NeuroAtlas/1.0 (https://github.com/NeuroAtlas)"}
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_bytes = response.read()
            root = ET.fromstring(xml_bytes)
    except Exception as e:
        print(f"Error executing PubMed efetch: {e}")
        return []

    papers: List[Dict[str, Any]] = []
    for article in root.findall(".//PubmedArticle"):
        pmid = article.findtext(".//PMID") or ""

        # Title
        title_el = article.find(".//ArticleTitle")
        title = "".join(title_el.itertext()).strip().rstrip(".") if title_el is not None else ""

        # Abstract
        abstract_elements = article.findall(".//AbstractText")
        abstract_parts = []
        for a_el in abstract_elements:
            label = a_el.get("Label")
            text = "".join(a_el.itertext()).strip()
            if label:
                abstract_parts.append(f"{label}: {text}")
            else:
                abstract_parts.append(text)
        abstract = " ".join(abstract_parts).strip()

        # Authors
        authors: List[str] = []
        for author_el in article.findall(".//Author"):
            last_name = author_el.findtext("LastName")
            fore_name = author_el.findtext("ForeName") or author_el.findtext("Initials")
            if last_name:
                authors.append(f"{last_name}, {fore_name}" if fore_name else last_name)

        # Journal
        journal = article.findtext(".//Journal/Title") or article.findtext(".//Journal/ISOAbbreviation") or ""

        # Year
        year_str = (
            article.findtext(".//JournalIssue/PubDate/Year")
            or article.findtext(".//ArticleDate/Year")
            or article.findtext(".//PubDate/Year")
            or ""
        )
        try:
            year = int(year_str) if year_str else 0
        except ValueError:
            year = 0

        # DOI
        doi = ""
        for id_el in article.findall(".//ArticleId"):
            if id_el.get("IdType") == "doi":
                doi_val = id_el.text or ""
                doi = f"https://doi.org/{doi_val}" if not doi_val.startswith("http") else doi_val
                break

        paper = {
            "id": f"pmid-{pmid}" if pmid else "",
            "title": title,
            "authors": authors,
            "year": year,
            "journal": journal,
            "doi": doi,
            "abstract": truncate_abstract(abstract),
        }
        if is_relevant_paper(paper, query) and has_minimum_metadata(paper):
            papers.append(paper)

    return papers


def search_research_papers(query: str, max_results: int = 5, source: str = "europe_pmc") -> List[Dict[str, Any]]:
    """
    Search research papers by substance query.
    Attempts primary source ('europe_pmc' or 'pubmed') and falls back to the other if no results are returned.
    """
    if source.lower() == "pubmed":
        results = fetch_pubmed_papers(query, max_results=max_results)
        if not results:
            results = fetch_europe_pmc_papers(query, max_results=max_results)
    else:
        results = fetch_europe_pmc_papers(query, max_results=max_results)
        if not results:
            results = fetch_pubmed_papers(query, max_results=max_results)

    return results


def search_research_papers_iterative(
    query: str,
    target_count: int = 5,
    max_attempts: int = 6,
) -> List[Dict[str, Any]]:
    """
    Keep searching until we have `target_count` relevant, well-formed papers.

    Instead of a single one-shot fetch, this iterates over Europe PMC and PubMed
    with a growing candidate pool, keeps only papers that pass the relevance and
    metadata-quality filters, deduplicates by DOI/id, and ranks the results
    (title matches first, then metadata quality, then newest). It never pads the
    output with off-topic or stub entries.
    """
    collected: List[Dict[str, Any]] = []
    seen = set()
    attempts = 0

    sources = ["europe_pmc", "pubmed"]
    # Grow the candidate pool each attempt so we can find enough relevant papers.
    sizes = [max(target_count, 6), max(target_count * 2, 12), 30, 50]

    for source in sources:
        for size in sizes:
            if len(collected) >= target_count:
                break
            attempts += 1
            if attempts > max_attempts:
                break
            print(f"   · searching {source} (up to {size} candidates)...")
            results = search_research_papers(query, max_results=size, source=source)
            for paper in results:
                if not is_relevant_paper(paper, query) or not has_minimum_metadata(paper):
                    continue
                pid = paper.get("doi") or paper.get("id")
                if not pid or pid in seen:
                    continue
                seen.add(pid)
                collected.append(paper)
            if len(collected) >= target_count:
                break
        if len(collected) >= target_count:
            break

    # Rank: title matches first, then metadata quality, then publication year.
    q = _normalize(query)
    collected.sort(
        key=lambda p: (
            q not in _normalize(p.get("title", "")),
            -paper_quality_score(p),
            -(int(p.get("year") or 0)),
        )
    )

    if len(collected) < target_count:
        print(
            f"   ⚠️ Only found {len(collected)} relevant paper(s) after {attempts} attempt(s) "
            f"(target was {target_count}). Using what we have."
        )
    return collected


# ---------------------------------------------------------------------------
# Chemical & Pharmacological Tools (PubChem REST API & PsychonautWiki API)
# ---------------------------------------------------------------------------

def fetch_pubchem_compound(substance_name: str) -> Dict[str, Any]:
    """
    Fetch chemical metadata and pharmacology / mechanism of action from PubChem REST API.
    Retrieves CID, IUPAC Name, Molecular Formula, Molecular Weight, Canonical SMILES, Description,
    and Mechanism of Action text detailing neurotransmitter & receptor interactions.
    """
    encoded_name = urllib.parse.quote(substance_name)
    result: Dict[str, Any] = {
        "substance": substance_name,
        "cid": None,
        "iupacName": None,
        "molecularFormula": None,
        "molecularWeight": None,
        "canonicalSmiles": None,
        "description": None,
        "mechanismOfAction": None,
    }

    # 1. Properties
    prop_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES/JSON"
    req = urllib.request.Request(prop_url, headers={"User-Agent": "NeuroAtlas/1.0"})

    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            prop_data = json.loads(res.read().decode("utf-8"))
            props_list = prop_data.get("PropertyTable", {}).get("Properties", [])
            if props_list:
                props = props_list[0]
                result["cid"] = props.get("CID")
                result["iupacName"] = props.get("IUPACName")
                result["molecularFormula"] = props.get("MolecularFormula")
                result["molecularWeight"] = props.get("MolecularWeight")
                result["canonicalSmiles"] = props.get("CanonicalSMILES")
    except Exception as e:
        print(f"PubChem Properties error for '{substance_name}': {e}")

    # 2. Description
    desc_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{encoded_name}/description/JSON"
    req = urllib.request.Request(desc_url, headers={"User-Agent": "NeuroAtlas/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            desc_data = json.loads(res.read().decode("utf-8"))
            info_list = desc_data.get("InformationList", {}).get("Information", [])
            for info in info_list:
                if "Description" in info:
                    result["description"] = info["Description"]
                    break
    except Exception as e:
        print(f"PubChem Description error for '{substance_name}': {e}")

    # 3. Pharmacology / Mechanism of Action via PUG View if CID exists
    if result["cid"]:
        cid = result["cid"]
        pug_view_url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug_view/data/compound/{cid}/JSON?heading=Mechanism+of+Action"
        req = urllib.request.Request(pug_view_url, headers={"User-Agent": "NeuroAtlas/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                pv_data = json.loads(res.read().decode("utf-8"))
                sections = pv_data.get("Record", {}).get("Section", [])
                mechanisms: List[str] = []

                def _extract_strings(node: Any) -> None:
                    if isinstance(node, dict):
                        if "String" in node and isinstance(node["String"], str):
                            mechanisms.append(node["String"])
                        for v in node.values():
                            _extract_strings(v)
                    elif isinstance(node, list):
                        for item in node:
                            _extract_strings(item)

                _extract_strings(sections)
                if mechanisms:
                    result["mechanismOfAction"] = " ".join(mechanisms[:4])
        except Exception:
            pass

    return result


def fetch_psychonautwiki_substance(substance_name: str) -> Dict[str, Any]:
    """
    Query PsychonautWiki GraphQL API for substance categories, psychoactive & chemical classes,
    common names, toxicity, addiction potential, tolerance, and reported effects.
    """
    gql_url = "https://api.psychonautwiki.org/"
    query = """
    query GetSubstance($name: String!) {
      substances(query: $name) {
        name
        url
        summary
        systematicName
        commonNames
        class {
          chemical
          psychoactive
        }
        tolerance {
          full
          half
          zero
        }
        addictionPotential
        toxicity
        effects {
          name
        }
      }
    }
    """
    payload = json.dumps({"query": query, "variables": {"name": substance_name}}).encode("utf-8")
    req = urllib.request.Request(
        gql_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "NeuroAtlas/1.0"}
    )

    result: Dict[str, Any] = {
        "substance": substance_name,
        "name": None,
        "url": None,
        "summary": None,
        "chemicalClass": [],
        "psychoactiveClass": [],
        "commonNames": [],
        "tolerance": None,
        "addictionPotential": None,
        "toxicity": [],
        "effects": [],
    }

    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode("utf-8"))
            substances = data.get("data", {}).get("substances", [])
            if substances:
                sub = substances[0]
                result["name"] = sub.get("name")
                result["url"] = sub.get("url")
                result["summary"] = sub.get("summary")

                cls = sub.get("class") or {}
                result["chemicalClass"] = cls.get("chemical") or []
                result["psychoactiveClass"] = cls.get("psychoactive") or []

                result["commonNames"] = sub.get("commonNames") or []
                result["tolerance"] = sub.get("tolerance")
                result["addictionPotential"] = sub.get("addictionPotential")
                result["toxicity"] = sub.get("toxicity") or []

                effects_raw = sub.get("effects") or []
                result["effects"] = [e["name"] for e in effects_raw if "name" in e]
    except Exception as e:
        print(f"Error querying PsychonautWiki API for '{substance_name}': {e}")

    return result


def fetch_substance_chemical_metadata(substance_name: str) -> Dict[str, Any]:
    """
    Retrieve aggregated chemical metadata, categories, and receptor / neurotransmitter details
    by querying both PubChem REST API and PsychonautWiki GraphQL API.
    """
    pubchem_data = fetch_pubchem_compound(substance_name)
    psychonaut_data = fetch_psychonautwiki_substance(substance_name)

    return {
        "substance": substance_name,
        "pubchem": pubchem_data,
        "psychonautWiki": psychonaut_data,
    }