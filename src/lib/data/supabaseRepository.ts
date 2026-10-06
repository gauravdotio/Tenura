import type { SupabaseClient } from '@supabase/supabase-js';
import type { Expense, FinanceData, Income, Installment, Investment, Liability, Member, Policy } from '../finance/types';
import type { Mutation } from '../finance/mutations';
import type { FinanceRepository } from './repository';

// ---------------------------------------------------------------------------
// Row <-> model mapping (snake_case columns, numeric columns arrive as strings)
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));
const s = (v: unknown) => (v === null || v === undefined ? undefined : String(v));

const memberFromRow = (r: Row): Member => ({
  id: String(r.id),
  name: String(r.name),
  relation: String(r.relation),
  color: r.color as Member['color'],
  monthlyBudget: Number(r.monthly_budget),
  isPrimary: Boolean(r.is_primary),
  email: s(r.email),
  phone: s(r.phone),
  linkedUserId: s(r.linked_user_id),
  inviteCode: s(r.invite_code),
  inviteExpiresAt: s(r.invite_expires_at),
});
// Login link and invite columns are managed by database functions, never written directly
const memberToRow = (m: Member) => ({
  id: m.id, name: m.name, relation: m.relation, color: m.color,
  monthly_budget: m.monthlyBudget, is_primary: m.isPrimary,
  email: m.email ?? null, phone: m.phone ?? null,
});

const liabilityFromRow = (r: Row): Liability => ({
  id: String(r.id),
  memberId: String(r.member_id),
  provider: String(r.provider),
  kind: r.kind as Liability['kind'],
  status: r.status as Liability['status'],
  balance: Number(r.balance),
  interestRate: n(r.interest_rate),
  emiAmount: n(r.emi_amount),
  tenureMonths: n(r.tenure_months),
  startMonth: s(r.start_month),
  dueDay: n(r.due_day),
  cardLast4: s(r.card_last4),
  creditLimit: n(r.credit_limit),
  cardNetwork: s(r.card_network) as Liability['cardNetwork'],
  notes: s(r.notes),
  createdAt: String(r.created_at),
});
const liabilityToRow = (l: Liability) => ({
  id: l.id, member_id: l.memberId, provider: l.provider, kind: l.kind, status: l.status,
  balance: l.balance, interest_rate: l.interestRate ?? null, emi_amount: l.emiAmount ?? null,
  tenure_months: l.tenureMonths ?? null, start_month: l.startMonth ?? null, due_day: l.dueDay ?? null,
  card_last4: l.cardLast4 ?? null, credit_limit: l.creditLimit ?? null, card_network: l.cardNetwork ?? null,
  notes: l.notes ?? null, created_at: l.createdAt,
});

const installmentFromRow = (r: Row): Installment => ({
  id: String(r.id),
  liabilityId: String(r.liability_id),
  seq: Number(r.seq),
  dueMonth: String(r.due_month),
  amount: Number(r.amount),
  paidOn: s(r.paid_on),
});
const installmentToRow = (i: Installment) => ({
  id: i.id, liability_id: i.liabilityId, seq: i.seq, due_month: i.dueMonth,
  amount: i.amount, paid_on: i.paidOn ?? null,
});

const expenseFromRow = (r: Row): Expense => ({
  id: String(r.id),
  memberId: String(r.member_id),
  title: String(r.title),
  amount: Number(r.amount),
  category: r.category as Expense['category'],
  date: String(r.spent_on),
  paymentMethod: String(r.payment_method),
  isRecurring: Boolean(r.is_recurring),
  notes: s(r.notes),
});
const expenseToRow = (e: Expense) => ({
  id: e.id, member_id: e.memberId, title: e.title, amount: e.amount, category: e.category,
  spent_on: e.date, payment_method: e.paymentMethod, is_recurring: e.isRecurring, notes: e.notes ?? null,
});

const policyFromRow = (r: Row): Policy => ({
  id: String(r.id),
  memberId: String(r.member_id),
  provider: String(r.provider),
  name: String(r.name),
  policyNumber: s(r.policy_number),
  premium: Number(r.premium),
  frequency: r.frequency as Policy['frequency'],
  sumAssured: Number(r.sum_assured),
  nextDueDate: s(r.next_due_date),
  maturityDate: s(r.maturity_date),
  status: r.status as Policy['status'],
  notes: s(r.notes),
});
const policyToRow = (p: Policy) => ({
  id: p.id, member_id: p.memberId, provider: p.provider, name: p.name,
  policy_number: p.policyNumber ?? null, premium: p.premium, frequency: p.frequency,
  sum_assured: p.sumAssured, next_due_date: p.nextDueDate ?? null,
  maturity_date: p.maturityDate ?? null, status: p.status, notes: p.notes ?? null,
});

const incomeFromRow = (r: Row): Income => ({
  id: String(r.id),
  memberId: String(r.member_id),
  kind: r.kind as Income['kind'],
  source: String(r.source),
  amount: Number(r.amount),
  frequency: r.frequency as Income['frequency'],
  isActive: Boolean(r.is_active),
  notes: s(r.notes),
});
const incomeToRow = (i: Income) => ({
  id: i.id, member_id: i.memberId, kind: i.kind, source: i.source, amount: i.amount,
  frequency: i.frequency, is_active: i.isActive, notes: i.notes ?? null,
});

const investmentFromRow = (r: Row): Investment => ({
  id: String(r.id),
  memberId: String(r.member_id),
  kind: r.kind as Investment['kind'],
  provider: String(r.provider ?? ''),
  name: String(r.name),
  contribution: n(r.contribution),
  frequency: s(r.frequency) as Investment['frequency'],
  invested: Number(r.invested),
  currentValue: n(r.current_value),
  interestRate: n(r.interest_rate),
  startDate: s(r.start_date),
  maturityDate: s(r.maturity_date),
  emergencyFund: Boolean(r.emergency_fund),
  status: r.status as Investment['status'],
  notes: s(r.notes),
});
const investmentToRow = (i: Investment) => ({
  id: i.id, member_id: i.memberId, kind: i.kind, provider: i.provider, name: i.name,
  contribution: i.contribution ?? null, frequency: i.frequency ?? null, invested: i.invested,
  current_value: i.currentValue ?? null, interest_rate: i.interestRate ?? null,
  start_date: i.startDate ?? null, maturity_date: i.maturityDate ?? null,
  emergency_fund: i.emergencyFund, status: i.status, notes: i.notes ?? null,
});

// ---------------------------------------------------------------------------

/**
 * Persists to Postgres through Supabase. Row-level security scopes every query.
 *
 * - Own household (default): reads and writes rows owned by the signed-in user.
 * - Shared profile (`shared` set): a linked family member working on their own
 *   profile inside someone else's household. Rows are read from, and written to,
 *   the owner's household; the database only allows that one member's rows.
 */
export interface SharedProfile {
  ownerId: string;
  memberId: string;
}

export class SupabaseRepository implements FinanceRepository {
  readonly kind = 'supabase';
  private readonly db: SupabaseClient;
  private readonly householdId: string;
  private readonly shared?: SharedProfile;

  constructor(db: SupabaseClient, userId: string, shared?: SharedProfile) {
    this.db = db;
    this.shared = shared;
    // Always filter by household: a linked member can also read rows of the
    // household they were invited into, which must not leak into their own.
    this.householdId = shared?.ownerId ?? userId;
  }

  async load(): Promise<FinanceData> {
    const h = this.householdId;
    const members = this.db.from('members').select('*').eq('user_id', h).order('created_at');
    const [m, liabilities, installments, expenses, policies, incomes, investments] = await Promise.all([
      this.shared ? members.eq('id', this.shared.memberId) : members,
      this.db.from('liabilities').select('*').eq('user_id', h).order('created_at', { ascending: false }),
      this.db.from('installments').select('*').eq('user_id', h).order('seq'),
      this.db.from('expenses').select('*').eq('user_id', h).order('spent_on', { ascending: false }),
      this.db.from('policies').select('*').eq('user_id', h).order('created_at', { ascending: false }),
      this.db.from('incomes').select('*').eq('user_id', h).order('created_at', { ascending: false }),
      this.db.from('investments').select('*').eq('user_id', h).order('created_at', { ascending: false }),
    ]);
    for (const r of [m, liabilities, installments, expenses, policies, incomes, investments]) {
      if (r.error) throw r.error;
    }
    return {
      members: m.data!.map(memberFromRow),
      liabilities: liabilities.data!.map(liabilityFromRow),
      installments: installments.data!.map(installmentFromRow),
      expenses: expenses.data!.map(expenseFromRow),
      policies: policies.data!.map(policyFromRow),
      incomes: incomes.data!.map(incomeFromRow),
      investments: investments.data!.map(investmentFromRow),
    };
  }

  /** In shared mode, new rows must be filed under the owner's household. */
  private own<T extends object>(row: T): T & { user_id?: string } {
    return this.shared ? { ...row, user_id: this.shared.ownerId } : row;
  }

  async apply(m: Mutation): Promise<void> {
    const check = ({ error }: { error: unknown }) => {
      if (error) throw error;
    };
    if (this.shared && (m.type === 'member/upsert' || m.type === 'member/remove' || m.type === 'data/replace')) {
      throw new Error('Only the account holder can change household members or restore backups.');
    }

    switch (m.type) {
      case 'member/upsert':
        return check(await this.db.from('members').upsert(memberToRow(m.member)));
      case 'member/remove':
        return check(await this.db.rpc('remove_member', { p_member: m.id, p_reassign_to: m.reassignTo }));

      case 'liability/upsert':
        check(await this.db.from('liabilities').upsert(this.own(liabilityToRow(m.liability))));
        if (m.installments !== undefined) {
          check(await this.db.from('installments').delete().eq('liability_id', m.liability.id));
          if (m.installments?.length) {
            check(await this.db.from('installments').insert(m.installments.map((i) => this.own(installmentToRow(i)))));
          }
        }
        return;
      case 'liability/remove':
        return check(await this.db.from('liabilities').delete().eq('id', m.id));

      case 'installment/setPaid':
        return check(await this.db.from('installments').update({ paid_on: m.paidOn }).eq('id', m.id));

      case 'expense/upsert':
        return check(await this.db.from('expenses').upsert(this.own(expenseToRow(m.expense))));
      case 'expense/remove':
        return check(await this.db.from('expenses').delete().eq('id', m.id));

      case 'policy/upsert':
        return check(await this.db.from('policies').upsert(this.own(policyToRow(m.policy))));
      case 'policy/remove':
        return check(await this.db.from('policies').delete().eq('id', m.id));

      case 'income/upsert':
        return check(await this.db.from('incomes').upsert(this.own(incomeToRow(m.income))));
      case 'income/remove':
        return check(await this.db.from('incomes').delete().eq('id', m.id));

      case 'investment/upsert':
        return check(await this.db.from('investments').upsert(this.own(investmentToRow(m.investment))));
      case 'investment/remove':
        return check(await this.db.from('investments').delete().eq('id', m.id));

      case 'data/replace':
        return check(
          await this.db.rpc('replace_my_data', {
            payload: {
              members: m.data.members.map(memberToRow),
              liabilities: m.data.liabilities.map(liabilityToRow),
              installments: m.data.installments.map(installmentToRow),
              expenses: m.data.expenses.map(expenseToRow),
              policies: m.data.policies.map(policyToRow),
              incomes: m.data.incomes.map(incomeToRow),
              investments: m.data.investments.map(investmentToRow),
            },
          }),
        );
    }
  }
}
