import { useState } from "react";

export interface MyBrainLog {
	sleep: number;
	coffee: number;
	mood: number;
}

export interface UseMyBrainLog {
	log: MyBrainLog;
	setSleep: (v: number) => void;
	setCoffee: (v: number) => void;
	setMood: (v: number) => void;
	isGenerating: boolean;
	generate: () => void;
}

export function useMyBrainLog(): UseMyBrainLog {
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
