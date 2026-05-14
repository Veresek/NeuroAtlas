import AtlasIcon from "@/assets/atlas.svg?react";
import MyBrainIcon from "@/assets/my-brain.svg?react";
import ResearchIcon from "@/assets/research.svg?react";

interface NavSidebarProps {
	activeNav: string | null;
	onNavSelect: (item: string) => void;
}

const navItems = [
	{ id: "atlas", label: "Atlas", icon: <AtlasIcon /> },
	{ id: "my-brain", label: "My Brain", icon: <MyBrainIcon /> },
	{ id: "research", label: "Research", icon: <ResearchIcon /> },
];

function NavSidebar({ activeNav, onNavSelect }: NavSidebarProps) {
	return (
		<>
			{/* ── Desktop: left vertical sidebar ─────────────────────── */}
			<aside className="hidden md:flex w-[72px] shrink-0 border-r border-gray-200/60 bg-white/90 backdrop-blur-sm flex-col items-center justify-center gap-2 py-4">
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

			{/* ── Mobile: fixed bottom tab bar ────────────────────────── */}
			<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-white/95 backdrop-blur-md border-t border-gray-200/60 h-16 px-2 safe-area-pb">
				{navItems.map(item => {
					const isActive = activeNav === item.id;
					return (
						<button
							key={item.id}
							id={`nav-bottom-${item.id}`}
							onClick={() => onNavSelect(item.id)}
							className="relative flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all duration-200 cursor-pointer"
							style={{ color: isActive ? "#00aaff" : "#9ca3af" }}
						>
							{/* Active dot indicator */}
							{isActive && (
								<span
									className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
									style={{ background: "#00aaff" }}
								/>
							)}
							<span className="w-5 h-5 flex items-center justify-center" style={{ color: "inherit" }}>
								{item.icon}
							</span>
							<span
								className="text-[9px] font-semibold tracking-wide leading-none"
								style={{ color: "inherit" }}
							>
								{item.label}
							</span>
						</button>
					);
				})}
			</nav>
		</>
	);
}

export default NavSidebar;
