import { createContext, useContext } from 'react';
import type { Expense, Income, Investment, Liability, Member, Policy } from '../lib/finance/types';

export type Dialog =
  | { type: 'liability'; liability?: Liability }
  | { type: 'convert'; liability: Liability }
  | { type: 'expense'; expense?: Expense }
  | { type: 'policy'; policy?: Policy }
  | { type: 'member'; member?: Member }
  | { type: 'income'; income?: Income }
  | { type: 'investment'; investment?: Investment };

export const DialogContext = createContext<((d: Dialog) => void) | null>(null);

/** Opens one of the app-wide add/edit dialogs. */
export function useOpenDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useOpenDialog must be used inside the app shell');
  return ctx;
}
