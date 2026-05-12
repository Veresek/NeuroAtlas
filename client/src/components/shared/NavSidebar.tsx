interface NavSidebarProps {
	activeNav: string | null;
	onNavSelect: (item: string) => void;
}

const navItems = [
	{
		id: "atlas",
		label: "Atlas",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<circle cx="12" cy="12" r="10" />
				<path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2z" />
				<path d="M2 12h20" />
			</svg>
		),
	},
	{
		id: "simulation",
		label: "Simulation",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<polygon points="5 3 19 12 5 21 5 3" />
			</svg>
		),
	},
	{
		id: "my-brain",
		label: "My Brain",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
				<path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
			</svg>
		),
	},
	{
		id: "research",
		label: "Research",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
			</svg>
		),
	},
];

function NavSidebar({ activeNav, onNavSelect }: NavSidebarProps) {
	return (
		<aside className="w-[72px] shrink-0 border-r border-gray-200/60 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 py-4">
			<div className="flex flex-col items-center gap-1 w-full px-2">
				{navItems.map(item => {
					const isActive = activeNav === item.id;
					return (
						<button
							key={item.id}
							id={`nav-sidebar-${item.id}`}
							onClick={() => onNavSelect(item.id)}
							title={item.label}
							className="group relative flex flex-col items-center gap-1 w-full py-3 px-1 rounded-xl transition-all duration-200 cursor-pointer"
							style={{
								background: isActive
									? "linear-gradient(135deg, rgba(0,170,255,0.15), rgba(0,170,255,0.05))"
									: "transparent",
								color: isActive ? "#00aaff" : "#6b7280",
							}}
							onMouseEnter={e => {
								if (!isActive) {
									(e.currentTarget as HTMLButtonElement).style.background = "rgba(0,170,255,0.07)";
									(e.currentTarget as HTMLButtonElement).style.color = "#00aaff";
								}
							}}
							onMouseLeave={e => {
								if (!isActive) {
									(e.currentTarget as HTMLButtonElement).style.background = "transparent";
									(e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
								}
							}}
						>
							{/* Active indicator */}
							{isActive && (
								<span
									className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full"
									style={{ background: "#00aaff" }}
								/>
							)}

							<span className="w-5 h-5 flex items-center justify-center" style={{ color: "inherit" }}>
								{item.icon}
							</span>
							<span
								className="text-[9px] font-semibold tracking-wide leading-none text-center"
								style={{ color: "inherit", whiteSpace: "nowrap" }}
							>
								{item.label}
							</span>
						</button>
					);
				})}
			</div>
		</aside>
	);
}

export default NavSidebar;
