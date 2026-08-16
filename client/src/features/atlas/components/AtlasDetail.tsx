import { useState, useRef } from "react";
import CloseIcon from "@/assets/close.svg?react";
import ChevronDownIcon from "@/assets/chevron-down.svg?react";
import ExternalLinkIcon from "@/assets/external-link.svg?react";
import atlasData from "@/data/atlas.json";
import researchData from "@/data/research.json";
import type { BrainItemData } from "@/types/brain";
import { BrainSectionList } from "@/components/shared/BrainSectionList";

import { useActiveNeurotransmitter } from "@/hooks/useActiveNeurotransmitter";

interface AtlasDetailProps {
	item: string;
	section: string;
	onClose: () => void;
	onSelectItem: (item: string, section: string) => void;
}

type PhaseType = "acute" | "chronic" | "withdrawal";

// Helper to find item data across our JSON files
function findItemData(itemName: string | null): BrainItemData | null {
	if (!itemName) return null;

	const allSections = [...atlasData];
	for (const section of allSections) {
		const found = section.items.find((i: { name?: string }) => i.name === itemName);
		if (found) return found as BrainItemData;
	}
	return null;
}

export function AtlasDetail({ item, section, onClose, onSelectItem }: AtlasDetailProps) {
	const itemData = findItemData(item);
	const availablePhases = itemData?.phases ? (Object.keys(itemData.phases) as PhaseType[]) : [];

	const [selectedPhase, setSelectedPhase] = useState<PhaseType | null>(null);
	const { activeNt, setActiveNeurotransmitter, clearActiveNeurotransmitter } = useActiveNeurotransmitter();
	const [prevItem, setPrevItem] = useState<string | null>(item);
	const hoverTimeoutRef = useRef<number | null>(null);

	if (item !== prevItem) {
		setPrevItem(item);
		setSelectedPhase(null);
		clearActiveNeurotransmitter();
	}

	let activePhase: PhaseType = "acute";
	if (selectedPhase && availablePhases.includes(selectedPhase)) {
		activePhase = selectedPhase;
	} else if (availablePhases.length > 0 && !availablePhases.includes("acute")) {
		activePhase = availablePhases[0];
	}

	const setActivePhase = (phase: PhaseType) => {
		setSelectedPhase(phase);
		clearActiveNeurotransmitter();
	};

	const currentPhaseData = itemData?.phases ? itemData.phases[activePhase] : null;

	// Helper to format phase names nicely
	const formatPhaseName = (phase: string) => {
		if (phase === "acute") return "Acute";
		if (phase === "chronic") return "Chronic";
		if (phase === "withdrawal") return "Withdrawal";
		return phase;
	};

	return (
		<>
			{/* Header - Fixed */}
			<div className="flex items-center px-4 py-2 border-b border-gray-200/60 shrink-0">
				<button
					onClick={onClose}
					className="p-1.5 -ml-1.5 mr-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer md:hidden flex items-center justify-center"
					aria-label="Back"
				>
					<ChevronDownIcon className="w-5 h-5 text-gray-500 rotate-90" />
				</button>
				<div className="flex-1">
					<p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{section}</p>
					<h2 className="text-base font-bold text-gray-800 leading-tight">{item}</h2>
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
				{/* Phase Toggle Capsule - Now scrolls with content */}
				{availablePhases.length > 0 && (
					<div className="flex p-1 space-x-1 bg-gray-100/80 rounded-xl max-w-full overflow-x-auto hide-scrollbar mb-2">
						{(["acute", "chronic", "withdrawal"] as PhaseType[]).map((phase) => {
							const isAvailable = availablePhases.includes(phase);
							const isActive = activePhase === phase;

							if (!isAvailable && !isActive) return null; // Only show available phases

							return (
								<button
									key={phase}
									onClick={() => setActivePhase(phase)}
									className={`flex-1 min-w-[70px] px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${isActive
										? "bg-white text-gray-800 shadow-sm ring-1 ring-gray-900/5"
										: "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 cursor-pointer"
										}`}
								>
									{formatPhaseName(phase)}
								</button>
							);
						})}
					</div>
				)}

				{/* Description (Overall) */}
				{itemData?.shortDescription ? (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Description</h3>
						<p className="leading-relaxed">{itemData.shortDescription}</p>
					</div>
				) : (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Description</h3>
						<p className="leading-relaxed text-gray-500 italic">No description available.</p>
					</div>
				)}

				{/* Brain Impact for specific phase */}
				{currentPhaseData?.brainImpact && (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Brain Impact ({formatPhaseName(activePhase)})</h3>
						<p className="leading-relaxed">{currentPhaseData.brainImpact}</p>
					</div>
				)}

				{currentPhaseData?.affectedBrainAreas && (
					<BrainSectionList
						items={currentPhaseData.affectedBrainAreas}
						resetKey={`${item}-${activePhase}`}
					/>
				)}
				{/* Neurotransmitters for specific phase */}
				{currentPhaseData?.neurotransmitters && currentPhaseData.neurotransmitters.length > 0 && (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1.5">Neurotransmitters & Modulators</h3>
						<div className="flex flex-wrap gap-1.5">
							{currentPhaseData.neurotransmitters.map((nt, idx) => {
								const tip = nt.mechanism || nt.description;
								const isActive = activeNt?.name === nt.name;
								return (
									<button
										key={`${nt.name}-${idx}`}
										type="button"
										onMouseEnter={() => {
											if (hoverTimeoutRef.current) {
												clearTimeout(hoverTimeoutRef.current);
											}
											if (!activeNt?.isLocked) {
												hoverTimeoutRef.current = window.setTimeout(() => {
													setActiveNeurotransmitter({
														name: nt.name,
														mechanism: tip,
														substanceName: item,
														phaseName: formatPhaseName(activePhase),
														isLocked: false,
													});
												}, 80);
											}
										}}
										onMouseLeave={() => {
											if (hoverTimeoutRef.current) {
												clearTimeout(hoverTimeoutRef.current);
											}
											if (!activeNt?.isLocked) {
												hoverTimeoutRef.current = window.setTimeout(() => {
													clearActiveNeurotransmitter();
												}, 100);
											}
										}}
										onClick={() => {
											if (hoverTimeoutRef.current) {
												clearTimeout(hoverTimeoutRef.current);
											}
											if (activeNt?.name === nt.name && activeNt.isLocked) {
												clearActiveNeurotransmitter();
											} else {
												setActiveNeurotransmitter({
													name: nt.name,
													mechanism: tip,
													substanceName: item,
													phaseName: formatPhaseName(activePhase),
													isLocked: true,
												});
											}
										}}
										className={`inline-flex items-center justify-center px-2.5 py-[5px] text-xs rounded-full font-medium transition-colors duration-150 cursor-pointer select-none leading-none ${
											isActive
												? "bg-[#00aaff] text-white shadow-xs"
												: "bg-[#00aaff]/10 text-[#00aaff] hover:bg-[#00aaff]/20"
										}`}
									>
										{nt.name}
									</button>
								);
							})}
						</div>
					</div>
				)}

				{/* Research Sources */}
				{itemData && (() => {
					const linkedResearch = researchData.filter(paper =>
						paper.relatedAtlasItems?.includes(itemData.id)
					);
					if (linkedResearch.length === 0) return null;

					return (
						<div>
							<div className="flex items-center gap-2 mb-2">
								<h3 className="font-semibold text-gray-800">Research Sources</h3>
								<span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
									{linkedResearch.length}
								</span>
							</div>
							<div className="space-y-2">
								{linkedResearch.map((paper) => (
									<div
										key={paper.id}
										onClick={() => onSelectItem(paper.title, "Research")}
										className="block p-2.5 rounded-lg border border-gray-200/60 hover:border-[#00aaff]/40 bg-gray-50/50 hover:bg-[#00aaff]/5 transition-all duration-200 group cursor-pointer"
									>
										<div className="flex items-start justify-between gap-1">
											<p className="text-sm font-medium text-gray-800 group-hover:text-[#00aaff] leading-snug transition-colors duration-200">
												{paper.title}
											</p>
											<a
												href={paper.doi}
												target="_blank"
												rel="noopener noreferrer"
												onClick={(e) => e.stopPropagation()}
												className="text-gray-300 hover:text-[#00aaff] shrink-0 mt-0.5 transition-colors p-0.5 rounded hover:bg-gray-100"
												title="Open DOI link"
											>
												<ExternalLinkIcon className="w-3.5 h-3.5" />
											</a>
										</div>
										<div className="flex items-center justify-between mt-1 text-xs text-gray-400">
											<span className="truncate max-w-[180px]" title={paper.authors.join(", ")}>
												{paper.authors.join(", ")}
											</span>
											<span className="font-semibold text-[#00aaff] shrink-0">
												{paper.year}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})()}
			</div>
		</>
	);
}
