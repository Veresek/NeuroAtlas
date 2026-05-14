import { useState } from "react";
import CloseIcon from "@/assets/close.svg?react";
import atlasData from "@/data/atlas.json";
import type { BrainItemData } from "@/types/brain";

import ChevronDownIcon from "@/assets/chevron-down.svg?react";

interface DetailPanelProps {
	item: string | null;
	section: string | null;
	onClose: () => void;
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

function DetailContent({ item, section, onClose }: DetailPanelProps) {
	const itemData = findItemData(item);
	const availablePhases = itemData?.phases ? (Object.keys(itemData.phases) as PhaseType[]) : [];

	const [selectedPhase, setSelectedPhase] = useState<PhaseType | null>(null);
	const [prevItem, setPrevItem] = useState<string | null>(item);

	if (item !== prevItem) {
		setPrevItem(item);
		setSelectedPhase(null);
	}

	let activePhase: PhaseType = "acute";
	if (selectedPhase && availablePhases.includes(selectedPhase)) {
		activePhase = selectedPhase;
	} else if (availablePhases.length > 0 && !availablePhases.includes("acute")) {
		activePhase = availablePhases[0];
	}

	const setActivePhase = (phase: PhaseType) => setSelectedPhase(phase);

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
					<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">{section}</p>
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
									className={`flex-1 min-w-[70px] px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
										isActive 
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
						<p className="leading-relaxed text-gray-400 italic">No description available.</p>
					</div>
				)}

				{/* Brain Impact for specific phase */}
				{currentPhaseData?.brainImpact && (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Brain Impact ({formatPhaseName(activePhase)})</h3>
						<p className="leading-relaxed">{currentPhaseData.brainImpact}</p>
					</div>
				)}

				{/* Brain Areas for specific phase */}
				{currentPhaseData?.affectedBrainAreas && currentPhaseData.affectedBrainAreas.length > 0 && (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Brain Areas</h3>
						<div className="flex flex-wrap gap-1.5 mt-1">
							{currentPhaseData.affectedBrainAreas.map((area, idx) => (
								<span
									key={`${area.areaId}-${idx}`}
									className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
										area.effectType === "stimulates" ? "bg-green-100 text-green-700" :
										area.effectType === "depresses" ? "bg-blue-100 text-blue-700" :
										area.effectType === "damages" ? "bg-red-100 text-red-700" :
										"bg-[#00aaff]/10 text-[#00aaff]"
									}`}
								>
									{area.name} {area.effectType ? `(${area.effectType})` : ""}
								</span>
							))}
						</div>
					</div>
				)}

				{/* Neurotransmitters for specific phase */}
				{currentPhaseData?.neurotransmitters && currentPhaseData.neurotransmitters.length > 0 && (
					<div>
						<h3 className="font-semibold text-gray-800 mb-1">Neurotransmitters</h3>
						<div className="flex flex-wrap gap-1.5 mt-1">
							{currentPhaseData.neurotransmitters.map((nt, idx) => (
								<span
									key={`${nt.name}-${idx}`}
									className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${
										nt.effect === "increase" ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50" :
										nt.effect === "decrease" ? "bg-rose-50 text-rose-600 border border-rose-200/50" :
										"bg-gray-100 text-gray-600 border border-gray-200"
									}`}
								>
									{nt.effect === "increase" ? "↑ " : nt.effect === "decrease" ? "↓ " : "∼ "}
									{nt.name}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</>
	);
}

function DetailPanel({ item, section, onClose }: DetailPanelProps) {
	const isOpen = item !== null;

	return (
		<>
			{/* ── Desktop: animated side column ───────────────────────── */}
			<div
				className={`hidden md:flex shrink-0 border-r border-gray-200/60 bg-white flex-col transition-all duration-300 overflow-hidden ${
					isOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-r-0"
				}`}
			>
				<DetailContent item={item} section={section} onClose={onClose} />
			</div>
		</>
	);
}

export { DetailContent };
export default DetailPanel;
