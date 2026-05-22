import type { AffectedBrainArea, BrainSectionEffectType } from '@/types/brain';

export interface BrainSectionListItem {
	id: string;
	name: string;
	effectType?: BrainSectionEffectType;
}

export type BrainSectionListInput =
	| string
	| AffectedBrainArea
	| BrainSectionListItem
	| { section: string; effectType?: BrainSectionEffectType };

export function normalizeBrainSectionItems(
	items: BrainSectionListInput[],
): BrainSectionListItem[] {
	return items.map((item, idx) => {
		if (typeof item === 'string') {
			return { id: `${item}-${idx}`, name: item };
		}
		if ('section' in item) {
			return {
				id: `${item.section}-${idx}`,
				name: item.section,
				effectType: item.effectType,
			};
		}
		if ('areaId' in item) {
			return {
				id: item.areaId,
				name: item.name,
				effectType: item.effectType,
			};
		}
		return {
			id: item.id,
			name: item.name,
			effectType: item.effectType,
		};
	});
}
