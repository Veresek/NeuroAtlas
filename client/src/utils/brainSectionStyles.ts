import type { BrainSectionEffectType } from '@/types/brain';

export function getBrainSectionBadgeClasses(
	effectType?: BrainSectionEffectType,
	options: {
		isActive?: boolean;
		isClicked?: boolean;
		interactive?: boolean;
	} = {},
): string {
	const { isActive = true, isClicked = false, interactive = true } = options;

	const base =
		'inline-block px-2 py-0.5 text-xs rounded-full font-medium transition-all duration-200';

	let effect: string;
	switch (effectType) {
		case 'stimulates':
			effect = 'bg-green-100 text-green-700 hover:bg-green-200/80';
			break;
		case 'depresses':
			effect = 'bg-blue-100 text-blue-700 hover:bg-blue-200/80';
			break;
		case 'damages':
			effect = 'bg-red-100 text-red-700 hover:bg-red-200/80';
			break;
		default:
			effect = 'bg-[#00aaff]/10 text-[#00aaff] hover:bg-[#00aaff]/20';
	}

	const interactiveClasses = interactive ? 'cursor-pointer' : '';
	const clicked = interactive && isClicked ? 'ring-1 ring-[#00aaff]/70' : '';
	const active = interactive
		? isActive
			? 'scale-105 shadow-sm opacity-100'
			: 'opacity-40'
		: 'opacity-100';

	return [base, effect, interactiveClasses, clicked, active]
		.filter(Boolean)
		.join(' ');
}

export function formatBrainSectionLabel(
	name: string,
	effectType?: BrainSectionEffectType,
): string {
	return effectType ? `${name} (${effectType})` : name;
}
