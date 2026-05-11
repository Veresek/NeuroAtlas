import { useState } from "react";

interface SidebarSection {
	title: string;
	items: string[];
}

const sections: SidebarSection[] = [
	{
		title: "Psychoactive Substances",
		items: ["Alcohol", "Caffeine", "Nicotine"],
	},
	{
		title: "Emotions",
		items: ["Joy", "Fear", "Sadness"],
	},
	{
		title: "Diseases",
		items: ["Alzheimer's", "Parkinson's", "Depression"],
	},
];

interface SidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
}

function Sidebar({ onSelectItem, selectedItem }: SidebarProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		[sections[0].title]: true,
	});

	const filteredSections = searchQuery
		? sections
				.map(section => ({
					...section,
					items: section.items.filter(
						item =>
							item.toLowerCase().includes(searchQuery.toLowerCase()) ||
							section.title.toLowerCase().includes(searchQuery.toLowerCase()),
					),
				}))
				.filter(section => section.items.length > 0)
		: sections;

	const toggleSection = (title: string) => {
		setOpenSections(prev => ({
			...prev,
			[title]: !prev[title],
		}));
	};

	return (
		<aside className="w-64 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex flex-col">
			<div className="px-3 pt-3 pb-1">
				<div className="relative">
					<svg
						className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<input
						type="text"
						placeholder="Search..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200/60 bg-gray-50/50 placeholder:text-gray-400 focus:outline-none focus:border-[#00aaff]/50 focus:bg-white transition-colors duration-200"
					/>
				</div>
			</div>
			<nav className="flex-1 overflow-y-auto py-2">
				{filteredSections.map(section => {
					const isOpen = searchQuery
						? true
						: (openSections[section.title] ?? false);

					return (
						<div key={section.title} className="mb-1">
							<button
								onClick={() => toggleSection(section.title)}
								className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#00aaff]/5 transition-colors duration-200 cursor-pointer">
								<span>{section.title}</span>
								<svg
									className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
										isOpen ? "rotate-180" : ""
									}`}
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							<div
								className={`overflow-hidden transition-all duration-200 ${
									isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
								}`}>
								<ul className="pb-2">
									{section.items.map(item => (
										<li key={item}>
											<button
												onClick={() => onSelectItem(item, section.title)}
												className={`w-full text-left px-4 pl-8 py-1.5 text-sm transition-colors duration-200 cursor-pointer rounded-r-lg ${
													selectedItem === item
														? "text-[#00aaff] bg-[#00aaff]/10 font-medium"
														: "text-gray-500 hover:text-[#00aaff] hover:bg-[#00aaff]/5"
												}`}>
												{item}
											</button>
										</li>
									))}
								</ul>
							</div>
						</div>
					);
				})}
			</nav>
		</aside>
	);
}

export default Sidebar;
