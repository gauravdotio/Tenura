import type {
  CardNetwork,
  Expense,
  ExpenseCategory,
  FinanceData,
  Income,
  IncomeKind,
  Installment,
  Investment,
  InvestmentKind,
  InvestmentStatus,
  Liability,
  LiabilityKind,
  Member,
  MemberColor,
  Policy,
  PremiumFrequency,
} from './types';
import { newId } from './sample';

export const BACKUP_VERSION = 3;

export interface Backup {
  app: 'tenura';
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  data: FinanceData;
}

export function makeBackup(data: FinanceData): Backup {
  return { app: 'tenura', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data };
}

export type ParseResult = { ok: true; data: FinanceData; legacy: boolean } | { ok: false; error: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const arr = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? x.filter(isObj) : []);
const str = (x: unknown, fallback = ''): string => (typeof x === 'string' ? x.trim() : fallback);
const num = (x: unknown): number => {
  const n = typeof x === 'number' ? x : typeof x === 'string' ? Number(x) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const optNum = (x: unknown) => (num(x) > 0 ? num(x) : undefined);
const optStr = (x: unknown) => str(x) || undefined;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COLORS: MemberColor[] = ['blue', 'teal', 'violet', 'amber', 'rose', 'slate'];
const KINDS: LiabilityKind[] = ['credit_card', 'loan', 'emi', 'bnpl'];
const NETWORKS: CardNetwork[] = ['visa', 'mastercard', 'rupay', 'amex', 'diners'];
const CATEGORIES: ExpenseCategory[] = ['housing', 'utilities', 'groceries', 'dining', 'shopping', 'transport', 'health', 'education', 'entertainment', 'other'];
const LEGACY_CATEGORY: Record<string, ExpenseCategory> = { food_groceries: 'groceries', debt_emi: 'other' };
const FREQUENCIES: PremiumFrequency[] = ['monthly', 'quarterly', 'half_yearly', 'yearly'];
const INCOME_KINDS: IncomeKind[] = ['salary', 'business', 'freelance', 'rental', 'pension', 'interest', 'other'];
const INVESTMENT_KINDS: InvestmentKind[] = ['sip', 'mutual_fund', 'stocks', 'fd', 'rd', 'ppf', 'epf', 'nps', 'gold', 'savings', 'other'];
const INVESTMENT_STATUSES: InvestmentStatus[] = ['active', 'paused', 'matured', 'closed'];

/**
 * Accepts a Tenura backup (v3) or a v2 export / browser vault from the previous
 * version of the app. Everything is re-validated, ids that aren't UUIDs are
 * re-issued (the database uses uuid keys), and references are kept consistent.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!isObj(raw)) return { ok: false, error: 'Unrecognised backup format.' };

  const isV3 = raw.app === 'tenura' && isObj(raw.data);
  const isLegacy = !isV3 && Array.isArray(raw.liabilities);
  if (!isV3 && !isLegacy) return { ok: false, error: 'Unrecognised backup format.' };

  const src = isV3 ? (raw.data as Record<string, unknown>) : raw;
  const ids = new Map<string, string>();
  const remap = (old: unknown): string => {
    const key = str(old);
    if (UUID.test(key)) return key;
    if (!ids.has(key)) ids.set(key, newId());
    return ids.get(key)!;
  };

  // Members (legacy: "profiles")
  const members: Member[] = arr(isV3 ? src.members : src.profiles).map((m, i) => ({
    id: remap(m.id),
    name: str(m.name, 'Member').slice(0, 80) || 'Member',
    relation: str(m.relation ?? m.role, i === 0 ? 'Self' : 'Family') || 'Family',
    color: COLORS.includes(m.color as MemberColor) ? (m.color as MemberColor) : COLORS[i % COLORS.length],
    monthlyBudget: num(m.monthlyBudget),
    isPrimary: isV3 ? m.isPrimary === true : i === 0,
    email: optStr(m.email),
    phone: optStr(m.phone),
  }));
  if (members.length === 0) return { ok: false, error: 'The backup has no household members.' };
  if (!members.some((m) => m.isPrimary)) members[0].isPrimary = true;
  members.forEach((m, i) => { if (m.isPrimary && members.findIndex((x) => x.isPrimary) !== i) m.isPrimary = false; });

  const memberIds = new Set(members.map((m) => m.id));
  const primaryId = members.find((m) => m.isPrimary)!.id;
  const memberRef = (x: unknown) => {
    const id = remap(x);
    return memberIds.has(id) ? id : primaryId;
  };

  const liabilities: Liability[] = arr(src.liabilities).map((l) => {
    const status = str(l.status);
    return {
      id: remap(l.id),
      memberId: memberRef(l.memberId ?? l.profileId),
      provider: str(l.provider ?? l.providerName, 'Unnamed').slice(0, 120) || 'Unnamed',
      kind: KINDS.includes(l.kind as LiabilityKind) ? (l.kind as LiabilityKind)
        : KINDS.includes(l.type as LiabilityKind) ? (l.type as LiabilityKind) : 'loan',
      status: status === 'closed' || status === 'paid_off' ? 'closed'
        : status === 'converted' || status === 'converted_to_emi' ? 'converted' : 'active',
      balance: num(l.balance ?? l.amount),
      interestRate: l.interestRate === undefined ? undefined : num(l.interestRate),
      emiAmount: optNum(l.emiAmount),
      tenureMonths: optNum(l.tenureMonths ?? l.tenure),
      startMonth: /^\d{4}-\d{2}/.test(str(l.startMonth ?? l.startDate)) ? str(l.startMonth ?? l.startDate).slice(0, 7) : undefined,
      dueDay: optNum(l.dueDay) && num(l.dueDay) <= 31 ? Math.round(num(l.dueDay)) : undefined,
      cardLast4: /^\d{4}$/.test(str(l.cardLast4)) ? str(l.cardLast4) : undefined,
      creditLimit: optNum(l.creditLimit),
      cardNetwork: NETWORKS.includes(l.cardNetwork as CardNetwork) ? (l.cardNetwork as CardNetwork) : undefined,
      notes: optStr(l.notes),
      createdAt: str(l.createdAt) || new Date().toISOString(),
    };
  });
  const liabilityIds = new Set(liabilities.map((l) => l.id));

  // Installments (legacy: nested in schedules[].months[])
  const rawInstallments: Record<string, unknown>[] = isV3
    ? arr(src.installments)
    : arr(src.schedules).flatMap((s) =>
        arr(s.months).map((m) => ({
          id: m.id,
          liabilityId: s.liabilityId,
          seq: m.installmentIndex,
          dueMonth: m.monthDate,
          amount: m.amount,
          paidOn: m.isPaid ? str(m.paidDate) || `${str(m.monthDate)}-01` : undefined,
        })),
      );
  const installments: Installment[] = rawInstallments
    .map((i, idx) => ({
      id: remap(i.id ?? `inst-${idx}`),
      liabilityId: remap(i.liabilityId),
      seq: Math.max(1, Math.round(num(i.seq)) || idx + 1),
      dueMonth: str(i.dueMonth).slice(0, 7),
      amount: num(i.amount),
      paidOn: /^\d{4}-\d{2}-\d{2}$/.test(str(i.paidOn)) ? str(i.paidOn) : undefined,
    }))
    .filter((i) => liabilityIds.has(i.liabilityId) && /^\d{4}-\d{2}$/.test(i.dueMonth));

  const expenses: Expense[] = arr(src.expenses)
    .map((e) => {
      const cat = str(e.category);
      return {
        id: remap(e.id),
        memberId: memberRef(e.memberId ?? e.profileId),
        title: str(e.title, 'Expense').slice(0, 120) || 'Expense',
        amount: num(e.amount),
        category: CATEGORIES.includes(cat as ExpenseCategory) ? (cat as ExpenseCategory) : LEGACY_CATEGORY[cat] ?? 'other',
        date: str(e.date).slice(0, 10),
        paymentMethod: str(e.paymentMethod, 'UPI') || 'UPI',
        isRecurring: e.isRecurring === true,
        notes: optStr(e.notes),
      };
    })
    .filter((e) => e.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(e.date));

  const policies: Policy[] = arr(src.policies).map((p) => ({
    id: remap(p.id),
    memberId: memberRef(p.memberId ?? p.profileId),
    provider: str(p.provider ?? p.providerName, 'Insurer') || 'Insurer',
    name: str(p.name ?? p.policyName, 'Policy') || 'Policy',
    policyNumber: optStr(p.policyNumber),
    premium: num(p.premium ?? p.premiumAmount),
    frequency: (['monthly', 'quarterly', 'half_yearly', 'yearly'] as const).find((f) => f === (p.frequency ?? p.premiumFrequency)) ?? 'yearly',
    sumAssured: num(p.sumAssured),
    nextDueDate: /^\d{4}-\d{2}-\d{2}$/.test(str(p.nextDueDate ?? p.nextPremiumDate)) ? str(p.nextDueDate ?? p.nextPremiumDate) : undefined,
    maturityDate: /^\d{4}-\d{2}-\d{2}$/.test(str(p.maturityDate)) ? str(p.maturityDate) : undefined,
    status: p.status === 'lapsed' || p.status === 'matured' ? p.status : 'active',
    notes: optStr(p.notes),
  }));

  const isoDate = (x: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(str(x)) ? str(x) : undefined);
  const freq = (x: unknown) => FREQUENCIES.find((f) => f === x);

  const incomes: Income[] = arr(src.incomes)
    .map((i) => ({
      id: remap(i.id),
      memberId: memberRef(i.memberId),
      kind: INCOME_KINDS.includes(i.kind as IncomeKind) ? (i.kind as IncomeKind) : 'other',
      source: str(i.source, 'Income').slice(0, 120) || 'Income',
      amount: num(i.amount),
      frequency: freq(i.frequency) ?? 'monthly',
      isActive: i.isActive !== false,
      notes: optStr(i.notes),
    }))
    .filter((i) => i.amount > 0);

  const investments: Investment[] = arr(src.investments).map((i) => ({
    id: remap(i.id),
    memberId: memberRef(i.memberId),
    kind: INVESTMENT_KINDS.includes(i.kind as InvestmentKind) ? (i.kind as InvestmentKind) : 'other',
    provider: str(i.provider).slice(0, 120),
    name: str(i.name, 'Investment').slice(0, 120) || 'Investment',
    contribution: optNum(i.contribution),
    frequency: freq(i.frequency),
    invested: num(i.invested),
    currentValue: optNum(i.currentValue),
    interestRate: i.interestRate === undefined ? undefined : num(i.interestRate),
    startDate: isoDate(i.startDate),
    maturityDate: isoDate(i.maturityDate),
    emergencyFund: i.emergencyFund === true,
    status: INVESTMENT_STATUSES.includes(i.status as InvestmentStatus) ? (i.status as InvestmentStatus) : 'active',
    notes: optStr(i.notes),
  }));

  return { ok: true, legacy: isLegacy, data: { members, liabilities, installments, expenses, policies, incomes, investments } };
}

/** Spreadsheet-friendly export of liabilities. */
export function liabilitiesCsv(data: FinanceData, outstanding: (l: Liability) => number): string {
  const members = new Map(data.members.map((m) => [m.id, m.name]));
  const esc = (v: unknown) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Member', 'Provider', 'Type', 'Status', 'Principal / balance', 'Credit limit', 'Outstanding', 'Interest %', 'EMI', 'Tenure (months)', 'Start month', 'Notes'];
  const rows = data.liabilities.map((l) => [
    members.get(l.memberId), l.provider, l.kind, l.status, l.balance, l.creditLimit, outstanding(l),
    l.interestRate, l.emiAmount, l.tenureMonths, l.startMonth, l.notes,
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}

export function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
