import { useMemo } from 'react';
import { useBrainSectionHighlight } from '@/hooks/useBrainSectionHighlight';
import {
	formatBrainSectionLabel,
	getBrainSectionBadgeClasses,
} from '@/utils/brainSectionStyles';
import {
	normalizeBrainSectionItems,
	type BrainSectionListInput,
} from './brainSectionListUtils';

export type { BrainSectionListInput, BrainSectionListItem } from './brainSectionListUtils';

interface BrainSectionListProps {
	items: BrainSectionListInput[];
	title?: string;
	titleClassName?: string;
	className?: string;
	/** Resets hover/click when this value changes (e.g. selected detail item). */
	resetKey?: string | number | null;
	interactive?: boolean;
}

export function BrainSectionList({
	items,
	title = 'Brain Areas',
	titleClassName = 'font-semibold text-gray-800 mb-1',
	className,
	resetKey,
	interactive = true,
}: BrainSectionListProps) {
	const normalized = useMemo(() => normalizeBrainSectionItems(items), [items]);
	const sectionNames = useMemo(
		() => normalized.map(item => item.name),
		[normalized],
	);

	const { getSectionState, getSectionHandlers } = useBrainSectionHighlight({
		sectionNames,
		enabled: interactive && sectionNames.length > 0,
		resetKey,
	});

	if (normalized.length === 0) {
		return null;
	}

	return (
		<div className={className}>
			{title ? <h3 className={titleClassName}>{title}</h3> : null}
			<div className='flex flex-wrap gap-1.5 mt-1'>
				{normalized.map(item => {
					const { isActive, isCurrentClicked } = getSectionState(item.name);
					const handlers = interactive ? getSectionHandlers(item.name) : {};

					return (
						<span
							key={item.id}
							{...handlers}
							className={getBrainSectionBadgeClasses(item.effectType, {
								isActive,
								isClicked: isCurrentClicked,
								interactive,
							})}>
							{formatBrainSectionLabel(item.name, item.effectType)}
						</span>
					);
				})}
			</div>
		</div>
	);
}
