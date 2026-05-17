import { AtlasSidebar } from "@/features/atlas/components/AtlasSidebar";
import { MyBrainSidebar } from "@/features/my-brain/components/MyBrainSidebar";
import { ResearchSidebar } from "@/features/research/components/ResearchSidebar";

interface SidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
	activeNav: string | null;
}

function SidebarContent({ onSelectItem, selectedItem, activeNav }: SidebarProps) {
	if (activeNav === "my-brain") return <MyBrainSidebar />;
	if (activeNav === "research") return <ResearchSidebar />;
	return <AtlasSidebar onSelectItem={onSelectItem} selectedItem={selectedItem} />;
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
