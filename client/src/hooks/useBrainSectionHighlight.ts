import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { setBrainHighlight } from '@/hooks/useBrainHighlight';

const LEAVE_DELAY_MS = 300;

interface UseBrainSectionHighlightOptions {
	sectionNames: string[];
	enabled?: boolean;
	resetKey?: string | number | null;
}

export function useBrainSectionHighlight({
	sectionNames,
	enabled = true,
	resetKey,
}: UseBrainSectionHighlightOptions) {
	const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearLeaveTimeout = useCallback(() => {
		if (leaveTimeoutRef.current) {
			clearTimeout(leaveTimeoutRef.current);
			leaveTimeoutRef.current = null;
		}
	}, []);

	const interactionEpoch = useMemo(() => {
		if (resetKey === undefined || resetKey === null) {
			return 'default';
		}
		return String(resetKey);
	}, [resetKey]);

	const [interactionState, setInteractionState] = useState<{
		epoch: string;
		hoveredArea: string | null;
		clickedArea: string | null;
	}>(() => ({
		epoch: interactionEpoch,
		hoveredArea: null,
		clickedArea: null,
	}));

	if (interactionState.epoch !== interactionEpoch) {
		setInteractionState({
			epoch: interactionEpoch,
			hoveredArea: null,
			clickedArea: null,
		});
	}

	const { hoveredArea, clickedArea } = interactionState;

	useEffect(() => {
		clearLeaveTimeout();
	}, [interactionEpoch, clearLeaveTimeout]);

	const setHoveredArea = useCallback((value: string | null) => {
		setInteractionState(prev => ({ ...prev, hoveredArea: value }));
	}, []);

	const setClickedArea = useCallback(
		(value: string | null | ((prev: string | null) => string | null)) => {
			setInteractionState(prev => ({
				...prev,
				clickedArea:
					typeof value === 'function' ? value(prev.clickedArea) : value,
			}));
		},
		[],
	);

	useEffect(() => {
		if (!enabled || sectionNames.length === 0) {
			setBrainHighlight(null);
			return;
		}

		if (hoveredArea) {
			setBrainHighlight(hoveredArea);
		} else if (clickedArea) {
			setBrainHighlight(clickedArea);
		} else {
			setBrainHighlight(sectionNames);
		}
	}, [hoveredArea, clickedArea, sectionNames, enabled]);

	useEffect(() => {
		return () => {
			clearLeaveTimeout();
			setBrainHighlight(null);
		};
	}, [clearLeaveTimeout]);

	const getSectionState = useCallback(
		(name: string) => {
			const isAnyHovered = hoveredArea !== null;
			const isCurrentHovered = hoveredArea === name;
			const isAnyClicked = clickedArea !== null;
			const isCurrentClicked = clickedArea === name;
			const isActive =
				isCurrentHovered ||
				(!isAnyHovered && isCurrentClicked) ||
				(!isAnyHovered && !isAnyClicked);

			return { isActive, isCurrentClicked };
		},
		[hoveredArea, clickedArea],
	);

	const getSectionHandlers = useCallback(
		(name: string) => ({
			onClick: () => {
				setClickedArea(prev => (prev === name ? null : name));
			},
			onMouseEnter: () => {
				clearLeaveTimeout();
				setHoveredArea(name);
			},
			onMouseLeave: () => {
				clearLeaveTimeout();
				leaveTimeoutRef.current = setTimeout(() => {
					setHoveredArea(null);
					leaveTimeoutRef.current = null;
				}, LEAVE_DELAY_MS);
			},
		}),
		[clearLeaveTimeout, setHoveredArea, setClickedArea],
	);

	return { getSectionState, getSectionHandlers };
}
