import { useState } from "react";
import settingIcon from "@/assets/setting.svg";

function Header() {
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<header className="shrink-0 flex items-center justify-between px-4 md:px-5 py-2.5 md:py-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm relative z-50">
			<h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-800">
				Neuro<span className="text-[#00aaff]">Atlas</span>
			</h1>
			
			<div className="relative">
				<button
					onClick={() => setSettingsOpen(prev => !prev)}
					className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
					aria-label="Settings"
				>
					<img src={settingIcon} alt="Settings" className="w-4 h-4 md:w-5 md:h-5" />
				</button>

				{/* Settings Popover */}
				<div
					className={`absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 p-4 text-[11px] text-gray-500 leading-relaxed transition-all duration-200 origin-top-right ${
						settingsOpen
							? "opacity-100 scale-100 pointer-events-auto"
							: "opacity-0 scale-95 pointer-events-none"
					}`}>
					<p className="font-medium text-gray-700 mb-1.5 text-xs">
						Settings & Info
					</p>
					
					<div className="mt-3 pt-3 border-t border-gray-100">
						<p className="font-medium text-gray-700 mb-1.5 text-xs">
							3D Model Source
						</p>
						Kristen Browne; Heidi Schlehlein. 2023. 3D Reference Organ for
						Brain, Male v1.3.{" "}
						<a
							href="https://doi.org/10.48539/HBM929.XKCL.339"
							target="_blank"
							rel="noopener noreferrer"
							className="text-[#00aaff] hover:text-[#0088dd] underline underline-offset-2 transition-colors">
							doi.org/10.48539/HBM929.XKCL.339
						</a>
						. Accessed on December 15, 2023.
					</div>
				</div>
			</div>
		</header>
	);
}

export default Header;
