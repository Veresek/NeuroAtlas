import MyBrainIcon from '@/assets/my-brain.svg?react';
import { Button } from '@/components/ui/Button';
import { useMyBrain } from '../hooks/useMyBrain';

interface MyBrainSidebarProps {
	onSelectItem: (item: string, section: string) => void;
}

export function MyBrainSidebar({ onSelectItem }: MyBrainSidebarProps) {
	const { log, setNote, isGenerating, generate } = useMyBrain();

	const handleGenerate = async () => {
		const today = new Date().toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
		onSelectItem(today, 'My Brain');
		await generate();
	};

	return (
		<div className='flex-1 overflow-y-auto'>
			{/* Header */}
			<div className='hidden md:block px-4 pt-5 pb-4 border-b border-gray-200/60'>
				<div className='flex items-center gap-3'>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 10,
							background:
								'linear-gradient(135deg, rgba(0,170,255,0.15), rgba(0,170,255,0.08))',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}>
						<MyBrainIcon className='w-[18px] h-[18px] text-[#00aaff]' />
					</div>
					<div>
						<p
							className='text-[13px] text-gray-800'
							style={{ fontWeight: 700 }}>
							My Brain
						</p>
						<p className='text-xs text-gray-500'>
							How your lifestyle affects your brain?
						</p>
					</div>
				</div>
			</div>

			{/* Daily note */}
			<div className='px-4 py-5 flex flex-col gap-2'>
				<label
					htmlFor='day-note'
					className='text-[13px] font-semibold text-gray-700'>
					How was your day?
				</label>
				<textarea
					id='day-note'
					rows={5}
					maxLength={2000}
					value={log.note}
					placeholder='e.g. slept 5h, three coffees by noon, long run in the evening, feeling a bit wired'
					onChange={e => setNote(e.target.value)}
					className='w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00aaff] focus:ring-2 focus:ring-[#00aaff]/20 transition-colors'
				/>
			</div>

			{/* Generate */}
			<div className='px-4 pb-5'>
				<Button
					id='my-brain-generate'
					onClick={handleGenerate}
					fullWidth
					variant='primary'
					disabled={isGenerating || !log.note.trim()}>
					{isGenerating ? 'Generating...' : 'Generate'}
				</Button>
			</div>
		</div>
	);
}
