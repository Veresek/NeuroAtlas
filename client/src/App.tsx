import BrainModel from "./features/brain-model/components/BrainModel";

function App() {
	return (
		<div>
			<div className="flex flex-col md:flex-row items-center justify-center h-screen gap-6 md:gap-0 px-4">
				<div className="md:mb-20 text-center">
					<h1 className="text-4xl md:text-7xl font-bold mt-6 md:mt-10">
						Neuro<span className="text-[#00aaff]">Atlas</span>
					</h1>
					<p className="mt-1 text-base md:text-lg">
						Explore the human brain in 3D. More coming soon.
					</p>
				</div>
				<BrainModel />
			</div>
			<div className="fixed bottom-3 right-3 group">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground/70 cursor-help">
					<path
						fillRule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-2.25a.75.75 0 00-1.5 0v.5a.75.75 0 001.5 0v-.5zM9 9.5a.75.75 0 00-.75.75v2.5a.75.75 0 001.5 0v-2.5A.75.75 0 009 9.5zm0-6a6.5 6.5 0 100 13 6.5 6.5 0 000-13z"
					/>
				</svg>
				<div className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-popover text-popover-foreground border rounded-md shadow-md p-2 text-[10px] max-w-64 leading-snug z-10">
					Kristen Browne; Heidi Schlehlein. 2023. 3D Reference Organ for Brain,
					Male v1.3.{" "}
					<a
						href="https://doi.org/10.48539/HBM929.XKCL.339"
						target="_blank"
						rel="noopener noreferrer"
						className="underline hover:text-popover-foreground/80">
						https://doi.org/10.48539/HBM929.XKCL.339
					</a>
					. Accessed on December 15, 2023.
				</div>
			</div>
		</div>
	);
}

export default App;
