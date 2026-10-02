import type { FinanceData } from '../finance/types';
import { EMPTY_DATA } from '../finance/types';
import { applyMutation, type Mutation } from '../finance/mutations';
import type { FinanceRepository } from './repository';

const keyFor = (userId: string) => `tenura:v4:data:${userId}`;

/**
 * Keeps one user's household in localStorage under a key that includes their id,
 * so nothing is shared between accounts on the same browser.
 */
export class LocalRepository implements FinanceRepository {
  readonly kind = 'local';
  private data: FinanceData = EMPTY_DATA;
  private readonly key: string;

  constructor(userId: string) {
    this.key = keyFor(userId);
  }

  async load(): Promise<FinanceData> {
    try {
      const raw = localStorage.getItem(this.key);
      this.data = raw ? { ...EMPTY_DATA, ...(JSON.parse(raw) as FinanceData) } : EMPTY_DATA;
    } catch {
      this.data = EMPTY_DATA;
    }
    return this.data;
  }

  async apply(mutation: Mutation): Promise<void> {
    this.data = applyMutation(this.data, mutation);
    localStorage.setItem(this.key, JSON.stringify(this.data));
  }

  static remove(userId: string) {
    localStorage.removeItem(keyFor(userId));
  }
}

/** The demo account: lives in memory only and is gone on sign-out or reload. */
export class MemoryRepository implements FinanceRepository {
  readonly kind = 'demo';
  private data: FinanceData;

  constructor(initial: FinanceData) {
    this.data = initial;
  }

  async load() {
    return this.data;
  }

  async apply(mutation: Mutation) {
    this.data = applyMutation(this.data, mutation);
  }
}
