import CloseIcon from "@/assets/close.svg?react";
import ChevronDownIcon from "@/assets/chevron-down.svg?react";
import ExternalLinkIcon from "@/assets/external-link.svg?react";
import atlasData from "@/data/atlas.json";
import researchData from "@/data/research.json";
import { BrainSectionList } from "@/components/shared/BrainSectionList";

interface ResearchDetailProps {
	item: string;
	section: string;
	onClose: () => void;
}

// Helper to get atlas item display name
const getAtlasItemName = (itemId: string) => {
	for (const sec of atlasData) {
		const found = sec.items.find(item => item.id === itemId);
		if (found) return found.name;
	}
	return itemId.charAt(0).toUpperCase() + itemId.slice(1);
};

export function ResearchDetail({ item, section, onClose }: ResearchDetailProps) {
	const paper = researchData.find(p => p.title === item);

	if (!paper) {
		return (
			<>
				<div className="flex items-center px-4 py-2 border-b border-gray-200/60 shrink-0">
					<button
						onClick={onClose}
						className="p-1.5 -ml-1.5 mr-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer md:hidden flex items-center justify-center"
						aria-label="Back"
					>
						<ChevronDownIcon className="w-5 h-5 text-gray-500 rotate-90" />
					</button>
					<div className="flex-1 min-w-0">
						<p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{section}</p>
						<h2 className="text-base font-bold text-gray-800 leading-tight truncate" title={item || ""}>
							{item}
						</h2>
					</div>
					<button
						onClick={onClose}
						className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer hidden md:flex items-center justify-center"
						aria-label="Close"
					>
						<CloseIcon className="w-4 h-4 text-gray-400" />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-4 text-center">
					<p className="leading-relaxed text-gray-500 italic">Publication details not found.</p>
				</div>
			</>
		);
	}

	const relatedTopics = paper.relatedAtlasItems || [];

	return (
		<>
			<div className="flex items-center px-4 py-2 border-b border-gray-200/60 shrink-0">
				<button
					onClick={onClose}
					className="p-1.5 -ml-1.5 mr-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer md:hidden flex items-center justify-center"
					aria-label="Back"
				>
					<ChevronDownIcon className="w-5 h-5 text-gray-500 rotate-90" />
				</button>
				<div className="flex-1 min-w-0">
					<p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{section}</p>
					<h2 className="text-base font-bold text-gray-800 leading-tight truncate" title={item || ""}>
						{item}
					</h2>
				</div>
				<button
					onClick={onClose}
					className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer hidden md:flex items-center justify-center"
					aria-label="Close"
				>
					<CloseIcon className="w-4 h-4 text-gray-400" />
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-gray-600">
				{/* Metadata */}
				<div className="p-3 bg-gray-50 rounded-xl border border-gray-200/50 space-y-2">
					<div className="space-y-0.5">
						<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Authors</p>
						<p className="text-sm font-semibold text-gray-700 leading-relaxed">{paper.authors.join(", ")}</p>
					</div>
					<div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-gray-200/40">
						<div>
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Year</p>
							<p className="text-sm font-bold text-[#00aaff]">{paper.year}</p>
						</div>
						<div>
							<p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Journal</p>
							<p className="text-sm font-medium text-gray-600 truncate" title={`${paper.journal} ${paper.volume || ""}`}>
								{paper.journal} {paper.volume ? `(${paper.volume})` : ""}
							</p>
						</div>
					</div>
				</div>

				{/* Abstract */}
				<div>
					<h3 className="font-semibold text-gray-800 mb-1">Abstract</h3>
					<p className="leading-relaxed text-gray-600 bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
						{paper.abstract}
					</p>
				</div>

				{paper.relatedBrainAreas && (
					<BrainSectionList
						items={paper.relatedBrainAreas}
						title="Affected Brain Areas"
						resetKey={item}
					/>
				)}

				{relatedTopics.length > 0 && (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Related Topics</h3>
						<div className="flex flex-wrap gap-1.5 mt-1">
							{relatedTopics.map((topicId, idx) => {
								const topicName = getAtlasItemName(topicId);
								return (
									<span
										key={`${topicId}-${idx}`}
										className="inline-block px-2 py-0.5 text-xs rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200"
									>
										{topicName}
									</span>
								);
							})}
						</div>
					</div>
				)}

				<div className="pt-2">
					<a
						href={paper.doi}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#00aaff]/25 text-[#00aaff] hover:bg-[#00aaff]/5 hover:border-[#00aaff]/50 font-semibold text-sm transition-all duration-250 cursor-pointer shadow-sm bg-white"
					>
						<span>Read Full Paper</span>
						<ExternalLinkIcon className="w-4 h-4 shrink-0" />
					</a>
				</div>
			</div>
		</>
	);
}
