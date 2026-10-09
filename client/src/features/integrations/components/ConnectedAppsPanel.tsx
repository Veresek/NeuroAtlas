import { useEffect, useRef, useState } from 'react';
import CloseIcon from '@/assets/close.svg?react';
import PlusIcon from '@/assets/plus.svg?react';
import {
	PROVIDER_DESCRIPTIONS,
	PROVIDER_LABELS,
	type ProviderId,
	type ProviderStatus,
} from '../api/integrations';
import { useIntegrations } from '../hooks/useIntegrations';

const PROVIDER_ORDER: ProviderId[] = ['strava', 'fatsecret'];

function Switch({
	checked,
	disabled,
	onToggle,
	label,
}: {
	checked: boolean;
	disabled: boolean;
	onToggle: () => void;
	label: string;
}) {
	return (
		<button
			role='switch'
			aria-checked={checked}
			aria-label={`${label}: ${checked ? 'enabled' : 'disabled'}`}
			disabled={disabled}
			onClick={onToggle}
			className={`relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed ${
				checked ? 'bg-[#00aaff]' : 'bg-gray-300'
			}`}>
			<span
				aria-hidden
				className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
					checked ? 'translate-x-4' : 'translate-x-0'
				}`}
			/>
		</button>
	);
}

export function ConnectedAppsPanel() {
	const {
		providers,
		loading,
		syncing,
		syncResult,
		connect,
		disconnect,
		toggle,
		syncToday,
	} = useIntegrations();
	const [menuOpen, setMenuOpen] = useState(false);
	const [confirming, setConfirming] = useState<ProviderId | null>(null);
	const menuRef = useRef<HTMLDivElement | null>(null);
	const autoSynced = useRef(false);

	const connected = providers.filter(p => p.connected);
	const available = PROVIDER_ORDER.filter(
		id => !providers.find(p => p.provider === id)?.connected,
	);
	const connectedCount = connected.length;

	useEffect(() => {
		if (autoSynced.current || loading || connectedCount === 0) return;
		autoSynced.current = true;
		void (async () => {
			await syncToday();
		})();
	}, [loading, connectedCount, syncToday]);

	useEffect(() => {
		if (!menuOpen) return;
		const onPointerDown = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', onPointerDown);
		return () => document.removeEventListener('mousedown', onPointerDown);
	}, [menuOpen]);

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
		<div className='px-4 pt-4 pb-5 flex flex-col gap-3'>
			<div ref={menuRef} className='relative'>
				<button
					onClick={() => setMenuOpen(o => !o)}
					disabled={available.length === 0}
					aria-haspopup='menu'
					aria-expanded={menuOpen}
					className='w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-2.5 text-[13px] font-semibold text-gray-500 hover:border-[#00aaff] hover:text-[#00aaff] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-gray-300 disabled:hover:text-gray-500'>
					<PlusIcon className='w-4 h-4' />
					{available.length === 0
						? 'All apps connected'
						: 'Connect app'}
				</button>

				{menuOpen && available.length > 0 && (
					<div
						role='menu'
						className='absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden'>
						{available.map(id => (
							<button
								key={id}
								role='menuitem'
								onClick={() => {
									setMenuOpen(false);
									connect(id);
								}}
								className='w-full px-3 py-2.5 text-left hover:bg-gray-50 cursor-pointer'>
								<p className='text-[13px] font-bold text-gray-800'>
									{PROVIDER_LABELS[id]}
								</p>
								<p className='text-[11px] text-gray-500'>
									{PROVIDER_DESCRIPTIONS[id]}
								</p>
							</button>
						))}
					</div>
				)}
			</div>

			{connected.map((status: ProviderStatus) => {
				const id = status.provider;
				const label = PROVIDER_LABELS[id];
				return (
					<div
						key={id}
						className={`rounded-xl border border-gray-200/70 bg-white/70 p-3 transition-opacity ${
							status.enabled ? '' : 'opacity-60'
						}`}>
						{confirming === id ? (
							<div>
								<p className='text-[12px] font-bold text-gray-800'>
									Disconnect {label}?
								</p>
								<p className='text-[11px] text-gray-500 leading-relaxed mt-1'>
									This revokes {label} access and permanently deletes
									the data it contributed. You can reconnect later.
								</p>
								<div className='flex justify-end gap-2 mt-2.5'>
									<button
										onClick={() => setConfirming(null)}
										className='px-3 py-1.5 rounded-lg text-[12px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer'>
										Cancel
									</button>
									<button
										onClick={() => {
											setConfirming(null);
											void disconnect(id);
										}}
										className='px-3 py-1.5 rounded-lg bg-red-500 text-white text-[12px] font-bold hover:bg-red-600 transition-colors cursor-pointer'>
										Disconnect
									</button>
								</div>
							</div>
						) : (
							<div className='flex items-center justify-between gap-2'>
								<div className='min-w-0'>
									<p className='text-[13px] font-bold text-gray-800'>
										{label}
									</p>
									<p className='text-[11px] text-gray-500'>
										{PROVIDER_DESCRIPTIONS[id]}
									</p>
								</div>
								<div className='flex items-center gap-2 shrink-0'>
									<Switch
										checked={status.enabled}
										disabled={syncing}
										label={label}
										onToggle={() =>
											void toggle(id, !status.enabled)
										}
									/>
									<button
										aria-label={`Disconnect ${label}`}
										onClick={() => setConfirming(id)}
										className='p-1 rounded-md text-red-500 hover:bg-red-50 transition-colors cursor-pointer'>
										<CloseIcon className='w-3.5 h-3.5' />
									</button>
								</div>
							</div>
						)}
					</div>
				);
			})}

			{syncNote && <p className='text-[11px] text-gray-500'>{syncNote}</p>}

			<p className='text-[10px] leading-relaxed text-gray-400'>
				Data is pulled into your browser session only, encrypted on the
				server, and never shared. Revoke anytime.
			</p>
		</div>
	);
}
