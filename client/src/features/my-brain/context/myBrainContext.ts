import { createContext } from 'react';
import type { UseMyBrainLog } from '../hooks/useMyBrainLog';

export const MyBrainContext = createContext<UseMyBrainLog | null>(null);
