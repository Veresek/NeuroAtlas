interface DetailPanelProps {
	item: string | null;
	section: string | null;
	onClose: () => void;
}

function DetailPanel({ item, section, onClose }: DetailPanelProps) {
	const isOpen = item !== null;

	return (
		<div
			className={`shrink-0 border-r border-gray-200/60 bg-white flex flex-col transition-all duration-300 overflow-hidden ${
				isOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-r-0"
			}`}>
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60">
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
						{section}
					</p>
					<h2 className="text-base font-bold text-gray-800">{item}</h2>
				</div>
				<button
					onClick={onClose}
					className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
					aria-label="Close">
					<svg
						className="w-4 h-4 text-gray-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-gray-600">
				<div>
					<h3 className="font-semibold text-gray-800 mb-1">Description</h3>
					<p className="leading-relaxed">
						Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
						eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
						ad minim veniam.
					</p>
				</div>

				<div>
					<h3 className="font-semibold text-gray-800 mb-1">Brain Impact</h3>
					<p className="leading-relaxed">
						Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
						nisi ut aliquip ex ea commodo consequat.
					</p>
				</div>

				<div>
					<h3 className="font-semibold text-gray-800 mb-1">Brain Areas</h3>
					<div className="flex flex-wrap gap-1.5 mt-1">
						{["Prefrontal Cortex", "Amygdala", "Hippocampus"].map(region => (
							<span
								key={region}
								className="inline-block px-2 py-0.5 text-xs rounded-full bg-[#00aaff]/10 text-[#00aaff] font-medium">
								{region}
							</span>
						))}
					</div>
				</div>

				<div>
					<h3 className="font-semibold text-gray-800 mb-1">
						Neurotransmitters
					</h3>
					<div className="flex flex-wrap gap-1.5 mt-1">
						{["Dopamine", "Serotonin", "GABA"].map(nt => (
							<span
								key={nt}
								className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 font-medium">
								{nt}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default DetailPanel;
