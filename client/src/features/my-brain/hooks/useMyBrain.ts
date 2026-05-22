import { useContext } from 'react';
import { MyBrainContext } from '../context/myBrainContext';
import type { UseMyBrainLog } from './useMyBrainLog';

export function useMyBrain(): UseMyBrainLog {
	const ctx = useContext(MyBrainContext);
	if (!ctx) {
		throw new Error('useMyBrain must be used within MyBrainProvider');
	}
	return ctx;
}
