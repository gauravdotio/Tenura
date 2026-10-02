import type { FinanceData } from '../finance/types';
import type { Mutation } from '../finance/mutations';

/** Where a household's data lives. One instance per signed-in user. */
export interface FinanceRepository {
  readonly kind: 'local' | 'demo' | 'supabase';
  load(): Promise<FinanceData>;
  apply(mutation: Mutation): Promise<void>;
}
