import BrainModel from "./features/brain-model/components/BrainModel";
import Footer from "./components/shared/Footer";

function App() {
	return (
		<div className="flex flex-col min-h-screen">
			<div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-0 px-4">
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
			<Footer />
		</div>
	);
}

export default App;
