import { useState } from "react";

interface SidebarSection {
	title: string;
	items: string[];
}

const sections: SidebarSection[] = [
	{
		title: "Substancje psychoaktywne",
		items: ["Alkohol", "Kofeina", "Nicotyna"],
	},
	{
		title: "Emocje",
		items: ["Radość", "Strach", "Smutek"],
	},
	{
		title: "Choroby",
		items: ["Alzheimer", "Parkinson", "Depresja"],
	},
];

interface SidebarProps {
	onSelectItem: (item: string, section: string) => void;
}

function Sidebar({ onSelectItem }: SidebarProps) {
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		[sections[0].title]: true,
	});

	const toggleSection = (title: string) => {
		setOpenSections(prev => ({
			...prev,
			[title]: !prev[title],
		}));
	};

	return (
		<aside className="w-64 shrink-0 border-r border-gray-200/60 bg-white/80 backdrop-blur-sm flex flex-col">
			<nav className="flex-1 overflow-y-auto py-2">
				{sections.map(section => {
					const isOpen = openSections[section.title] ?? false;

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
												className="w-full text-left px-4 pl-8 py-1.5 text-sm text-gray-500 hover:text-[#00aaff] hover:bg-[#00aaff]/5 transition-colors duration-200 cursor-pointer rounded-r-lg">
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
