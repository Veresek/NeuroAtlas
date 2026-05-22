import { AtlasDetail } from "@/features/atlas/components/AtlasDetail";
import { ResearchDetail } from "@/features/research/components/ResearchDetail";
import { MyBrainDetail } from "@/features/my-brain/components/MyBrainDetail";

interface DetailPanelProps {
	item: string | null;
	section: string | null;
	onClose: () => void;
	onSelectItem: (item: string, section: string) => void;
}

function DetailContent({ item, section, onClose, onSelectItem }: DetailPanelProps) {
	if (!item || !section) return null;

	if (section === "Research") {
		return (
			<ResearchDetail
				item={item}
				section={section}
				onClose={onClose}
			/>
		);
	}

	if (section === "MyBrain" || section === "my-brain" || section === "My Brain") {
		return (
			<MyBrainDetail
				item={item}
				onClose={onClose}
			/>
		);
	}

	return (
		<AtlasDetail
			item={item}
			section={section}
			onClose={onClose}
			onSelectItem={onSelectItem}
		/>
	);
}

function DetailPanel({ item, section, onClose, onSelectItem }: DetailPanelProps) {
	const isOpen = item !== null;

	return (
		<>
			{/* ── Desktop: animated side column ───────────────────────── */}
			<div
				className={`hidden md:flex shrink-0 border-r border-gray-200/60 bg-white flex-col transition-all duration-300 overflow-hidden ${isOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-r-0"
					}`}
			>
				<DetailContent item={item} section={section} onClose={onClose} onSelectItem={onSelectItem} />
			</div>
		</>
	);
}

export { DetailContent };
export default DetailPanel;
