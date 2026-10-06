import type { Expense, FinanceData, Income, Installment, Investment, Liability, Member, Policy } from './types';

/**
 * Every change to a household's data is one of these. The UI applies a mutation
 * to its in-memory state optimistically and hands the same object to the active
 * repository, which persists it (localStorage, or Supabase tables).
 */
export type Mutation =
  | { type: 'member/upsert'; member: Member }
  | { type: 'member/remove'; id: string; reassignTo: string }
  | {
      type: 'liability/upsert';
      liability: Liability;
      /** New repayment plan. `null` removes the plan; omitted keeps the current one. */
      installments?: Installment[] | null;
    }
  | { type: 'liability/remove'; id: string }
  | { type: 'installment/setPaid'; id: string; paidOn: string | null }
  | { type: 'expense/upsert'; expense: Expense }
  | { type: 'expense/remove'; id: string }
  | { type: 'policy/upsert'; policy: Policy }
  | { type: 'policy/remove'; id: string }
  | { type: 'income/upsert'; income: Income }
  | { type: 'income/remove'; id: string }
  | { type: 'investment/upsert'; investment: Investment }
  | { type: 'investment/remove'; id: string }
  | { type: 'data/replace'; data: FinanceData };

function upsert<T extends { id: string }>(list: T[], item: T, prepend = false): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i === -1) return prepend ? [item, ...list] : [...list, item];
  const next = list.slice();
  next[i] = item;
  return next;
}

export function applyMutation(data: FinanceData, m: Mutation): FinanceData {
  switch (m.type) {
    case 'member/upsert':
      return { ...data, members: upsert(data.members, m.member) };

    case 'member/remove': {
      const move = <T extends { memberId: string }>(x: T): T =>
        x.memberId === m.id ? { ...x, memberId: m.reassignTo } : x;
      return {
        ...data,
        members: data.members.filter((x) => x.id !== m.id),
        liabilities: data.liabilities.map(move),
        expenses: data.expenses.map(move),
        policies: data.policies.map(move),
        incomes: data.incomes.map(move),
        investments: data.investments.map(move),
      };
    }

    case 'liability/upsert': {
      const liabilities = upsert(data.liabilities, m.liability, true);
      if (m.installments === undefined) return { ...data, liabilities };
      const others = data.installments.filter((i) => i.liabilityId !== m.liability.id);
      return { ...data, liabilities, installments: m.installments ? [...others, ...m.installments] : others };
    }

    case 'liability/remove':
      return {
        ...data,
        liabilities: data.liabilities.filter((l) => l.id !== m.id),
        installments: data.installments.filter((i) => i.liabilityId !== m.id),
      };

    case 'installment/setPaid':
      return {
        ...data,
        installments: data.installments.map((i) =>
          i.id === m.id ? { ...i, paidOn: m.paidOn ?? undefined } : i,
        ),
      };

    case 'expense/upsert':
      return { ...data, expenses: upsert(data.expenses, m.expense, true) };
    case 'expense/remove':
      return { ...data, expenses: data.expenses.filter((e) => e.id !== m.id) };

    case 'policy/upsert':
      return { ...data, policies: upsert(data.policies, m.policy, true) };
    case 'policy/remove':
      return { ...data, policies: data.policies.filter((p) => p.id !== m.id) };

    case 'income/upsert':
      return { ...data, incomes: upsert(data.incomes, m.income, true) };
    case 'income/remove':
      return { ...data, incomes: data.incomes.filter((x) => x.id !== m.id) };

    case 'investment/upsert':
      return { ...data, investments: upsert(data.investments, m.investment, true) };
    case 'investment/remove':
      return { ...data, investments: data.investments.filter((x) => x.id !== m.id) };

    case 'data/replace':
      return m.data;
  }
}
