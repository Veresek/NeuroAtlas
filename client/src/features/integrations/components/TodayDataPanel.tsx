import { useEffect, useState } from 'react';
import type { MyBrainLog } from '@/features/my-brain/hooks/useMyBrainLog';
import {
	fetchHealth,
	PROVIDER_LABELS,
	type DailyHealthSummary,
} from '../api/integrations';
import { useIntegrations } from '../hooks/useIntegrations';

const MOOD_LABELS = ['Awful', 'Bad', 'Neutral', 'Good', 'Great'];

interface TodayDataPanelProps {
	log: MyBrainLog;
}

function Chip({ label }: { label: string }) {
	return (
		<span className='inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700'>
			{label}
		</span>
	);
}

function SourceTag({ source }: { source: string }) {
	return (
		<span className='text-[10px] font-bold uppercase tracking-widest text-[#00aaff]'>
			{source}
		</span>
	);
}

export function TodayDataPanel({ log }: TodayDataPanelProps) {
	const { providers } = useIntegrations();
	const [summary, setSummary] = useState<DailyHealthSummary | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const today = new Date().toISOString().slice(0, 10);
				const data = await fetchHealth(today, today);
				if (!cancelled) setSummary(data.summaries[0] ?? null);
			} catch (err) {
				console.error('[Integrations] Failed to load today data:', err);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const anyConnected = providers.some(p => p.connected);

	const activityChips: string[] = [];
	if (summary?.activity) {
		const activity = summary.activity;
		for (const workout of activity.workouts) {
			const parts = [
				`${workout.type} ${Math.round(workout.duration_min)}min`,
				workout.calories ? `${Math.round(workout.calories)} kcal` : null,
				workout.avg_hr ? `HR ${workout.avg_hr}` : null,
			].filter(Boolean);
			activityChips.push(parts.join(' · '));
		}
		if (activity.active_minutes != null)
			activityChips.push(`${Math.round(activity.active_minutes)} min active`);
		if (activity.calories_burned != null)
			activityChips.push(`${Math.round(activity.calories_burned)} kcal burned`);
		if (activity.steps != null) activityChips.push(`${activity.steps} steps`);
	}

	const nutritionChips: string[] = [];
	if (summary?.nutrition) {
		const nutrition = summary.nutrition;
		if (nutrition.calories != null)
			nutritionChips.push(`${Math.round(nutrition.calories)} kcal`);
		if (nutrition.protein_g != null)
			nutritionChips.push(`P ${Math.round(nutrition.protein_g)}g`);
		if (nutrition.carbs_g != null)
			nutritionChips.push(`C ${Math.round(nutrition.carbs_g)}g`);
		if (nutrition.fat_g != null)
			nutritionChips.push(`F ${Math.round(nutrition.fat_g)}g`);
		if (nutrition.caffeine_mg != null)
			nutritionChips.push(`${Math.round(nutrition.caffeine_mg)}mg caffeine`);
		if (nutrition.water_ml != null)
			nutritionChips.push(`${Math.round(nutrition.water_ml)}ml water`);
		if (nutrition.alcohol_g != null)
			nutritionChips.push(`${Math.round(nutrition.alcohol_g)}g alcohol`);
	}

	const moodLabel =
		log.mood >= 0 && log.mood < MOOD_LABELS.length
			? MOOD_LABELS[log.mood]
			: 'Unknown';

	if (!summary && !anyConnected) {
		return (
			<div className='rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-3'>
				<h3 className='font-semibold text-gray-800 mb-1'>Today's data</h3>
				<p className='text-xs text-gray-500 leading-relaxed'>
					Connect <strong>Strava</strong> or <strong>FatSecret</strong> in the
					sidebar to enrich your analysis with real workout and meal data.
				</p>
			</div>
		);
	}

	return (
		<div className='rounded-lg border border-gray-200/70 bg-gray-50/60 px-3 py-3 space-y-2.5'>
			<h3 className='font-semibold text-gray-800'>Today's data</h3>

			{activityChips.length > 0 && (
				<div>
					<SourceTag source={PROVIDER_LABELS.strava} />
					<div className='flex flex-wrap gap-1.5 mt-1'>
						{activityChips.map(chip => (
							<Chip key={chip} label={chip} />
						))}
					</div>
				</div>
			)}

			{nutritionChips.length > 0 && (
				<div>
					<SourceTag source={PROVIDER_LABELS.fatsecret} />
					<div className='flex flex-wrap gap-1.5 mt-1'>
						{nutritionChips.map(chip => (
							<Chip key={chip} label={chip} />
						))}
					</div>
				</div>
			)}

			<div>
				<SourceTag source='Daily Log' />
				<div className='flex flex-wrap gap-1.5 mt-1'>
					<Chip label={`${log.sleep}h sleep`} />
					<Chip
						label={log.coffee === 0 ? 'no coffee' : `${log.coffee} coffees`}
					/>
					<Chip label={`Mood: ${moodLabel}`} />
				</div>
			</div>
		</div>
	);
}
