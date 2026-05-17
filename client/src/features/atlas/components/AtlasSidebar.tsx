import { useState } from "react";
import AtlasIcon from "@/assets/atlas.svg?react";
import SearchIcon from "@/assets/search.svg?react";
import ChevronDownIcon from "@/assets/chevron-down.svg?react";
import atlasSections from "@/data/atlas.json";

interface AtlasSidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
}

export function AtlasSidebar({ onSelectItem, selectedItem }: AtlasSidebarProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		[atlasSections[0].title]: true,
	});

	const filteredSections = searchQuery
		? atlasSections
			.map(section => ({
				...section,
				items: section.items.filter(
					item =>
						item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						section.title.toLowerCase().includes(searchQuery.toLowerCase()),
				),
			}))
			.filter(section => section.items.length > 0)
		: atlasSections;

	const toggleSection = (title: string) => {
		setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
	};

	return (
		<div className="flex-1 overflow-y-auto flex flex-col">
			{/* Header */}
			<div className="hidden md:block px-4 pt-5 pb-4 border-b border-gray-200/60">
				<div className="flex items-center gap-3">
					<div
						style={{
							width: 36, height: 36, borderRadius: 10,
							background: "linear-gradient(135deg, rgba(0,170,255,0.15), rgba(0,170,255,0.08))",
							display: "flex", alignItems: "center", justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<AtlasIcon className="w-[18px] h-[18px] text-[#00aaff]" />
					</div>
					<div>
						<p className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Atlas</p>
						<p className="text-[11px] text-gray-400">Explore and learn about brain</p>
					</div>
				</div>
			</div>

			{/* Search */}
			<div className="px-3 pt-3 pb-1">
				<div className="relative">
					<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
					<input
						type="text"
						placeholder="Search..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200/60 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:border-[#00aaff]/50 focus:bg-white transition-colors duration-200"
					/>
				</div>
			</div>

			{/* Sections */}
			<nav className="flex-1 overflow-y-auto py-2">
				{filteredSections.map(section => {
					const isOpen = searchQuery ? true : (openSections[section.title] ?? false);
					return (
						<div key={section.title} className="mb-1">
							<button
								onClick={() => toggleSection(section.title)}
								className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#00aaff]/5 transition-colors duration-200 cursor-pointer"
							>
								<span>{section.title}</span>
								<ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
							</button>
							<div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}>
								<ul className="pb-2">
									{section.items.map(item => (
										<li key={item.id}>
											<button
												onClick={() => onSelectItem(item.name, section.title)}
												className={`w-full text-left px-4 pl-8 py-1.5 text-sm transition-colors duration-200 cursor-pointer rounded-r-lg ${selectedItem === item.name
													? "text-[#00aaff] bg-[#00aaff]/10 font-medium"
													: "text-gray-500 hover:text-[#00aaff] hover:bg-[#00aaff]/5"
													}`}
											>
												{item.name}
											</button>
										</li>
									))}
								</ul>
							</div>
						</div>
					);
				})}
			</nav>
		</div>
	);
}
