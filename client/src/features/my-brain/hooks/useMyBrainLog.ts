import { useState } from "react";
import { analyzeDailyLog, type DailyLogAnalysis } from "../api/analyzeDailyLog";

export interface MyBrainLog {
	note: string;
}

export interface UseMyBrainLog {
	log: MyBrainLog;
	setNote: (v: string) => void;
	isGenerating: boolean;
	analysis: DailyLogAnalysis | null;
	error: string | null;
	generate: () => Promise<void>;
}

export function useMyBrainLog(): UseMyBrainLog {
	const [note, setNote] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [analysis, setAnalysis] = useState<DailyLogAnalysis | null>(null);
	const [error, setError] = useState<string | null>(null);

	const generate = async () => {
		const log = { note };
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
		log: { note },
		setNote,
		isGenerating,
		analysis,
		error,
		generate,
	};
}
