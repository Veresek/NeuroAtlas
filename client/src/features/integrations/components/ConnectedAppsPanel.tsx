import { useEffect, useRef, useState } from 'react';
import ChevronDownIcon from '@/assets/chevron-down.svg?react';
import {
	PROVIDER_DESCRIPTIONS,
	PROVIDER_LABELS,
	type ProviderId,
} from '../api/integrations';
import { useIntegrations } from '../hooks/useIntegrations';

const PROVIDER_ORDER: ProviderId[] = ['strava', 'fatsecret'];

export function ConnectedAppsPanel() {
	const {
		providers,
		loading,
		syncing,
		syncResult,
		connect,
		disconnect,
		syncToday,
	} = useIntegrations();
	const [open, setOpen] = useState(false);
	const autoSynced = useRef(false);

	const connectedCount = providers.filter(p => p.connected).length;

	useEffect(() => {
		if (autoSynced.current || loading || connectedCount === 0) return;
		autoSynced.current = true;
		void (async () => {
			await syncToday();
		})();
	}, [loading, connectedCount, syncToday]);

	let syncNote = '';
	if (syncing) {
		syncNote = 'Syncing your latest data…';
	} else if (syncResult && syncResult.failed.length > 0) {
		const names = syncResult.failed
			.map(f => PROVIDER_LABELS[f.provider as ProviderId] ?? f.provider)
			.join(', ');
		syncNote = `Sync failed for ${names}`;
	} else if (syncResult && syncResult.synced.length > 0) {
		syncNote = 'Synced just now';
	}

	return (
		<div className='px-4 pb-5 border-t border-gray-200/60 pt-2'>
			<button
				onClick={() => setOpen(o => !o)}
				className='w-full flex items-center justify-between py-2 cursor-pointer group'
				aria-expanded={open}>
				<span className='text-[11px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-700'>
					Connected Apps
				</span>
				<ChevronDownIcon
					className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
				/>
			</button>

			{open && (
				<div className='space-y-3 pb-1'>
					{PROVIDER_ORDER.map(id => {
						const status = providers.find(p => p.provider === id);
						const connected = status?.connected ?? false;
						return (
							<div
								key={id}
								className='rounded-xl border border-gray-200/70 bg-white/70 p-3'>
								<div className='flex items-center justify-between gap-2'>
									<div className='min-w-0'>
										<p className='text-[13px] font-bold text-gray-800'>
											{PROVIDER_LABELS[id]}
										</p>
										<p className='text-[11px] text-gray-500'>
											{PROVIDER_DESCRIPTIONS[id]}
										</p>
									</div>
									{connected ? (
										<button
											onClick={() => void disconnect(id)}
											className='shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors cursor-pointer'>
											Disconnect
										</button>
									) : (
										<button
											onClick={() => connect(id)}
											className='shrink-0 px-3 py-1.5 rounded-lg border-2 border-[#00aaff] text-[12px] font-bold text-[#00aaff] hover:bg-[#00aaff]/5 transition-colors cursor-pointer'>
											Connect
										</button>
									)}
								</div>
								{connected && status?.connected_at && (
									<p className='text-[10px] text-gray-400 mt-1.5'>
										Connected{' '}
										{new Date(status.connected_at).toLocaleDateString()}
									</p>
								)}
							</div>
						);
					})}

					{syncNote && (
						<p className='text-[11px] text-gray-500'>{syncNote}</p>
					)}

					<p className='text-[10px] leading-relaxed text-gray-400'>
						Data is pulled into your browser session only, encrypted on the
						server, and never shared. Revoke anytime.
					</p>
				</div>
			)}
		</div>
	);
}
