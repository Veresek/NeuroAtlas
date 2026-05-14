import { useState } from "react";
import ResearchIcon from "@/assets/research.svg?react";
import SearchIcon from "@/assets/search.svg?react";

export function ResearchSidebar() {
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<div className="flex-1 overflow-y-auto">
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
						<ResearchIcon className="w-[18px] h-[18px] text-[#00aaff]" />
					</div>
					<div>
						<p className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Research</p>
						<p className="text-[11px] text-gray-400">Explore research papers and data</p>
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

			{/* Coming soon */}
			<div className="p-4 flex flex-col items-center justify-center mt-12 text-center">
				<div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
					<span style={{ fontSize: 28 }}>🔬</span>
				</div>
				<p className="text-sm font-semibold text-gray-700">Coming soon</p>
				<p className="text-xs text-gray-400 mt-1 max-w-[200px]">We're building a library of neuroscience research papers and datasets.</p>
			</div>
		</div>
	);
}
