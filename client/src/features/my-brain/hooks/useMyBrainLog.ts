import { useState } from "react";
import { analyzeDailyLog, type DailyLogAnalysis } from "../api/analyzeDailyLog";

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
	analysis: DailyLogAnalysis | null;
	error: string | null;
	generate: () => Promise<void>;
}

export function useMyBrainLog(): UseMyBrainLog {
	const [sleep, setSleep] = useState(7);
	const [coffee, setCoffee] = useState(2);
	const [mood, setMood] = useState(2);
	const [isGenerating, setIsGenerating] = useState(false);
	const [analysis, setAnalysis] = useState<DailyLogAnalysis | null>(null);
	const [error, setError] = useState<string | null>(null);

	const generate = async () => {
		const log = { sleep, coffee, mood };
		setIsGenerating(true);
		setError(null);
		setAnalysis(null);

		try {
			const result = await analyzeDailyLog(log);
			setAnalysis(result);
		} catch (err) {
			console.error("[MyBrain] Analysis generation failed:", err);
			setError(err instanceof Error ? err.message : "Failed to generate analysis.");
		} finally {
			setIsGenerating(false);
		}
	};

	return {
		log: { sleep, coffee, mood },
		setSleep,
		setCoffee,
		setMood,
		isGenerating,
		analysis,
		error,
		generate,
	};
}
