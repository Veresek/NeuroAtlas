import settingIcon from "@/assets/setting.svg";

function Navbar() {
	return (
		<nav className="shrink-0 flex items-center justify-between px-4 md:px-5 py-2.5 md:py-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
			<h1 className="text-lg md:text-xl font-bold tracking-tight text-gray-800">
				Neuro<span className="text-[#00aaff]">Atlas</span>
			</h1>
			<button
				className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
				aria-label="Settings"
			>
				<img src={settingIcon} alt="Settings" className="w-4 h-4 md:w-5 md:h-5" />
			</button>
		</nav>
	);
}

export default Navbar;
