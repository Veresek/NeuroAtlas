import MyBrainIcon from '@/assets/my-brain.svg?react';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { useMyBrain } from '../hooks/useMyBrain';

const MOOD_LABELS = ['Awful', 'Bad', 'Neutral', 'Good', 'Great'];
const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#00aaff'];

interface MyBrainSidebarProps {
	onSelectItem: (item: string, section: string) => void;
}

export function MyBrainSidebar({ onSelectItem }: MyBrainSidebarProps) {
	const { log, setSleep, setCoffee, setMood, isGenerating, generate } =
		useMyBrain();

	const handleGenerate = async () => {
		const today = new Date().toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
		onSelectItem(today, 'My Brain');
		await generate();
	};
	const { sleep, coffee, mood } = log;

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

			{/* Sliders */}
			<div className='px-4 py-5 flex flex-col gap-7'>
				<Slider
					id='sleep-slider'
					label='How many hours did you sleep?'
					value={sleep}
					min={0}
					max={12}
					step={0.5}
					color='#00aaff'
					displayValue={`${sleep}h`}
					onChange={e => setSleep(Number(e.target.value))}
				/>

				<Slider
					id='coffee-slider'
					label='How many coffees did you drink?'
					value={coffee}
					min={0}
					max={10}
					step={1}
					color='#f97316'
					displayValue={coffee === 0 ? '—' : String(coffee)}
					onChange={e => setCoffee(Number(e.target.value))}
				/>

				<Slider
					id='mood-slider'
					label='How is your mood?'
					value={mood}
					min={0}
					max={4}
					step={1}
					color={MOOD_COLORS[mood]}
					displayValue={MOOD_LABELS[mood]}
					onChange={e => setMood(Number(e.target.value))}
				/>
			</div>

			{/* Generate */}
			<div className='px-4 pb-5'>
				<Button
					id='my-brain-generate'
					onClick={handleGenerate}
					fullWidth
					variant='primary'
					disabled={isGenerating}>
					{isGenerating ? 'Generating...' : 'Generate'}
				</Button>
			</div>
		</div>
	);
}
