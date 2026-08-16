import { useState, useEffect } from "react";

export interface ActiveNeurotransmitterInfo {
	name: string;
	mechanism?: string;
	description?: string;
	substanceName?: string;
	phaseName?: string;
	isLocked?: boolean;
}

type NtListener = (nt: ActiveNeurotransmitterInfo | null) => void;
const listeners = new Set<NtListener>();
let currentNt: ActiveNeurotransmitterInfo | null = null;

export const setActiveNeurotransmitter = (nt: ActiveNeurotransmitterInfo | null) => {
	currentNt = nt;
	listeners.forEach(l => l(nt));
};

export const clearActiveNeurotransmitter = () => {
	currentNt = null;
	listeners.forEach(l => l(null));
};

export const useActiveNeurotransmitter = () => {
	const [activeNt, setActiveNtState] = useState<ActiveNeurotransmitterInfo | null>(currentNt);

	useEffect(() => {
		const listener: NtListener = (nt) => setActiveNtState(nt);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, []);

	return {
		activeNt,
		setActiveNeurotransmitter,
		clearActiveNeurotransmitter,
	};
};
