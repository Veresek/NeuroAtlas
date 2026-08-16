"""
Tools for fetching research paper metadata and chemical/pharmacological information from:
- Europe PMC REST API
- PubMed (NCBI E-utilities) API
- PubChem REST API & PUG View
- PsychonautWiki GraphQL API

Wrapped as LangChain Tools and Python helper functions.
"""

import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Set
from langchain_core.tools import tool


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
    A paper is relevant when the substance name or key tokens appear in its title or abstract.
    This filters out results that merely co-occur with the query or are off-topic.
    """
    q = _normalize(query)
    tokens = _query_tokens(q)
    if not tokens:
        return True

    title = _normalize(paper.get("title", ""))
    abstract = _normalize(paper.get("abstract", ""))

    def matches(text: str) -> bool:
        if not text:
            return False
        if q in text:
            return True
        if len(tokens) > 1:
            return all(tok in text for tok in tokens)
        return tokens[0] in text

    return matches(title) or matches(abstract)


def has_minimum_metadata(paper: Dict[str, Any], query: str = "") -> bool:
    """
    Keep only valid, citable peer-reviewed entries.
    Filters out database stubs, LactMed monographs, and book records that lack
    authors, journals, DOIs, or have bare single-word titles.
    """
    title = (paper.get("title") or "").strip()
    abstract = (paper.get("abstract") or "").strip()

    if not title or not abstract or len(title) < 15 or len(abstract) < 50:
        return False

    # Filter out entries where the title is just the bare substance name
    title_lower = title.lower()
    q_lower = _normalize(query)
    if title_lower == q_lower or title_lower in [
        "alcohol",
        "caffeine",
        "mdma",
        "nicotine",
        "cannabis",
        "cocaine",
        "morphine",
        "heroin",
        "methamphetamine",
        "psilocybin",
        "ketamine",
        "lsd",
    ]:
        return False

    # Must have at least one author
    authors = paper.get("authors") or []
    if not authors or len(authors) == 0:
        return False

    # Must have a publication journal OR a DOI
    journal = (paper.get("journal") or "").strip()
    doi = (paper.get("doi") or "").strip()
    if not journal and not doi:
        return False

    # Must have a plausible publication year
    try:
        year = int(paper.get("year") or 0)
    except (TypeError, ValueError):
        year = 0

    if year < 1950 or year > 2035:
        return False

    return True


def paper_quality_score(paper: Dict[str, Any]) -> int:
    """Higher is better: prefers complete metadata (journal, DOI, authors, year)."""
    score = 0
    if paper.get("journal"):
        score += 3
    if paper.get("doi"):
        score += 3
    if paper.get("authors") and len(paper["authors"]) > 0:
        score += 2
    if paper.get("year") and int(paper["year"]) > 1990:
        score += 2
    if len(paper.get("abstract", "")) > 100:
        score += 2
    return score


def truncate_abstract(abstract: str, max_chars: int = 500, max_sentences: int = 3) -> str:
    """Keep abstracts concise: at most `max_sentences` sentences / `max_chars` characters."""
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

def fetch_europe_pmc_papers(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """
    Search Europe PMC API for research papers by substance query.
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
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode("utf-8"))
            results = data.get("resultList", {}).get("result", [])
    except Exception as e:
        print(f"   ⚠️ Europe PMC search error: {e}")
        return []

    papers: List[Dict[str, Any]] = []
    for item in results:
        title = (item.get("title") or "").rstrip(".")
        if not title:
            continue

        # Extract authors safely
        author_list: List[str] = []
        author_list_raw = item.get("authorList")
        if isinstance(author_list_raw, dict) and "author" in author_list_raw:
            authors_data = author_list_raw["author"]
            if isinstance(authors_data, list):
                for a in authors_data:
                    if isinstance(a, dict):
                        full_name = a.get("fullName") or f"{a.get('lastName', '')} {a.get('initials', '')}".strip()
                        if full_name:
                            author_list.append(full_name)
        elif item.get("authorString"):
            author_list = [a.strip() for a in item["authorString"].split(",") if a.strip()]

        # Extract publication year
        pub_year = item.get("pubYear")
        try:
            year = int(pub_year) if pub_year else 0
        except (ValueError, TypeError):
            year = 0

        # Extract journal safely
        journal_info = item.get("journalInfo")
        journal = item.get("journalTitle") or ""
        if not journal and isinstance(journal_info, dict):
            journal_obj = journal_info.get("journal")
            if isinstance(journal_obj, dict):
                journal = journal_obj.get("title") or journal_obj.get("medlineAbbreviation") or ""

        # Extract DOI
        doi_raw = item.get("doi", "") or ""
        doi = f"https://doi.org/{doi_raw}" if doi_raw and not doi_raw.startswith("http") else doi_raw

        # Extract & clean abstract text
        abstract_raw = item.get("abstractText", "") or ""
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
        if is_relevant_paper(paper, query) and has_minimum_metadata(paper, query=query):
            papers.append(paper)

    return papers


def fetch_pubmed_papers(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
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
        with urllib.request.urlopen(req, timeout=12) as response:
            search_data = json.loads(response.read().decode("utf-8"))
            pmids = search_data.get("esearchresult", {}).get("idlist", [])
    except Exception as e:
        print(f"   ⚠️ PubMed esearch error: {e}")
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
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_bytes = response.read()
            root = ET.fromstring(xml_bytes)
    except Exception as e:
        print(f"   ⚠️ PubMed efetch error: {e}")
        return []

    papers: List[Dict[str, Any]] = []
    for article in root.findall(".//PubmedArticle"):
        pmid = article.findtext(".//PMID") or ""

        # Title
        title_el = article.find(".//ArticleTitle")
        title = "".join(title_el.itertext()).strip().rstrip(".") if title_el is not None else ""
        if not title:
            continue

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
        if is_relevant_paper(paper, query) and has_minimum_metadata(paper, query=query):
            papers.append(paper)

    return papers


def search_research_papers_iterative(
    query: str,
    target_count: int = 5,
    max_attempts: int = 6,
    alternate_names: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Search Europe PMC and PubMed until `target_count` relevant, well-formed papers are gathered.
    Deduplicates by DOI, PMID, and title, and ranks results by quality and recency.
    """
    collected: List[Dict[str, Any]] = []
    seen_keys: Set[str] = set()
    attempts = 0

    search_queries = [query]
    if alternate_names:
        for alt in alternate_names[:2]:
            if alt and alt.lower() != query.lower() and len(alt) > 2:
                search_queries.append(alt)

    sources = ["europe_pmc", "pubmed"]
    candidate_sizes = [max(target_count, 6), max(target_count * 2, 12), 25, 40]

    for q in search_queries:
        for source in sources:
            for size in candidate_sizes:
                if len(collected) >= target_count:
                    break
                attempts += 1
                if attempts > max_attempts:
                    break

                if source == "europe_pmc":
                    results = fetch_europe_pmc_papers(q, max_results=size)
                else:
                    results = fetch_pubmed_papers(q, max_results=size)

                for paper in results:
                    if not is_relevant_paper(paper, query) or not has_minimum_metadata(paper, query=query):
                        continue

                    # Deduplication key: DOI or normalized title
                    norm_title = _normalize(paper.get("title", ""))[:60]
                    doi_key = paper.get("doi") or norm_title
                    if doi_key in seen_keys or norm_title in seen_keys:
                        continue

                    seen_keys.add(doi_key)
                    seen_keys.add(norm_title)
                    collected.append(paper)

                if len(collected) >= target_count:
                    break
            if len(collected) >= target_count:
                break
        if len(collected) >= target_count:
            break

    # Sort results: title exact matches first, then quality score, then year
    q_norm = _normalize(query)
    collected.sort(
        key=lambda p: (
            q_norm not in _normalize(p.get("title", "")),
            -paper_quality_score(p),
            -(int(p.get("year") or 0)),
        )
    )

    return collected[: max(target_count, len(collected))]


# ---------------------------------------------------------------------------
# Chemical & Pharmacological Tools (PubChem REST API & PsychonautWiki API)
# ---------------------------------------------------------------------------

def fetch_pubchem_compound(substance_name: str) -> Dict[str, Any]:
    """
    Fetch chemical metadata and pharmacology / mechanism of action from PubChem REST API.
    Retrieves CID, IUPAC Name, Molecular Formula, Molecular Weight, Canonical SMILES, Description,
    synonyms, and Mechanism of Action text detailing neurotransmitter & receptor interactions.
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
        "synonyms": [],
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
    except Exception:
        pass

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
    except Exception:
        pass

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
                result["effects"] = [e["name"] for e in effects_raw if isinstance(e, dict) and "name" in e]
    except Exception:
        pass

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


# ---------------------------------------------------------------------------
# LangChain Tool Decorators
# ---------------------------------------------------------------------------

@tool
def search_research_papers(query: str, target_count: int = 5) -> List[Dict[str, Any]]:
    """Search Europe PMC and PubMed for peer-reviewed research papers about a substance."""
    return search_research_papers_iterative(query, target_count=target_count)


@tool
def fetch_chemical_and_pharmacology_metadata(substance_name: str) -> Dict[str, Any]:
    """Fetch chemical properties and pharmacological mechanism of action from PubChem and PsychonautWiki."""
    return fetch_substance_chemical_metadata(substance_name)


RESEARCH_TOOLS = [search_research_papers, fetch_chemical_and_pharmacology_metadata]