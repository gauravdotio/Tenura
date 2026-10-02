import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import confetti from 'canvas-confetti';
import type { AuthUser } from './AuthContext';
import { useToast } from './ToastContext';
import { supabase } from '../lib/supabase';
import type { FinanceRepository } from '../lib/data/repository';
import { LocalRepository, MemoryRepository } from '../lib/data/localRepository';
import { SupabaseRepository } from '../lib/data/supabaseRepository';
import { applyMutation, type Mutation } from '../lib/finance/mutations';
import {
  EMPTY_DATA,
  type Expense,
  type FinanceData,
  type Installment,
  type Liability,
  type Member,
  type MemberScope,
  type Policy,
} from '../lib/finance/types';
import {
  buildInstallments,
  groupInstallments,
  hasPlan,
  nextPremiumDateAfterPayment,
  scopeData,
  summarize,
  type Summary,
} from '../lib/finance/calc';
import { buildSampleData, newId, primaryMember } from '../lib/finance/sample';
import { toISODate } from '../lib/finance/dates';

type Status = 'loading' | 'ready' | 'error';

/** How a saved liability's repayment plan should change. */
export type PlanChange = 'regenerate' | 'remove' | 'keep';

interface FinanceContextValue {
  status: Status;
  retry(): void;
  storage: FinanceRepository['kind'];

  /** Everything in the household. */
  data: FinanceData;
  /** Filtered to the selected member (or everything for 'all'). */
  scoped: FinanceData;
  summary: Summary;
  scope: MemberScope;
  setScope(scope: MemberScope): void;
  installmentsByLiability: Map<string, Installment[]>;
  memberMap: Map<string, Member>;
  primary: Member | undefined;

  saveMember(member: Member): Promise<void>;
  removeMember(id: string, reassignTo: string): Promise<void>;

  saveLiability(liability: Liability, plan: PlanChange): Promise<void>;
  removeLiability(id: string): Promise<void>;
  convertToEmi(id: string, plan: { emiAmount: number; tenureMonths: number; interestRate: number; startMonth: string }): Promise<void>;
  setInstallmentPaid(installment: Installment, paid: boolean): Promise<void>;
  markCardPaid(id: string): Promise<void>;

  saveExpense(expense: Expense): Promise<void>;
  removeExpense(id: string): Promise<void>;

  savePolicy(policy: Policy): Promise<void>;
  removePolicy(id: string): Promise<void>;
  payPremium(id: string): Promise<void>;

  replaceData(data: FinanceData): Promise<void>;
  loadSampleData(): Promise<void>;
  clearAllData(): Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | null>(null);

function repositoryFor(user: AuthUser): FinanceRepository {
  if (user.mode === 'demo') return new MemoryRepository(buildSampleData(user.name));
  if (user.mode === 'supabase' && supabase) return new SupabaseRepository(supabase);
  return new LocalRepository(user.id);
}

const celebrate = () =>
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 }, disableForReducedMotion: true });

/**
 * Owns one user's household data. Mount it with `key={user.id}` so signing out
 * or switching accounts throws away all in-memory state.
 */
export function FinanceProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  const toast = useToast();
  // The provider is keyed by user id, so the repository is fixed for its lifetime
  const [repo] = useState(() => repositoryFor(user));
  const nameRef = useRef(user.name);
  useLayoutEffect(() => {
    nameRef.current = user.name;
  }, [user.name]);
  const [data, setData] = useState<FinanceData>(EMPTY_DATA);
  // Actions read the latest data through a ref so their identities stay stable
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, setAttempt] = useState(0);

  const scopeKey = `tenura:v4:scope:${user.id}`;
  const [storedScope, setScopeState] = useState<MemberScope>(() => {
    try {
      return localStorage.getItem(scopeKey) || 'all';
    } catch {
      return 'all';
    }
  });
  const setScope = useCallback(
    (s: MemberScope) => {
      setScopeState(s);
      if (user.mode === 'demo') return; // the demo leaves nothing behind in the browser
      try {
        localStorage.setItem(scopeKey, s);
      } catch {
        /* private mode */
      }
    },
    [scopeKey, user.mode],
  );

  // Load (and make sure the household has its primary member)
  useEffect(() => {
    let cancelled = false;
    repo
      .load()
      .then(async (loaded) => {
        let next = loaded;
        if (!next.members.some((m) => m.isPrimary)) {
          const self = primaryMember(nameRef.current);
          await repo.apply({ type: 'member/upsert', member: self });
          next = applyMutation(next, { type: 'member/upsert', member: self });
        }
        if (cancelled) return;
        setData(next);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load data', err);
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [repo, attempt]);

  // A deleted member may still be the stored scope — fall back to the whole household
  const scope: MemberScope =
    storedScope === 'all' || data.members.some((m) => m.id === storedScope) ? storedScope : 'all';

  /** Optimistic update, then persist. On failure, resync from the source of truth. */
  const dispatch = useCallback(
    async (...mutations: Mutation[]) => {
      setData((d) => mutations.reduce(applyMutation, d));
      try {
        for (const m of mutations) await repo.apply(m);
      } catch (err) {
        console.error('Save failed', err);
        toast.error(err instanceof Error && err.message ? `Couldn't save: ${err.message}` : "Couldn't save your change.");
        repo.load().then(setData).catch(() => setStatus('error'));
        throw err;
      }
    },
    [repo, toast],
  );

  // ---- members -------------------------------------------------------------

  const saveMember = useCallback((member: Member) => dispatch({ type: 'member/upsert', member }), [dispatch]);
  const removeMember = useCallback(
    (id: string, reassignTo: string) => dispatch({ type: 'member/remove', id, reassignTo }),
    [dispatch],
  );

  // ---- liabilities ---------------------------------------------------------

  const saveLiability = useCallback(
    (liability: Liability, plan: PlanChange) => {
      if (plan === 'keep') return dispatch({ type: 'liability/upsert', liability });
      if (plan === 'remove' || !hasPlan(liability)) {
        return dispatch({ type: 'liability/upsert', liability, installments: null });
      }
      // Keep payments already recorded for months that still exist in the new plan
      const previous = new Map(
        dataRef.current.installments.filter((i) => i.liabilityId === liability.id && i.paidOn).map((i) => [i.seq, i.paidOn]),
      );
      const installments = buildInstallments(
        liability.id,
        liability.emiAmount!,
        liability.tenureMonths!,
        liability.startMonth ?? toISODate(new Date()).slice(0, 7),
        newId,
      ).map((i) => ({ ...i, paidOn: previous.get(i.seq) }));
      return dispatch({ type: 'liability/upsert', liability, installments });
    },
    [dispatch],
  );

  const removeLiability = useCallback((id: string) => dispatch({ type: 'liability/remove', id }), [dispatch]);

  const convertToEmi = useCallback<FinanceContextValue['convertToEmi']>(
    async (id, plan) => {
      const l = dataRef.current.liabilities.find((x) => x.id === id);
      if (!l) return;
      await saveLiability({ ...l, ...plan, status: 'converted' }, 'regenerate');
    },
    [saveLiability],
  );

  const setInstallmentPaid = useCallback(
    async (inst: Installment, paid: boolean) => {
      const { liabilities, installments } = dataRef.current;
      const liability = liabilities.find((l) => l.id === inst.liabilityId);
      const mutations: Mutation[] = [{ type: 'installment/setPaid', id: inst.id, paidOn: paid ? toISODate(new Date()) : null }];

      const plan = installments.filter((i) => i.liabilityId === inst.liabilityId);
      const allPaidAfter = plan.every((i) => (i.id === inst.id ? paid : Boolean(i.paidOn)));
      if (liability && allPaidAfter && liability.status !== 'closed') {
        mutations.push({ type: 'liability/upsert', liability: { ...liability, status: 'closed' } });
      } else if (liability && !paid && liability.status === 'closed') {
        // Un-marking a payment re-opens the plan
        const reopened = liability.kind === 'credit_card' ? 'converted' : 'active';
        mutations.push({ type: 'liability/upsert', liability: { ...liability, status: reopened } });
      }
      await dispatch(...mutations);
      if (liability && allPaidAfter && paid) {
        celebrate();
        toast.success(`${liability.provider} is fully paid off 🎉`);
      }
    },
    [dispatch, toast],
  );

  const markCardPaid = useCallback(
    async (id: string) => {
      const l = dataRef.current.liabilities.find((x) => x.id === id);
      if (!l) return;
      await dispatch({ type: 'liability/upsert', liability: { ...l, balance: 0 } });
      toast.success(`${l.provider} bill marked as paid`, {
        label: 'Undo',
        onClick: () => void dispatch({ type: 'liability/upsert', liability: l }),
      });
    },
    [dispatch, toast],
  );

  // ---- expenses & policies -------------------------------------------------

  const saveExpense = useCallback((expense: Expense) => dispatch({ type: 'expense/upsert', expense }), [dispatch]);
  const removeExpense = useCallback(
    async (id: string) => {
      const removed = dataRef.current.expenses.find((e) => e.id === id);
      await dispatch({ type: 'expense/remove', id });
      if (removed) {
        toast.success('Expense deleted', {
          label: 'Undo',
          onClick: () => void dispatch({ type: 'expense/upsert', expense: removed }),
        });
      }
    },
    [dispatch, toast],
  );

  const savePolicy = useCallback((policy: Policy) => dispatch({ type: 'policy/upsert', policy }), [dispatch]);
  const removePolicy = useCallback((id: string) => dispatch({ type: 'policy/remove', id }), [dispatch]);
  const payPremium = useCallback(
    async (id: string) => {
      const p = dataRef.current.policies.find((x) => x.id === id);
      if (!p) return;
      const nextDueDate = nextPremiumDateAfterPayment(p);
      await dispatch({ type: 'policy/upsert', policy: { ...p, nextDueDate } });
      toast.success(`Premium recorded${nextDueDate ? ` — next due ${nextDueDate}` : ''}`, {
        label: 'Undo',
        onClick: () => void dispatch({ type: 'policy/upsert', policy: p }),
      });
    },
    [dispatch, toast],
  );

  // ---- whole-household operations ------------------------------------------

  const replaceData = useCallback((next: FinanceData) => dispatch({ type: 'data/replace', data: next }), [dispatch]);

  const loadSampleData = useCallback(async () => {
    const sample = buildSampleData(dataRef.current.members.find((m) => m.isPrimary)?.name ?? user.name);
    // Keep the existing primary member's id and settings
    const primary = dataRef.current.members.find((m) => m.isPrimary);
    if (primary) {
      const sampleSelf = sample.members[0];
      const swap = <T extends { memberId: string }>(x: T) => (x.memberId === sampleSelf.id ? { ...x, memberId: primary.id } : x);
      sample.members[0] = primary;
      sample.liabilities = sample.liabilities.map(swap);
      sample.expenses = sample.expenses.map(swap);
      sample.policies = sample.policies.map(swap);
    }
    await replaceData(sample);
  }, [replaceData, user.name]);

  const clearAllData = useCallback(async () => {
    const primary = dataRef.current.members.find((m) => m.isPrimary) ?? primaryMember(user.name);
    await replaceData({ ...EMPTY_DATA, members: [primary] });
    setScope('all');
  }, [replaceData, user.name, setScope]);

  // ---- derived -------------------------------------------------------------

  const scoped = useMemo(() => scopeData(data, scope), [data, scope]);
  const summary = useMemo(() => summarize(scoped), [scoped]);
  const installmentsByLiability = useMemo(() => groupInstallments(data.installments), [data.installments]);
  const memberMap = useMemo(() => new Map(data.members.map((m) => [m.id, m])), [data.members]);
  const primary = useMemo(() => data.members.find((m) => m.isPrimary), [data.members]);
  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  }, []);

  const value: FinanceContextValue = {
    status, retry, storage: repo.kind,
    data, scoped, summary, scope, setScope, installmentsByLiability, memberMap, primary,
    saveMember, removeMember,
    saveLiability, removeLiability, convertToEmi, setInstallmentPaid, markCardPaid,
    saveExpense, removeExpense,
    savePolicy, removePolicy, payPremium,
    replaceData, loadSampleData, clearAllData,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside <FinanceProvider>');
  return ctx;
}
