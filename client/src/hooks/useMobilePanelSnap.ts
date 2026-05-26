import { useCallback, useEffect, useRef, useState } from "react";

export type MobilePanelSnap = 0 | 1;

const SNAP_SPLIT_RATIO = 0.5;
const COLLAPSED_HEIGHT = 36;
const COLLAPSED_WITH_ITEM_HEIGHT = 52;
const DRAG_CLICK_THRESHOLD = 8;
const DRAG_SNAP_THRESHOLD = 40;

export function useMobilePanelSnap(selectedItem: string | null) {
	const [snap, setSnap] = useState<MobilePanelSnap>(0);
	const layoutRef = useRef<HTMLDivElement>(null);
	const [layoutHeight, setLayoutHeight] = useState(0);
	const isDraggingRef = useRef(false);
	const dragStartYRef = useRef(0);

	useEffect(() => {
		const el = layoutRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			setLayoutHeight(entries[0]?.contentRect.height ?? 0);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const collapsedHeight = selectedItem ? COLLAPSED_WITH_ITEM_HEIGHT : COLLAPSED_HEIGHT;

	const getPanelHeight = useCallback(
		(level: MobilePanelSnap) => {
			if (level === 0) return collapsedHeight;
			return layoutHeight * SNAP_SPLIT_RATIO;
		},
		[collapsedHeight, layoutHeight],
	);

	const panelHeight = getPanelHeight(snap);
	const brainHeight = Math.max(0, layoutHeight - panelHeight);
	const isContentVisible = snap === 1;
	const handleHeight = snap === 1 ? 36 : collapsedHeight;

	const openToMedium = useCallback(() => setSnap(1), []);

	const cycleSnap = useCallback(() => {
		setSnap((s) => (s === 0 ? 1 : 0));
	}, []);

	const onHandlePointerDown = (e: React.PointerEvent) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		dragStartYRef.current = e.clientY;
		isDraggingRef.current = true;
	};

	const finishDrag = (clientY: number) => {
		if (!isDraggingRef.current) return;
		const delta = dragStartYRef.current - clientY;
		if (Math.abs(delta) < DRAG_CLICK_THRESHOLD) {
			cycleSnap();
		} else if (delta > DRAG_SNAP_THRESHOLD) {
			setSnap(1);
		} else if (delta < -DRAG_SNAP_THRESHOLD) {
			setSnap(0);
		}
		isDraggingRef.current = false;
	};

	const onHandlePointerUp = (e: React.PointerEvent) => {
		e.currentTarget.releasePointerCapture(e.pointerId);
		finishDrag(e.clientY);
	};

	const onHandlePointerCancel = (e: React.PointerEvent) => {
		finishDrag(e.clientY);
	};

	return {
		snap,
		layoutRef,
		panelHeight,
		brainHeight,
		isContentVisible,
		handleHeight,
		openToMedium,
		onHandlePointerDown,
		onHandlePointerUp,
		onHandlePointerCancel,
	};
}
