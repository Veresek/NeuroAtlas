export type ProviderId = 'strava' | 'fatsecret';

export interface ProviderStatus {
	provider: ProviderId;
	connected: boolean;
	connected_at: string | null;
	enabled: boolean;
}

export interface Workout {
	type: string;
	duration_min: number;
	calories: number | null;
	avg_hr: number | null;
}

export interface ActivitySummary {
	steps: number | null;
	active_minutes: number | null;
	calories_burned: number | null;
	workouts: Workout[];
}

export interface NutritionSummary {
	calories: number | null;
	protein_g: number | null;
	carbs_g: number | null;
	fat_g: number | null;
	caffeine_mg: number | null;
	water_ml: number | null;
	alcohol_g: number | null;
}

export interface DailyHealthSummary {
	date: string;
	sources: string[];
	activity: ActivitySummary | null;
	nutrition: NutritionSummary | null;
}

export interface Trend {
	days: number;
	active_minutes_avg: number | null;
	calories_burned_avg: number | null;
	workouts_count: number;
	calories_intake_avg: number | null;
	protein_g_avg: number | null;
}

export interface SyncFailure {
	provider: string;
	error: string;
}

export interface SyncResult {
	synced: string[];
	failed: SyncFailure[];
}

export interface HealthResponse {
	summaries: DailyHealthSummary[];
	trend: Trend;
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
	strava: 'Strava',
	fatsecret: 'FatSecret',
};

export const PROVIDER_DESCRIPTIONS: Record<ProviderId, string> = {
	strava: 'Workouts, active minutes, calories burned',
	fatsecret: 'Meals, calories, macros',
};

export function connectPath(provider: ProviderId): string {
	// Full-page navigation (not fetch): the endpoint 302s cross-origin to the
	// provider's authorize page, which fetch cannot follow.
	return `/api/integrations/${provider}/connect`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		credentials: 'include',
		...init,
	});
	if (!response.ok) {
		const detail = await response
			.json()
			.then(data => (data as { detail?: string }).detail)
			.catch(() => undefined);
		throw new Error(detail ?? `API error (${response.status})`);
	}
	return (await response.json()) as T;
}

export function listProviders(): Promise<{ providers: ProviderStatus[] }> {
	return request('/api/integrations');
}

export function disconnect(provider: ProviderId): Promise<{ ok: boolean }> {
	return request(`/api/integrations/${provider}/disconnect`, {
		method: 'POST',
	});
}

export function setEnabled(
	provider: ProviderId,
	enabled: boolean,
): Promise<{ ok: boolean; enabled: boolean }> {
	return request(`/api/integrations/${provider}/toggle`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ enabled }),
	});
}

export function syncNow(from?: string, to?: string): Promise<SyncResult> {
	const params = new URLSearchParams();
	if (from) params.set('from', from);
	if (to) params.set('to', to);
	const query = params.toString();
	return request(`/api/integrations/sync${query ? `?${query}` : ''}`, {
		method: 'POST',
	});
}

export function fetchHealth(from: string, to: string): Promise<HealthResponse> {
	const params = new URLSearchParams({ from, to });
	return request(`/api/me/health?${params.toString()}`);
}
