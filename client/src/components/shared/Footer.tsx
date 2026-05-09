import { useState } from "react";
import InfoIcon from "@/assets/info.svg";
import GitHubIcon from "@/assets/github.svg";

const footerLinks = {
	Project: [
		{ label: "Documentation", href: "/docs" },
		{ label: "Roadmap", href: "/roadmap" },
		{ label: "Contributing", href: "/contributing" },
	],
	Legal: [
		{ label: "License", href: "/license" },
		{ label: "Privacy Policy", href: "/privacy" },
		{ label: "Terms of Use", href: "/terms" },
	],
};

function Footer() {
	const [creditsOpen, setCreditsOpen] = useState(false);

	return (
		<footer className="relative border-t border-gray-200/60">
			{/* Accent glow line */}
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#00aaff]/30 to-transparent" />

			<div className="max-w-6xl mx-auto px-6 pt-10 pb-5">
				{/* Upper section */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
					{/* Brand */}
					<div className="lg:col-span-2 flex flex-col gap-3">
						<h2 className="text-lg font-bold tracking-tight text-gray-800">
							Neuro<span className="text-[#00aaff]">Atlas</span>
						</h2>
						<p className="text-sm text-gray-400 leading-relaxed max-w-xs">
							An open-source interactive platform for exploring the human brain
							in 3D. Built with passion for science and technology.
						</p>

						{/* External links */}
						<div className="flex items-center gap-2.5 mt-1">
							<a
								href="https://github.com/Veresek/brain-info"
								target="_blank"
								rel="noopener noreferrer"
								className="group flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:border-[#00aaff]/50 hover:bg-[#00aaff]/5 transition-all duration-300"
								aria-label="GitHub"
							>
								<img
									src={GitHubIcon}
									alt="GitHub"
									className="w-4 h-4 opacity-60 group-hover:opacity-90 transition-opacity duration-300"
								/>
							</a>

							{/* Credits tooltip */}
							<div className="relative">
								<button
									onClick={() => setCreditsOpen((prev) => !prev)}
									className="group flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:border-[#00aaff]/50 hover:bg-[#00aaff]/5 transition-all duration-300 cursor-pointer"
									aria-label="Credits"
								>
									<img
										src={InfoIcon}
										alt="Credits"
										className="w-4 h-4 opacity-60 group-hover:opacity-90 transition-opacity duration-300"
									/>
								</button>
								<div
									className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-200/50 p-4 text-[11px] text-gray-500 leading-relaxed z-20 transition-all duration-200 ${
										creditsOpen
											? "opacity-100 translate-y-0 pointer-events-auto"
											: "opacity-0 translate-y-1 pointer-events-none"
									}`}
								>
									<p className="font-medium text-gray-700 mb-1.5 text-xs">
										3D Model Source
									</p>
									Kristen Browne; Heidi Schlehlein. 2023. 3D Reference Organ
									for Brain, Male v1.3.{" "}
									<a
										href="https://doi.org/10.48539/HBM929.XKCL.339"
										target="_blank"
										rel="noopener noreferrer"
										className="text-[#00aaff] hover:text-[#0088dd] underline underline-offset-2 transition-colors"
									>
										doi.org/10.48539/HBM929.XKCL.339
									</a>
									. Accessed on December 15, 2023.
								</div>
							</div>
						</div>
					</div>

					{/* Link columns */}
					{Object.entries(footerLinks).map(([title, links]) => (
						<div key={title} className="flex flex-col gap-3">
							<h3 className="text-xs font-semibold uppercase tracking-widest text-gray-300">
								{title}
							</h3>
							<ul className="flex flex-col gap-2">
								{links.map((link) => (
									<li key={link.label}>
										<a
											href={link.href}
											className="text-sm text-gray-400 hover:text-[#00aaff] transition-colors duration-200"
										>
											{link.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Divider */}
				<div className="mt-8 mb-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

				{/* Bottom bar */}
				<div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-300">
					<p>© {new Date().getFullYear()} NeuroAtlas — Open Source</p>
					<p>
						Made with{" "}
						<span className="text-[#00aaff]">♥</span> for neuroscience
					</p>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
