import { SubstancesSidebar } from "@/features/substances/components/SubstancesSidebar";
import { SimulationSidebar } from "@/features/simulation/components/SimulationSidebar";
import { DailyQuiz } from "@/features/digital-twin/components/DailyQuiz";
import { ResearchSidebar } from "@/features/research/components/ResearchSidebar";

interface SidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
	activeNav: string | null;
}

function SidebarContent({ onSelectItem, selectedItem, activeNav }: SidebarProps) {
	if (activeNav === "simulation") return <SimulationSidebar />;
	if (activeNav === "my-brain") return <DailyQuiz />;
	if (activeNav === "research") return <ResearchSidebar />;
	return <SubstancesSidebar onSelectItem={onSelectItem} selectedItem={selectedItem} />;
}

// Desktop only — hidden on mobile (mobile panel lives in App.tsx)
function Sidebar(props: SidebarProps) {
	return (
		<aside className="hidden md:flex w-72 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex-col">
			<SidebarContent {...props} />
		</aside>
	);
}

export { SidebarContent };
export default Sidebar;
