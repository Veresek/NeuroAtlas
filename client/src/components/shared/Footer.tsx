import { Link } from "react-router-dom";
import GitHubIcon from "@/assets/github.svg";
import ChangelogIcon from "@/assets/changelog.svg?react";

function Footer() {
	return (
		<footer className="relative border-t border-gray-200/60">
			<div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-linear-to-r from-transparent via-[#00aaff]/30 to-transparent" />

			<div className="flex items-center justify-between px-5 py-2">
				<p className="text-xs text-gray-400">
					© {new Date().getFullYear()} NeuroAtlas — Open Source
				</p>

				<div className="flex items-center gap-2">
					{/* Changelog */}
					<Link
						to="/changelog"
						className="group flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 hover:border-[#00aaff]/50 hover:bg-[#00aaff]/5 transition-all duration-300"
						aria-label="Changelog">
						<ChangelogIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#00aaff] transition-colors duration-300" />
					</Link>

					{/* GitHub */}
					<a
						href="https://github.com/Veresek/brain-info"
						target="_blank"
						rel="noopener noreferrer"
						className="group flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 hover:border-[#00aaff]/50 hover:bg-[#00aaff]/5 transition-all duration-300"
						aria-label="GitHub">
						<img
							src={GitHubIcon}
							alt="GitHub"
							className="w-3.5 h-3.5 opacity-60 group-hover:opacity-90 transition-opacity duration-300"
						/>
					</a>
				</div>
			</div>
		</footer>
	);
}

export default Footer;

