import { useState } from "react";
import AtlasIcon from "@/assets/atlas.svg?react";
import SimulationIcon from "@/assets/simulation.svg?react";
import MyBrainIcon from "@/assets/my-brain.svg?react";
import ResearchIcon from "@/assets/research.svg?react";
import SearchIcon from "@/assets/search.svg?react";
import ChevronDownIcon from "@/assets/chevron-down.svg?react";
import { Button } from "../ui/Button";

/* ─── Atlas sections ─────────────────────────────────────────────────── */

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

/* ─── Habits ─────────────────────────────────────────────────────────── */

const simulationSections = [
	{
		title: "Substances",
		items: [
			"Alcohol",
			"Caffeine",
			"Nicotine",
		],
	},
	{
		title: "Lifestyle",
		items: [
			"Meditation",
			"Sleep Deprivation",
			"Cognitive Overload",
			"Physical Activity",
		],
	},
];

function SimulationsContent() {
	const [searchQuery, setSearchQuery] = useState("");
	const [openSections, setOpenSections] = useState<Record<string, boolean>>({
		[simulationSections[0].title]: true,
	});
	const [selectedHabit, setSelectedHabit] = useState<string | null>(null);

	const filteredSections = searchQuery
		? simulationSections
			.map(section => ({
				...section,
				items: section.items.filter(
					item =>
						item.toLowerCase().includes(searchQuery.toLowerCase()) ||
						section.title.toLowerCase().includes(searchQuery.toLowerCase()),
				),
			}))
			.filter(section => section.items.length > 0)
		: simulationSections;

	const toggleSection = (title: string) => {
		setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
	};

	return (
		<div className="flex-1 overflow-y-auto flex flex-col">
			{/* Header */}
			<div className="px-4 pt-5 pb-4 border-b border-gray-200/60">
				<div className="flex items-center gap-3">
					<div
						style={{
							width: 36, height: 36, borderRadius: 10,
							background: "linear-gradient(135deg, rgba(0,170,255,0.15), rgba(0,170,255,0.08))",
							display: "flex", alignItems: "center", justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<SimulationIcon className="w-[18px] h-[18px] text-[#00aaff]" />
					</div>
					<div>
						<p className="text-[13px] text-gray-800" style={{ fontWeight: 700 }}>Simulation</p>
						<p className="text-[11px] text-gray-400">Simulate the impact of various factors</p>
					</div>
				</div>
			</div>

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
					const isOpen = searchQuery
						? true
						: (openSections[section.title] ?? false);

					return (
						<div key={section.title} className="mb-1">
							<button
								onClick={() => toggleSection(section.title)}
								className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#00aaff]/5 transition-colors duration-200 cursor-pointer"
							>
								<span>{section.title}</span>
								<ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
							</button>

							<div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
								<ul className="pb-2">
									{section.items.map(item => (
										<li key={item}>
											<button
												onClick={() => setSelectedHabit(prev => prev === item ? null : item)}
												className={`w-full text-left px-4 pl-8 py-1.5 text-sm transition-colors duration-200 cursor-pointer rounded-r-lg ${selectedHabit === item
													? "text-[#00aaff] bg-[#00aaff]/10 font-medium"
													: "text-gray-500 hover:text-[#00aaff] hover:bg-[#00aaff]/5"
													}`}
											>
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
		</div>
	);
}

/* ─── My Brain sliders ───────────────────────────────────────────────── */

const moodLabels = ["Awful", "Bad", "Neutral", "Good", "Great"];
const moodColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#00aaff"];

function MyBrainContent() {
	const [sleep, setSleep] = useState(7);
	const [coffee, setCoffee] = useState(2);
	const [mood, setMood] = useState(2);
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = () => {
		setIsGenerating(true);
		// Simulation/Generation logic will go here
	};

	const sliderTrack = (value: number, max: number, color: string) => ({
		background: `linear-gradient(to right, ${color} ${(value / max) * 100}%, #e5e7eb ${(value / max) * 100}%)`,
	});

	return (
		<div className="flex-1 overflow-y-auto">
			{/* Header */}
			<div className="px-4 pt-5 pb-4 border-b border-gray-200/60">
				<div className="flex items-center gap-3">
					<div
						style={{
							width: 36, height: 36, borderRadius: 10,
							background: "linear-gradient(135deg, rgba(0,170,255,0.15), rgba(0,170,255,0.08))",
							display: "flex", alignItems: "center", justifyContent: "center",
							flexShrink: 0,
						}}
					>
						<MyBrainIcon className="w-[18px] h-[18px] text-[#00aaff]" />
					</div>
					<div>
						<p className="text-[13px] font-700 text-gray-800" style={{ fontWeight: 700 }}>My Brain</p>
						<p className="text-[11px] text-gray-400">How your lifestyle affects your brain?</p>
					</div>
				</div>
			</div>

			{/* Sliders */}
			<div className="px-4 py-5 flex flex-col gap-7">

				{/* Sleep */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-gray-700">How many hours did you sleep?</span>
						</div>
						<span
							className="text-[12px] font-bold px-2 py-0.5 rounded-lg"
							style={{ color: "#00aaff", background: "rgba(0,170,255,0.1)", minWidth: 38, textAlign: "center" }}
						>
							{sleep}h
						</span>
					</div>
					<div className="relative py-1">
						<div
							className="absolute top-1/2 left-0 right-0 h-1 rounded-full -translate-y-1/2"
							style={sliderTrack(sleep, 12, "#00aaff")}
						/>
						<input
							id="sleep-slider"
							type="range" min={0} max={12} step={0.5}
							value={sleep}
							onChange={e => setSleep(Number(e.target.value))}
							className="sidebar-slider w-full"
						/>
					</div>
					<div className="flex justify-between mt-1.5">
						<span className="text-[10px] text-gray-400">0h</span>
						<span className="text-[10px] text-gray-400">6h</span>
						<span className="text-[10px] text-gray-400">12h</span>
					</div>
				</div>

				{/* Coffee */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-gray-700">How many coffees did you drink?</span>
						</div>
						<span
							className="text-[12px] font-bold px-2 py-0.5 rounded-lg"
							style={{ color: "#f97316", background: "rgba(249,115,22,0.1)", minWidth: 38, textAlign: "center" }}
						>
							{coffee === 0 ? "—" : coffee}
						</span>
					</div>
					<div className="relative py-1">
						<div
							className="absolute top-1/2 left-0 right-0 h-1 rounded-full -translate-y-1/2"
							style={sliderTrack(coffee, 10, "#f97316")}
						/>
						<input
							id="coffee-slider"
							type="range" min={0} max={10} step={1}
							value={coffee}
							onChange={e => setCoffee(Number(e.target.value))}
							className="sidebar-slider coffee-slider w-full"
						/>
					</div>
					<div className="flex justify-between mt-1.5">
						<span className="text-[10px] text-gray-400">0</span>
						<span className="text-[10px] text-gray-400">5</span>
						<span className="text-[10px] text-gray-400">10</span>
					</div>
				</div>

				{/* Mood */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<span className="text-[13px] font-semibold text-gray-700">How is your mood?</span>
						</div>
						<span
							className="text-[12px] font-bold px-2 py-0.5 rounded-lg transition-all duration-300"
							style={{
								color: moodColors[mood],
								background: `${moodColors[mood]}1a`,
								minWidth: 54,
								textAlign: "center",
							}}
						>
							{moodLabels[mood]}
						</span>
					</div>
					<div className="relative py-1">
						<div
							className="absolute top-1/2 left-0 right-0 h-1 rounded-full -translate-y-1/2 transition-all duration-300"
							style={sliderTrack(mood, 4, moodColors[mood])}
						/>
						<input
							id="mood-slider"
							type="range" min={0} max={4} step={1}
							value={mood}
							onChange={e => setMood(Number(e.target.value))}
							className="sidebar-slider mood-slider w-full"
							style={{ "--mood-color": moodColors[mood] } as React.CSSProperties}
						/>
					</div>
					<div className="flex justify-between mt-1.5">
						{moodLabels.map((label, i) => (
							<span
								key={label}
								className="text-[9px] transition-all duration-200"
								style={{
									color: mood === i ? moodColors[i] : "#9ca3af",
									fontWeight: mood === i ? 700 : 400,
								}}
							>
								{label}
							</span>
						))}
					</div>
				</div>
			</div>

			{/* Generate */}
			<div className="px-4 pb-5">
				<Button
					id="my-brain-generate"
					onClick={handleGenerate}
					fullWidth
					variant="primary"
					disabled={isGenerating}
				>
					{isGenerating ? "Generating..." : "Generate"}
				</Button>
			</div>

			<style>{`
				.sidebar-slider {
					-webkit-appearance: none;
					appearance: none;
					background: transparent;
					cursor: pointer;
					height: 20px;
					position: relative;
				}
				.sidebar-slider::-webkit-slider-thumb {
					-webkit-appearance: none;
					width: 18px; height: 18px;
					border-radius: 50%;
					background: #fff;
					border: 2.5px solid #00aaff;
					box-shadow: 0 2px 6px rgba(0,170,255,0.3);
					cursor: pointer;
					transition: transform 0.15s, box-shadow 0.15s;
				}
				.sidebar-slider::-webkit-slider-thumb:hover {
					transform: scale(1.25);
					box-shadow: 0 4px 12px rgba(0,170,255,0.4);
				}
				.coffee-slider::-webkit-slider-thumb {
					border-color: #f97316;
					box-shadow: 0 2px 6px rgba(249,115,22,0.3);
				}
				.coffee-slider::-webkit-slider-thumb:hover {
					box-shadow: 0 4px 12px rgba(249,115,22,0.4);
				}
				.mood-slider::-webkit-slider-thumb {
					border-color: var(--mood-color, #00aaff);
					box-shadow: 0 2px 6px rgba(0,0,0,0.15);
					transition: border-color 0.3s, transform 0.15s, box-shadow 0.15s;
				}
			`}</style>
		</div>
	);
}

/* ─── Research ───────────────────────────────────────────────────────── */

function ResearchContent() {
	const [searchQuery, setSearchQuery] = useState("");

	return (
		<div className="flex-1 overflow-y-auto">
			{/* Header */}
			<div className="px-4 pt-5 pb-4 border-b border-gray-200/60">
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

/* ─── Main Sidebar ───────────────────────────────────────────────────── */

interface SidebarProps {
	onSelectItem: (item: string, section: string) => void;
	selectedItem: string | null;
	activeNav: string | null;
}

function Sidebar({ onSelectItem, selectedItem, activeNav }: SidebarProps) {
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

	if (activeNav === "simulation") {
		return (
			<aside className="w-72 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex flex-col">
				<SimulationsContent />
			</aside>
		);
	}

	if (activeNav === "research") {
		return (
			<aside className="w-72 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex flex-col">
				<ResearchContent />
			</aside>
		);
	}

	if (activeNav === "my-brain") {
		return (
			<aside className="w-72 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex flex-col">
				<MyBrainContent />
			</aside>
		);
	}

	return (
		<aside className="w-72 shrink-0 border-r border-gray-200/60 bg-gray-50/90 backdrop-blur-sm flex flex-col">
			{/* Header */}
			<div className="px-4 pt-5 pb-4 border-b border-gray-200/60">
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
								<ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
							</button>

							<div
								className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
									}`}>
								<ul className="pb-2">
									{section.items.map(item => (
										<li key={item}>
											<button
												onClick={() => onSelectItem(item, section.title)}
												className={`w-full text-left px-4 pl-8 py-1.5 text-sm transition-colors duration-200 cursor-pointer rounded-r-lg ${selectedItem === item
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
