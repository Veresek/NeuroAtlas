import CloseIcon from '@/assets/close.svg?react';
import ChevronDownIcon from '@/assets/chevron-down.svg?react';
import MyBrainIcon from '@/assets/my-brain.svg?react';
import { BrainSectionList } from '@/components/shared/BrainSectionList';
import { useMyBrain } from '../hooks/useMyBrain';

interface MyBrainDetailProps {
	item: string;
	onClose: () => void;
}

export function MyBrainDetail({ item, onClose }: MyBrainDetailProps) {
	const { isGenerating, analysis, error } = useMyBrain();

	return (
		<>
			<div className='flex items-center px-4 py-2 border-b border-gray-200/60 shrink-0'>
				<button
					onClick={onClose}
					className='p-1.5 -ml-1.5 mr-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer md:hidden flex items-center justify-center'
					aria-label='Back'>
					<ChevronDownIcon className='w-5 h-5 text-gray-500 rotate-90' />
				</button>
				<div className='flex-1'>
					<p className='text-[11px] font-bold uppercase tracking-widest text-[#00aaff]'>
						My Brain
					</p>
					<h2 className='text-base font-bold text-gray-800 leading-tight'>
						{item}
					</h2>
				</div>
				<button
					onClick={onClose}
					className='p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer hidden md:flex items-center justify-center'
					aria-label='Close'>
					<CloseIcon className='w-4 h-4 text-gray-400' />
				</button>
			</div>

			<div className='flex-1 overflow-y-auto p-4 space-y-4 text-sm text-gray-600'>
				{isGenerating && (
					<div className='flex flex-col items-center justify-center py-12 text-center'>
						<div
							className='w-10 h-10 rounded-full border-2 border-[#00aaff]/30 border-t-[#00aaff] animate-spin mb-4'
							aria-hidden
						/>
						<p className='text-sm font-medium text-gray-700'>
							Analyzing your daily log…
						</p>
						<p className='text-xs text-gray-500 mt-1 max-w-xs'>
							Gemini is interpreting sleep, caffeine, and mood from a
							neuroscience perspective.
						</p>
					</div>
				)}

				{!isGenerating && error && (
					<div className='rounded-lg border border-red-200 bg-red-50/80 px-3 py-3 text-red-800 text-xs leading-relaxed'>
						<p className='font-semibold mb-1'>Could not generate analysis</p>
						<p>{error}</p>
					</div>
				)}

				{!isGenerating && analysis && (
					<>
						<div>
							<h3 className='font-semibold text-gray-800 mb-1'>AI Overview</h3>
							{analysis.message}
						</div>
						<BrainSectionList
							items={analysis.affectedSections}
							title='Affected Brain Areas'
							resetKey={analysis.message}
						/>
					</>
				)}

				{!isGenerating && !analysis && !error && (
					<div className='flex flex-col items-center justify-center py-12 text-center'>
						<MyBrainIcon className='w-8 h-8 text-[#00aaff]/60 mb-3' />
						<p className='text-xs text-gray-500 max-w-xs'>
							Adjust your sliders and press <strong>Generate</strong> to get a
							neurobiological overview for <strong>{item}</strong>.
						</p>
					</div>
				)}
			</div>
		</>
	);
}
