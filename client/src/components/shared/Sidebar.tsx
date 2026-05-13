import { SubstancesSidebar } from "@/features/substances/components/SubstancesSidebar";
import { SimulationSidebar } from "@/features/simulation/components/SimulationSidebar";
import { DailyQuiz } from "@/features/digital-twin/components/DailyQuiz";
import { ResearchSidebar } from "@/features/research/components/ResearchSidebar";

interface SidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
	activeNav: string | null;
}

function Sidebar({ onSelectItem, selectedItem, activeNav }: SidebarProps) {
	return (
		<aside className="w-72 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex flex-col">
			{activeNav === "simulation" && <SimulationSidebar />}
			{activeNav === "my-brain" && <DailyQuiz />}
			{activeNav === "research" && <ResearchSidebar />}
			{(activeNav === "atlas" || !activeNav) && (
				<SubstancesSidebar onSelectItem={onSelectItem} selectedItem={selectedItem} />
			)}
		</aside>
	);
}

export default Sidebar;
