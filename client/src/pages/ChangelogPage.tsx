import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/shared/Footer';
import ChangelogIcon from '@/assets/changelog.svg?react';
import ArrowLeftIcon from '@/assets/arrow-left.svg?react';

// ── Types ────────────────────────────────────────────────────
interface ChangelogEntry {
	version: string;
	date: string;
	tag: 'major' | 'minor' | 'patch';
	summary: string;
	added?: string[];
	deleted?: string[];
	modified?: string[];
}

// ── Data ─────────────────────────────────────────────────────
const entries: ChangelogEntry[] = [
	{
		version: '0.2.1',
		date: '2026-05-24',
		tag: 'patch',
		summary: 'Improved readability and mobile compatibility.',
		modified: [
			'Improved readability in research section.',
			'Improved mobile UI and UX for detail panels.',
			'Fixed mobile UI bugs in detail panels.',
		],
	},
	{
		version: '0.2.0',
		date: '2026-05-22',
		tag: 'major',
		summary:
			'My Brain AI daily analysis, a dedicated Research section, and shared brain-area highlighting across detail panels.',
		added: [
			'My Brain tab with sleep, caffeine, and mood inputs and Gemini-powered neuro overview.',
			'Affected brain areas from AI analysis with interactive badges that highlight the 3D model.',
			'Research section with searchable sidebar, paper detail panel, and curated publications data.',
			'Shared BrainSectionList component for consistent affected-area display in Atlas, Research, and My Brain.',
			'Automatic retry for transient Gemini API errors (e.g. internal server errors).',
			'External-link icon asset reused for DOI links in Research and Atlas.',
		],
		modified: [
			'Split detail views into Atlas, Research, and My Brain panels with aligned section styling.',
			'Atlas entries now link to related research papers with external DOI shortcuts.',
			'Refactored brain-section highlight logic and context hooks for React Fast Refresh and ESLint compliance.',
		],
	},
	{
		version: '0.1.1',
		date: '2026-05-18',
		tag: 'minor',
		summary: 'Improved readability and added highlighting sections.',
		added: [
			'Added highlighting for sections after choosing element from atlas',
		],
		modified: ['Fixed readeablity for light colored text on white background.'],
	},
	{
		version: '0.1.0',
		date: '2026-05-18',
		tag: 'minor',
		summary:
			'Introduced a new global highlight system and a brain area selector.',
		added: [
			'Responsive dropdown selector on the canvas for picking specific brain areas.',
			'Categorized dropdown options by anatomical regions using brainSections data.',
			'Support for rendering and highlighting anatomical areas on demand, even if hidden by default.',
			'Added changelog page.',
		],
		modified: [
			'Refactored BrainModel component to consume the new highlight hook internally.',
		],
	},
];

// ── Tag styles ───────────────────────────────────────────────
const tagStyle: Record<ChangelogEntry['tag'], string> = {
	major: 'bg-violet-100 text-violet-600',
	minor: 'bg-blue-100 text-blue-500',
	patch: 'bg-gray-100 text-gray-500',
};

// ── Component ────────────────────────────────────────────────
function ChangelogPage() {
	const [selected, setSelected] = useState<ChangelogEntry | null>(
		entries[0] ?? null,
	);

	return (
		<div className='flex flex-col h-screen overflow-hidden bg-gray-50'>
			{/* ── Header (Matches Navbar height exactly) ── */}
			<header className='shrink-0 flex items-center justify-between px-4 md:px-5 py-2.5 md:py-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm z-50'>
				<div className='flex items-center gap-2'>
					<Link
						to='/'
						className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#00aaff] transition-colors duration-200 font-medium'>
						<ArrowLeftIcon className='w-4 h-4' />
						NeuroAtlas
					</Link>
					<span className='text-gray-300'>/</span>
					<span className='flex items-center gap-1.5 text-sm font-semibold text-gray-800'>
						<ChangelogIcon className='w-3.5 h-3.5 text-[#00aaff]' />
						Changelog
					</span>
				</div>
			</header>

			{/* ── Body ── */}
			<div className='flex flex-1 min-h-0'>
				{/* Left — version list (Widened to w-64) */}
				<aside className='w-64 shrink-0 border-r border-gray-200/60 bg-white overflow-y-auto flex flex-col'>
					{entries.length === 0 ? (
						<div className='flex flex-col items-center justify-center flex-1 gap-2 px-4 text-center'>
							<ChangelogIcon className='w-5 h-5 text-gray-300' />
							<p className='text-xs text-gray-400 leading-relaxed'>
								No releases yet
							</p>
						</div>
					) : (
						<ul className='py-2'>
							{entries.map(entry => (
								<li key={entry.version}>
									<button
										onClick={() => setSelected(entry)}
										className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors duration-150 ${
											selected?.version === entry.version
												? 'bg-[#00aaff]/8 border-r-2 border-[#00aaff]'
												: 'hover:bg-gray-50'
										}`}>
										<div className='flex items-center gap-2'>
											<span className='text-sm font-semibold text-gray-800'>
												v{entry.version}
											</span>
											<span
												className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${tagStyle[entry.tag]}`}>
												{entry.tag}
											</span>
										</div>
										<span className='text-xs text-gray-400'>{entry.date}</span>
										<p className='text-xs text-gray-500 line-clamp-2 leading-relaxed'>
											{entry.summary}
										</p>
									</button>
								</li>
							))}
						</ul>
					)}
				</aside>

				{/* Right — details */}
				<main className='flex-1 overflow-y-auto bg-white'>
					{selected ? (
						<div className='max-w-2xl mx-auto px-8 py-10'>
							{/* Title row */}
							<div className='flex items-center gap-3 mb-2'>
								<h1 className='text-2xl font-bold tracking-tight text-gray-900'>
									v{selected.version}
								</h1>
								<span
									className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${tagStyle[selected.tag]}`}>
									{selected.tag}
								</span>
							</div>
							<p className='text-sm text-gray-400 mb-6'>{selected.date}</p>
							<p className='text-sm text-gray-600 mb-10 leading-relaxed'>
								{selected.summary}
							</p>

							{/* Predefined Sections */}
							{/* ── Added ── */}
							{selected.added && selected.added.length > 0 && (
								<div className='mb-8'>
									<h2 className='text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-1.5'>
										<span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
										Added
									</h2>
									<ul className='space-y-2.5'>
										{selected.added.map((item, i) => (
											<li
												key={i}
												className='flex gap-2.5 text-sm text-gray-700 leading-relaxed'>
												<span className='text-emerald-500/80 mt-0.5 shrink-0'>
													→
												</span>
												{item}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* ── Modified ── */}
							{selected.modified && selected.modified.length > 0 && (
								<div className='mb-8'>
									<h2 className='text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-1.5'>
										<span className='w-1.5 h-1.5 rounded-full bg-amber-500'></span>
										Modified
									</h2>
									<ul className='space-y-2.5'>
										{selected.modified.map((item, i) => (
											<li
												key={i}
												className='flex gap-2.5 text-sm text-gray-700 leading-relaxed'>
												<span className='text-amber-500/80 mt-0.5 shrink-0'>
													→
												</span>
												{item}
											</li>
										))}
									</ul>
								</div>
							)}

							{/* ── Deleted ── */}
							{selected.deleted && selected.deleted.length > 0 && (
								<div className='mb-8'>
									<h2 className='text-xs font-semibold uppercase tracking-widest text-rose-600 mb-3 flex items-center gap-1.5'>
										<span className='w-1.5 h-1.5 rounded-full bg-rose-500'></span>
										Deleted
									</h2>
									<ul className='space-y-2.5'>
										{selected.deleted.map((item, i) => (
											<li
												key={i}
												className='flex gap-2.5 text-sm text-gray-700 leading-relaxed'>
												<span className='text-rose-500/80 mt-0.5 shrink-0'>
													→
												</span>
												{item}
											</li>
										))}
									</ul>
								</div>
							)}
						</div>
					) : (
						/* Empty state when no entries */
						<div className='flex flex-col items-center justify-center h-full gap-4 text-center px-8'>
							<div className='w-14 h-14 rounded-2xl bg-[#00aaff]/8 flex items-center justify-center'>
								<ChangelogIcon className='w-6 h-6 text-[#00aaff]' />
							</div>
							<div>
								<h2 className='text-base font-semibold text-gray-800 mb-1'>
									No releases yet
								</h2>
								<p className='text-sm text-gray-400 max-w-xs leading-relaxed'>
									Release notes will appear here as NeuroAtlas evolves.
								</p>
							</div>
						</div>
					)}
				</main>
			</div>

			{/* ── Footer ── */}
			<div className='hidden md:block shrink-0'>
				<Footer />
			</div>
		</div>
	);
}

export default ChangelogPage;
