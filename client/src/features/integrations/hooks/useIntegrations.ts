import { useCallback, useEffect, useState } from 'react';
import {
	connectPath,
	disconnect as disconnectProvider,
	listProviders,
	syncNow,
	type ProviderId,
	type ProviderStatus,
	type SyncResult,
} from '../api/integrations';

export interface UseIntegrations {
	providers: ProviderStatus[];
	loading: boolean;
	syncing: boolean;
	syncResult: SyncResult | null;
	connect: (provider: ProviderId) => void;
	disconnect: (provider: ProviderId) => Promise<void>;
	refresh: () => Promise<void>;
	syncToday: () => Promise<void>;
}

export function useIntegrations(): UseIntegrations {
	const [providers, setProviders] = useState<ProviderStatus[]>([]);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

	const refresh = useCallback(async () => {
		try {
			const data = await listProviders();
			setProviders(data.providers);
		} catch (err) {
			console.error('[Integrations] Failed to load providers:', err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const data = await listProviders();
				if (!cancelled) setProviders(data.providers);
			} catch (err) {
				console.error('[Integrations] Failed to load providers:', err);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const connect = useCallback((provider: ProviderId) => {
		window.location.href = connectPath(provider);
	}, []);

	const disconnect = useCallback(
		async (provider: ProviderId) => {
			try {
				await disconnectProvider(provider);
			} catch (err) {
				console.error('[Integrations] Disconnect failed:', err);
			}
			await refresh();
		},
		[refresh],
	);

	const syncToday = useCallback(async () => {
		setSyncing(true);
		try {
			const result = await syncNow();
			setSyncResult(result);
		} catch (err) {
			console.error('[Integrations] Sync failed:', err);
			setSyncResult({ synced: [], failed: [] });
		} finally {
			setSyncing(false);
			await refresh();
		}
	}, [refresh]);

	return {
		providers,
		loading,
		syncing,
		syncResult,
		connect,
		disconnect,
		refresh,
		syncToday,
	};
}
