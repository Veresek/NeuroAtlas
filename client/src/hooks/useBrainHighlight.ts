import { useState, useEffect } from "react";

type HighlightListener = (area: string | null) => void;
const listeners = new Set<HighlightListener>();
let currentHighlight: string | null = null;

export const setBrainHighlight = (area: string | null) => {
	currentHighlight = area;
	listeners.forEach(l => l(area));
};

export const useBrainHighlight = () => {
	const [highlightedArea, setHighlightedArea] = useState<string | null>(currentHighlight);

	useEffect(() => {
		const listener: HighlightListener = (area) => setHighlightedArea(area);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return { highlightedArea, setBrainHighlight };
};
