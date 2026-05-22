import { brainSections, type BrainSectionName } from '@/data/brainSections';
import type { BrainSectionEffectType } from '@/types/brain';
import type { MyBrainLog } from '../hooks/useMyBrainLog';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL ?? '';

const MOOD_LABELS = ['Awful', 'Bad', 'Neutral', 'Good', 'Great'] as const;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 800;

const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

const RETRYABLE_MESSAGE =
	/internal error|temporarily unavailable|overloaded|try again|resource exhausted|deadline exceeded|high demand/i;

export interface AffectedBrainSection {
	section: BrainSectionName;
	effectType: BrainSectionEffectType;
}

export interface DailyLogAnalysis {
	message: string;
	affectedSections: AffectedBrainSection[];
}

const BRAIN_SECTION_NAMES = Object.keys(brainSections) as BrainSectionName[];

const EFFECT_TYPES: BrainSectionEffectType[] = [
	'stimulates',
	'depresses',
	'damages',
	'modulates',
];

const RESPONSE_SCHEMA = {
	type: 'object',
	properties: {
		message: {
			type: 'string',
			description:
				'2–4 short paragraphs of expert neuro analysis in plain text.',
		},
		affectedSections: {
			type: 'array',
			description:
				'Brain atlas sections materially influenced by today’s sleep, caffeine, and mood.',
			items: {
				type: 'object',
				properties: {
					section: {
						type: 'string',
						enum: BRAIN_SECTION_NAMES,
						description: 'Exact NeuroAtlas section name.',
					},
					effectType: {
						type: 'string',
						enum: EFFECT_TYPES,
						description:
							'How today’s factors affect this section: stimulates, depresses, damages, or modulates.',
					},
				},
				required: ['section', 'effectType'],
			},
		},
	},
	required: ['message', 'affectedSections'],
};

const SYSTEM_INSTRUCTION = `You are an expert neurobiologist and neurochemist writing for NeuroAtlas.

Return JSON matching the schema only.

Field rules:
- message: 2–3 short paragraphs. Explain how today's lifestyle factors likely affected mind and brain: relevant regions, neurotransmitters (e.g. adenosine, dopamine, cortisol, serotonin), cognition and mood. Do not greet the user or repeat their raw inputs.
- affectedSections: 1–6 entries. Pick section names only from the allowed enum. Assign effectType per NeuroAtlas conventions:
  - stimulates: increased activity, alertness, or engagement
  - depresses: reduced activity, inhibition, or fatigue-related dampening
  - damages: stress-related harm, overload, or impaired function from poor inputs
  - modulates: mixed, context-dependent, or balancing influence
- Accessible language for a curious non-specialist. No medical diagnoses or treatment advice.`;

function buildUserMessage(log: MyBrainLog): string {
	const moodLabel = MOOD_LABELS[log.mood] ?? 'Unknown';
	return `Analyze today's log.

sleep_hours=${log.sleep}
coffee_cups=${log.coffee}
mood_label=${moodLabel}`;
}

interface GeminiResponse {
	candidates?: Array<{
		content?: { parts?: Array<{ text?: string }> };
	}>;
	error?: { message?: string };
}

function isBrainSectionEffectType(
	value: unknown,
): value is BrainSectionEffectType {
	return (
		typeof value === 'string' &&
		(EFFECT_TYPES as readonly string[]).includes(value)
	);
}

function isBrainSectionName(value: unknown): value is BrainSectionName {
	return typeof value === 'string' && value in brainSections;
}

function parseAnalysisJson(text: string): DailyLogAnalysis {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('Invalid JSON in analysis response.');
	}

	if (!data || typeof data !== 'object') {
		throw new Error('Analysis response is not a JSON object.');
	}

	const { message, affectedSections } = data as Record<string, unknown>;

	if (typeof message !== 'string' || !message.trim()) {
		throw new Error('Analysis response is missing a valid message.');
	}

	if (!Array.isArray(affectedSections)) {
		throw new Error('Analysis response is missing affectedSections.');
	}

	const parsedSections: AffectedBrainSection[] = [];
	for (const entry of affectedSections) {
		if (!entry || typeof entry !== 'object') continue;
		const { section, effectType } = entry as Record<string, unknown>;
		if (!isBrainSectionName(section) || !isBrainSectionEffectType(effectType)) {
			continue;
		}
		parsedSections.push({ section, effectType });
	}

	return {
		message: message.trim(),
		affectedSections: parsedSections,
	};
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableGeminiFailure(message: string, status?: number): boolean {
	if (status !== undefined && RETRYABLE_HTTP_STATUSES.has(status)) {
		return true;
	}
	return RETRYABLE_MESSAGE.test(message);
}

async function requestGeminiAnalysis(log: MyBrainLog): Promise<DailyLogAnalysis> {
	const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

	const response = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			systemInstruction: {
				parts: [{ text: SYSTEM_INSTRUCTION }],
			},
			contents: [{ parts: [{ text: buildUserMessage(log) }] }],
			generationConfig: {
				temperature: 0.7,
				responseMimeType: 'application/json',
				responseSchema: RESPONSE_SCHEMA,
			},
		}),
	});

	const data = (await response.json()) as GeminiResponse;

	if (!response.ok) {
		const message =
			data.error?.message ?? `Gemini API error (${response.status})`;
		const err = new Error(message);
		if (isRetryableGeminiFailure(message, response.status)) {
			(err as Error & { retryable?: boolean }).retryable = true;
		}
		throw err;
	}

	const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
	if (!text) {
		throw new Error('No analysis returned from Gemini.');
	}

	return parseAnalysisJson(text);
}

function isRetryableError(err: unknown): boolean {
	if (err instanceof TypeError) return true;
	if (!(err instanceof Error)) return false;
	if ((err as Error & { retryable?: boolean }).retryable) return true;
	return isRetryableGeminiFailure(err.message);
}

export async function analyzeDailyLog(
	log: MyBrainLog,
): Promise<DailyLogAnalysis> {
	if (!GEMINI_API_KEY.trim()) {
		throw new Error('Gemini API key is not configured.');
	}
	if (!GEMINI_MODEL.trim()) {
		throw new Error('Gemini model is not configured.');
	}

	let lastError: Error | null = null;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
		if (attempt > 1) {
			console.warn(
				`[MyBrain] Retrying Gemini request (attempt ${attempt}/${MAX_ATTEMPTS})…`,
			);
			await delay(RETRY_DELAY_MS * (attempt - 1));
		}

		try {
			return await requestGeminiAnalysis(log);
		} catch (err) {
			lastError =
				err instanceof Error ? err : new Error('Failed to generate analysis.');

			const canRetry = attempt < MAX_ATTEMPTS && isRetryableError(lastError);
			if (!canRetry) {
				throw lastError;
			}

			console.warn(
				`[MyBrain] Transient Gemini error (attempt ${attempt}/${MAX_ATTEMPTS}):`,
				lastError.message,
			);
		}
	}

	throw lastError ?? new Error('Failed to generate analysis.');
}
