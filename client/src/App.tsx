import { useState } from "react";
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
	const [isMobileExpanded, setIsMobileExpanded] = useState(true);
	const { highlightedArea, setBrainHighlight } = useBrainHighlight();

	const handleSelectItem = (item: string, section: string) => {
		setSelectedItem(item);
		setSelectedSection(section);
		setIsMobileExpanded(true);
	};

	const handleCloseDetail = () => {
		setSelectedItem(null);
		setSelectedSection(null);
		setIsMobileExpanded(true);
	};

	const handleNavSelect = (id: string) => {
		if (activeNav === id) {
			setIsMobileExpanded(true);
			return;
		}
		setActiveNav(id);
		setSelectedItem(null);
		setSelectedSection(null);
		setIsMobileExpanded(true);
	};

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<div className="hidden [@media(max-height:500px)_and_(orientation:landscape)]:flex fixed inset-0 z-50 bg-gray-50 items-center justify-center flex-col p-8 text-center">
				<h2 className="text-xl font-bold text-gray-800 mb-2">Rotate your device</h2>
				<p className="text-sm text-gray-500 max-w-xs">
					NeuroAtlas is optimized for portrait mode. Please rotate your phone back to continue.
				</p>
			</div>

			<Navbar />
			<div className="flex flex-1 min-h-0 flex-col md:flex-row pb-16 md:pb-0">
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
				/>

				{/* Brain canvas — flex-1 takes remaining space (top half on mobile) */}
				<div className="flex-1 flex items-center justify-center bg-gray-100/60 min-h-[30vh] relative">
					<div className="absolute top-4 right-4 z-10">
						<select
							value={highlightedArea || ""}
							onChange={(e) => setBrainHighlight(e.target.value || null)}
							className="px-2 md:px-3 py-1.5 md:py-2 rounded-md md:rounded-lg border border-gray-200/60 bg-white/80 backdrop-blur-md text-xs md:text-sm text-gray-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00aaff]/50 transition-all cursor-pointer max-w-[150px] md:max-w-none"
						>
							<option value="">Select brain area...</option>
							{Object.entries(groupedAreas).sort().map(([region, areas]) => (
								<optgroup key={region} label={region} className="font-bold text-gray-900">
									{areas.map((area) => (
										<option key={area} value={area} className="font-normal text-gray-700">
											{area}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</div>
					<BrainModel />
				</div>

				{/* Mobile only active panel (bottom half) */}
				<div className={`md:hidden flex flex-col bg-white border-t border-gray-200/60 z-20 shadow-[0_-8px_32px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out ${isMobileExpanded ? "h-[45vh]" : (selectedItem ? "h-[52px]" : "h-9")
					}`}>
					{/* Drag handle + toggle button */}
					<button
						onClick={() => setIsMobileExpanded(prev => !prev)}
						className="flex flex-col items-center justify-start pt-2 shrink-0 w-full cursor-pointer relative"
						aria-label={isMobileExpanded ? "Collapse panel" : "Expand panel"}
						style={{ height: isMobileExpanded ? '36px' : (selectedItem ? '52px' : '36px') }}
					>
						<div className="w-9 h-1 rounded-full bg-gray-200 mb-1 shrink-0" />

						{/* Info shown only when collapsed and an item is selected */}
						{!isMobileExpanded && selectedItem && (
							<div className="flex flex-col items-center px-8 w-full transition-opacity duration-300 opacity-100">
								<span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 leading-tight truncate w-full text-center">
									{selectedSection}
								</span>
								<span className="text-[13px] font-bold text-gray-800 truncate w-full text-center leading-tight">
									{selectedItem}
								</span>
							</div>
						)}

						<ChevronDownIcon
							className={`w-4 h-4 text-gray-300 absolute right-4 top-2.5 transition-transform duration-300 ${isMobileExpanded ? "" : "rotate-180"
								}`}
						/>
					</button>

					<div className={`flex-1 overflow-hidden flex flex-col transition-opacity duration-200 ${isMobileExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
						}`}>
						{selectedItem ? (
							<DetailContent item={selectedItem} section={selectedSection} onClose={handleCloseDetail} />
						) : activeNav ? (
							<SidebarContent onSelectItem={handleSelectItem} selectedItem={selectedItem} activeNav={activeNav} />
						) : null}
					</div>
				</div>
			</div>
			{/* Footer hidden on mobile — no space for it */}
			<div className="hidden md:block">
				<Footer />
			</div>
		</div>
	);
}

export default App;