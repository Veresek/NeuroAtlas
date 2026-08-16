import { useState, Fragment, type CSSProperties } from "react";
import BrainModel from "./features/brain-model/components/BrainModel";
import Footer from "./components/shared/Footer";
import Navbar from "./components/shared/Header";
import NavSidebar from "./components/shared/NavSidebar";
import Sidebar, { SidebarContent } from "./components/shared/Sidebar";
import DetailPanel, { DetailContent } from "./components/shared/DetailPanel";
import ChevronDownIcon from "@/assets/chevron-down.svg?react";
import { meshMapping } from "@/data/meshMapping";
import { brainSections } from "@/data/brainSections";
import { useBrainHighlight } from "@/hooks/useBrainHighlight";
import { useMobilePanelSnap } from "@/hooks/useMobilePanelSnap";
import { useActiveNeurotransmitter } from "@/hooks/useActiveNeurotransmitter";

const groupedAreas: Record<string, string[]> = {};
for (const [section, ids] of Object.entries(brainSections)) {
	const displayNames = new Set<string>();
	for (const id of ids) {
		if (meshMapping[id]) {
			displayNames.add(meshMapping[id].displayName);
		}
	}
	if (displayNames.size > 0) {
		groupedAreas[section] = Array.from(displayNames).sort();
	}
}

function App() {
	const [selectedItem, setSelectedItem] = useState<string | null>(null);
	const [selectedSection, setSelectedSection] = useState<string | null>(null);
	const [activeNav, setActiveNav] = useState<string>("atlas");
	const { highlightedArea, setBrainHighlight } = useBrainHighlight();
	const { activeNt, clearActiveNeurotransmitter } = useActiveNeurotransmitter();
	const {
		snap: mobileSnap,
		layoutRef: mobileLayoutRef,
		panelHeight: mobilePanelHeight,
		brainHeight: mobileBrainHeight,
		isContentVisible: mobileContentVisible,
		handleHeight: mobileHandleHeight,
		openToMedium: openMobileToMedium,
		onHandlePointerDown,
		onHandlePointerUp,
		onHandlePointerCancel,
	} = useMobilePanelSnap(selectedItem);

	const handleSelectItem = (item: string, section: string) => {
		setSelectedItem(item);
		setSelectedSection(section);
		if (section === "Research") {
			setActiveNav("research");
		}
		openMobileToMedium();
	};

	const handleCloseDetail = () => {
		setSelectedItem(null);
		setSelectedSection(null);
		openMobileToMedium();
	};

	const handleNavSelect = (id: string) => {
		if (activeNav === id) {
			openMobileToMedium();
			return;
		}
		setActiveNav(id);
		setSelectedItem(null);
		setSelectedSection(null);
		openMobileToMedium();
	};

	return (
		<div className="flex flex-col h-dvh max-h-dvh overflow-hidden max-md:fixed max-md:inset-0 max-md:w-full">
			<div className="hidden [@media(max-height:500px)_and_(orientation:landscape)]:flex fixed inset-0 z-50 bg-gray-50 items-center justify-center flex-col p-8 text-center">
				<h2 className="text-xl font-bold text-gray-800 mb-2">
					Rotate your device
				</h2>
				<p className="text-[15px] text-gray-600 max-w-xs">
					NeuroAtlas is optimized for portrait mode. Please rotate your phone
					back to continue.
				</p>
			</div>

			<Navbar />
			<div className="flex flex-1 min-h-0 flex-col md:flex-row pb-16 md:pb-0 overflow-hidden">
				<NavSidebar activeNav={activeNav} onNavSelect={handleNavSelect} />
				<Sidebar
					onSelectItem={handleSelectItem}
					selectedItem={selectedItem}
					activeNav={activeNav}
				/>
				<DetailPanel
					item={selectedItem}
					section={selectedSection}
					onClose={handleCloseDetail}
					onSelectItem={handleSelectItem}
				/>

				{/* Mobile: jeden layout — animowane wysokości modelu i panelu (px via CSS vars) */}
				<div
					ref={mobileLayoutRef}
					className="mobile-snap-layout relative flex flex-1 min-h-0 flex-col md:contents overflow-hidden"
					style={
						{
							"--brain-h": `${mobileBrainHeight}px`,
							"--panel-h": `${mobilePanelHeight}px`,
						} as CSSProperties
					}>
					<div className="flex-1 min-h-0 flex items-center justify-center bg-gray-100/60 relative overflow-hidden md:min-h-[30vh] max-md:absolute max-md:top-0 max-md:left-0 max-md:right-0 max-md:h-(--brain-h)">
						<div className="absolute top-4 right-4 z-10 flex flex-col items-end pointer-events-none max-w-[calc(100%-2rem)]">
							<select
								value={
									typeof highlightedArea === "string" ? highlightedArea : ""
								}
								onChange={e => setBrainHighlight(e.target.value || null)}
								className="pointer-events-auto px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg border border-gray-200/60 bg-white/80 backdrop-blur-md text-xs md:text-sm text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00aaff]/50 transition-all cursor-pointer max-w-37.5 md:max-w-none">
								<option value="">Select brain area...</option>
								{Object.entries(groupedAreas)
									.sort()
									.map(([region, areas]) => (
										<Fragment key={region}>
											<option
												value={region}
												className="font-bold text-gray-900 bg-gray-50">
												{region}
											</option>
											{areas.map(area => (
												<option
													key={area}
													value={area}
													className="font-normal text-gray-700">
													&nbsp;&nbsp;&nbsp;&nbsp;{area}
												</option>
											))}
										</Fragment>
									))}
							</select>

							{/* Floating contextual mechanism card in light theme */}
							{activeNt && (activeNt.mechanism || activeNt.description) && (
								<div className="pointer-events-auto mt-2.5 w-72 md:w-80 p-3.5 bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-xl shadow-gray-900/5 transition-all animate-in fade-in slide-in-from-top-2 duration-200 text-left">
									<div className="flex items-center justify-between gap-2 mb-1.5">
										<div className="flex items-center gap-1.5 min-w-0">
											<span className="font-semibold text-gray-900 text-xs md:text-sm truncate">
												{activeNt.name}
											</span>
											{activeNt.phaseName && (
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium shrink-0">
													{activeNt.phaseName}
												</span>
											)}
										</div>
										<button
											type="button"
											onClick={() => clearActiveNeurotransmitter()}
											className="text-gray-400 hover:text-gray-600 p-0.5 rounded hover:bg-gray-100 transition-colors text-xs cursor-pointer"
											aria-label="Close">
											✕
										</button>
									</div>
									<p className="text-xs text-gray-600 leading-relaxed font-normal">
										{activeNt.mechanism || activeNt.description}
									</p>
									{activeNt.substanceName && (
										<div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
											<span>Mechanism</span>
											<span className="text-[#00aaff] font-medium truncate max-w-40">
												{activeNt.substanceName}
											</span>
										</div>
									)}
								</div>
							)}
						</div>
						<BrainModel />
					</div>

					<div className="md:hidden absolute inset-x-0 bottom-0 z-30 flex flex-col min-h-0 bg-white border-t border-gray-200/60 overflow-hidden h-(--panel-h) shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
						<button
							type="button"
							onPointerDown={onHandlePointerDown}
							onPointerUp={onHandlePointerUp}
							onPointerCancel={onHandlePointerCancel}
							className="flex flex-col items-center justify-start pt-2 shrink-0 w-full cursor-grab active:cursor-grabbing relative touch-none select-none"
							aria-label={mobileSnap === 0 ? "Expand panel" : "Collapse panel"}
							style={{ height: mobileHandleHeight }}>
							<div className="w-9 h-1 rounded-full bg-gray-200 mb-1 shrink-0" />

							{mobileSnap === 0 && selectedItem && (
								<div className="flex flex-col items-center px-8 w-full transition-opacity duration-300 opacity-100">
									<span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 leading-tight truncate w-full text-center">
										{selectedSection}
									</span>
									<span className="text-[13px] font-bold text-gray-800 truncate w-full text-center leading-tight">
										{selectedItem}
									</span>
								</div>
							)}

							<ChevronDownIcon
								className={`w-4 h-4 text-gray-300 absolute right-4 top-2.5 transition-transform duration-300 ${
									mobileSnap === 0 ? "rotate-180" : ""
								}`}
							/>
						</button>

						<div
							className={`relative flex-1 overflow-hidden flex flex-col transition-opacity duration-200 ${
								mobileContentVisible
									? "opacity-100"
									: "opacity-0 pointer-events-none"
							}`}>
							{activeNav ? (
								<div
									className={`flex-1 min-h-0 flex flex-col overflow-hidden ${selectedItem ? "invisible absolute inset-0 pointer-events-none" : ""}`}
									aria-hidden={!!selectedItem}>
									<SidebarContent
										onSelectItem={handleSelectItem}
										selectedItem={selectedItem}
										activeNav={activeNav}
									/>
								</div>
							) : null}
							{selectedItem ? (
								<DetailContent
									item={selectedItem}
									section={selectedSection}
									onClose={handleCloseDetail}
									onSelectItem={handleSelectItem}
								/>
							) : null}
						</div>
					</div>
				</div>
			</div>
			<div className="hidden md:block">
				<Footer />
			</div>
		</div>
	);
}

export default App;
