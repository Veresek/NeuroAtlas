import { useState } from "react";
import BrainModel from "./features/brain-model/components/BrainModel";
import DetailPanel from "./components/shared/DetailPanel";
import Footer from "./components/shared/Footer";
import Navbar from "./components/shared/Navbar";
import Sidebar from "./components/shared/Sidebar";

function App() {
	const [selectedItem, setSelectedItem] = useState<string | null>(null);
	const [selectedSection, setSelectedSection] = useState<string | null>(null);

	const handleSelectItem = (item: string, section: string) => {
		setSelectedItem(item);
		setSelectedSection(section);
	};

	const handleCloseDetail = () => {
		setSelectedItem(null);
		setSelectedSection(null);
	};

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<Navbar />
			<div className="flex flex-1 min-h-0">
				<Sidebar onSelectItem={handleSelectItem} />
				<DetailPanel
					item={selectedItem}
					section={selectedSection}
					onClose={handleCloseDetail}
				/>
				<div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 px-4">
					<BrainModel />
				</div>
			</div>
			<Footer />
		</div>
	);
}

export default App;
