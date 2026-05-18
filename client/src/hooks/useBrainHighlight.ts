import { useState, useEffect } from "react";

type HighlightTarget = string | string[] | null;
type HighlightListener = (area: HighlightTarget) => void;
const listeners = new Set<HighlightListener>();
let currentHighlight: HighlightTarget = null;

export const setBrainHighlight = (area: HighlightTarget) => {
	currentHighlight = area;
	listeners.forEach(l => l(area));
};

export const useBrainHighlight = () => {
	const [highlightedArea, setHighlightedArea] = useState<HighlightTarget>(currentHighlight);

	useEffect(() => {
		const listener: HighlightListener = (area) => setHighlightedArea(area);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return { highlightedArea, setBrainHighlight };
};
