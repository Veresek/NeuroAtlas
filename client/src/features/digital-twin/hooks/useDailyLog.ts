import { useState } from "react";

export interface DailyLog {
	sleep: number;
	coffee: number;
	mood: number;
}

export interface UseDailyLog {
	log: DailyLog;
	setSleep: (v: number) => void;
	setCoffee: (v: number) => void;
	setMood: (v: number) => void;
	isGenerating: boolean;
	generate: () => void;
}

export function useDailyLog(): UseDailyLog {
	const [sleep, setSleep] = useState(7);
	const [coffee, setCoffee] = useState(2);
	const [mood, setMood] = useState(2);
	const [isGenerating, setIsGenerating] = useState(false);

	const generate = () => {
		setIsGenerating(true);
		// TODO: call daily-log-engine and push highlight regions to BrainModel
	};

	return {
		log: { sleep, coffee, mood },
		setSleep,
		setCoffee,
		setMood,
		isGenerating,
		generate,
	};
}
