import { useState } from "react";
import BrainModel from "./features/brain-model/components/BrainModel";
import DetailPanel from "./components/shared/DetailPanel";
import Footer from "./components/shared/Footer";
import Navbar from "./components/shared/Navbar";
import NavSidebar from "./components/shared/NavSidebar";
import Sidebar from "./components/shared/Sidebar";

function App() {
	const [selectedItem, setSelectedItem] = useState<string | null>(null);
	const [selectedSection, setSelectedSection] = useState<string | null>(null);
	const [activeNav, setActiveNav] = useState<string>("atlas");

	const handleSelectItem = (item: string, section: string) => {
		setSelectedItem(item);
		setSelectedSection(section);
	};

	const handleCloseDetail = () => {
		setSelectedItem(null);
		setSelectedSection(null);
	};

	const handleNavSelect = (id: string) => {
		if (activeNav === id) return;
		setActiveNav(id);
		// Zamknij otwartą kartę atlasu przy zmianie trybu
		setSelectedItem(null);
		setSelectedSection(null);
	};

	return (
		<div className="flex flex-col h-screen overflow-hidden">
			<Navbar />
			<div className="flex flex-1 min-h-0">
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
				<div className="flex-1 flex items-center justify-center bg-gray-100/60">
					<BrainModel />
				</div>
			</div>
			<Footer />
		</div>
	);
}

export default App;