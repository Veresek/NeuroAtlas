import { brainSections, type BrainSectionName } from '@/data/brainSections';
import type { BrainSectionEffectType } from '@/types/brain';
import type { MyBrainLog } from '../hooks/useMyBrainLog';

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

const EFFECT_TYPES: BrainSectionEffectType[] = [
	'stimulates',
	'depresses',
	'damages',
	'modulates',
];


interface GeminiResponse {
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
	const response = await fetch('/api/my-brain/analyze', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(log),
	});

	const data = (await response.json().catch(() => ({}))) as GeminiResponse;

	if (!response.ok) {
		const message =
			(data as unknown as { detail?: string }).detail ??
			data.error?.message ??
			`API error (${response.status})`;
		const err = new Error(message);
		if (isRetryableGeminiFailure(message, response.status)) {
			(err as Error & { retryable?: boolean }).retryable = true;
		}
		throw err;
	}

	return parseAnalysisJson(JSON.stringify(data));
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
