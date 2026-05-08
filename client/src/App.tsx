import BrainModel from "./features/brain-model/components/BrainModel";

function App() {
	return (
		<div className="flex items-center justify-center h-screen">
			<div className="mb-20 text-center">
				<h1 className="text-7xl font-bold mt-10">
					Neuro<span className="text-[#00aaff]">Atlas</span>
				</h1>
				<p className="mt-1 text-lg">
					Explore the human brain in 3D. More coming soon.
				</p>
			</div>
			<BrainModel />
		</div>
	);
}

export default App;
