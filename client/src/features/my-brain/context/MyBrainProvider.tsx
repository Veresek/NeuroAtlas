import type { ReactNode } from 'react';
import { useMyBrainLog } from '../hooks/useMyBrainLog';
import { MyBrainContext } from './myBrainContext';

export function MyBrainProvider({ children }: { children: ReactNode }) {
	const value = useMyBrainLog();
	return (
		<MyBrainContext.Provider value={value}>{children}</MyBrainContext.Provider>
	);
}