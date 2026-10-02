import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  ChevronDown,
  CreditCard,
  Lock,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { emiBreakdown } from '../lib/finance/calc';
import { formatINR } from '../lib/format';
import { href, navigate } from '../lib/router';
import { Logo } from '../components/layout/Logo';
import { Button, Card, cx } from '../components/ui';

const FEATURES = [
  { icon: CreditCard, title: 'Cards, loans & EMIs', body: 'Every credit card balance, personal loan, consumer EMI and pay-later plan with what’s actually left to pay.' },
  { icon: CalendarClock, title: 'Automatic EMI schedules', body: 'Enter amount, rate and tenure. Tenura works out the EMI and builds the month-by-month plan for you to tick off.' },
  { icon: BellRing, title: 'One “coming up” list', body: 'EMIs, card bill dates and insurance premiums due in the next 30 days — sorted, with overdue items flagged.' },
  { icon: ShieldCheck, title: 'LIC & insurance', body: 'Premium amounts, frequencies, sum assured and maturity dates. Mark a premium paid and the next due date rolls forward.' },
  { icon: Users, title: 'Your whole family', body: 'Add parents, a spouse or siblings under your login and switch between their dashboards — or see the household together.' },
  { icon: Receipt, title: 'Daily expenses & budget', body: 'Log spending by category and see how the month is tracking against each person’s budget.' },
];

const FAQ = [
  { q: 'Does Tenura connect to my bank?', a: 'No. You add your loans, cards and policies yourself, which takes a few minutes. Nothing is ever pulled from — or sent to — your bank.' },
  { q: 'Can my family members log in?', a: 'Family members are managed from your account, so they don’t need their own login or email. You can view each person on their own or the whole household together.' },
  { q: 'Who can see my data?', a: 'Only you. Each record is tied to your account and the database’s row-level security refuses every request that isn’t yours. When you sign out, nothing stays on screen.' },
  { q: 'How is the EMI calculated?', a: 'With the standard reducing-balance formula banks use. For no-cost EMIs, leave the rate at 0%. You can always override the EMI to match your statement.' },
  { q: 'Can I get my data out?', a: 'Any time — export a full JSON backup or a CSV of your loans from Settings, and restore from a backup in one click.' },
];

export function LandingPage() {
  const { user, startDemo } = useAuth();
  const openDemo = () => {
    startDemo();
    navigate('/app');
  };

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-ink-muted md:flex" aria-label="Sections">
            <a href="#features" onClick={scrollTo('features')} className="hover:text-ink">Features</a>
            <a href="#calculator" onClick={scrollTo('calculator')} className="hover:text-ink">EMI calculator</a>
            <a href="#faq" onClick={scrollTo('faq')} className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {user && user.mode !== 'demo' ? (
              <Button variant="primary" size="sm" onClick={() => navigate('/app')}>Open dashboard</Button>
            ) : (
              <>
                <a href={href('/login')} className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink sm:block">Sign in</a>
                <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>Get started</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted shadow-card">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" /> Built for Indian households
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-6xl">
            Every EMI, card bill and premium your family pays. One place.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-ink-muted sm:text-lg">
            Tenura tracks your loans, credit cards, EMI schedules, LIC policies and daily spending — for you and the family members you look after — and tells you what’s due next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="primary" size="lg" onClick={() => navigate('/signup')} icon={<ArrowRight className="h-4 w-4" />} className="flex-row-reverse">
              Create free account
            </Button>
            <Button size="lg" onClick={openDemo}>Explore the live demo</Button>
          </div>
          <p className="mt-4 text-xs text-ink-faint">No bank linking. No card details. Just the numbers you choose to add.</p>
        </div>

        <HeroPreview />
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-line bg-surface py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">Stop keeping it all in your head</h2>
            <p className="mt-3 text-ink-muted">
              Three cards with different due dates, an AC on EMI, a personal loan, Mom’s LIC premium every quarter… Tenura keeps the whole picture so you don’t have to.
            </p>
          </div>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-sunken text-ink">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Calculator />

      {/* Privacy */}
      <section className="border-y border-line bg-surface py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-positive-soft text-positive"><Lock className="h-5 w-5" /></span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink">Private by design</h2>
            <p className="mt-3 text-ink-muted">Your finances are nobody else’s business — including other Tenura users.</p>
          </div>
          <ul className="space-y-4">
            {[
              ['Owner-only access', 'Every row in the database belongs to one account, enforced by Postgres row-level security — not just by the app.'],
              ['Nothing left behind', 'Sign out and your household’s data is cleared from the screen and memory immediately.'],
              ['Passwords never stored', 'Authentication is handled by Supabase Auth; Tenura never sees or stores your password.'],
              ['Your data, portable', 'Export everything to JSON or CSV whenever you like. Delete your account and it’s gone.'],
            ].map(([t, b]) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-positive" />
                <div>
                  <p className="text-sm font-medium text-ink">{t}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{b}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">Questions</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-3xl bg-ink px-6 py-14 text-center sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight text-ink-inverse">Know exactly what’s due, every month</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-inverse/70">Set it up in ten minutes. Free while in beta.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => navigate('/signup')} className="h-12 rounded-xl bg-canvas px-6 text-[15px] font-medium text-ink transition-opacity hover:opacity-90">
              Create free account
            </button>
            <button onClick={openDemo} className="h-12 rounded-xl border border-ink-inverse/25 px-6 text-[15px] font-medium text-ink-inverse transition-colors hover:bg-ink-inverse/10">
              Explore the demo
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-ink-faint sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} Tenura · Built by Gaurav Rawat</p>
        </div>
      </footer>
    </div>
  );
}

function scrollTo(id: string) {
  return (e: React.MouseEvent) => {
    // Hash routing owns the URL fragment, so scroll without touching it
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
}

function HeroPreview() {
  const due = [
    { t: 'HDFC Personal Loan', s: 'EMI 9 of 36 · 5 Oct', a: '₹9,893', badge: 'In 3 days', tone: 'warning' },
    { t: 'SBI Card ··7713', s: 'Card bill · 7 Oct', a: '₹26,000', badge: 'In 5 days', tone: 'neutral' },
    { t: 'LIC Jeevan Labh', s: 'Yearly premium · 11 Oct', a: '₹48,500', badge: 'In 9 days', tone: 'neutral' },
    { t: 'MacBook Air · Didi', s: 'EMI 3 of 6 · 5 Oct', a: '₹9,000', badge: 'In 3 days', tone: 'warning' },
  ];
  return (
    <div className="relative mx-auto mt-16 max-w-5xl" aria-hidden>
      <div className="rounded-2xl border border-line bg-surface p-2 shadow-lg sm:p-3">
        <div className="rounded-xl border border-line bg-canvas p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Outstanding debt', '₹4,60,161', 'bg-negative'],
              ['Monthly commitments', '₹36,806', 'bg-accent'],
              ['Repaid so far', '₹1,14,245', 'bg-positive'],
              ['Spent this month', '₹39,388', 'bg-ink-faint'],
            ].map(([l, v, dot]) => (
              <div key={l} className="rounded-xl border border-line bg-surface p-4 shadow-card">
                <p className="flex items-center gap-2 text-xs text-ink-muted"><span className={cx('h-1.5 w-1.5 rounded-full', dot)} />{l}</p>
                <p className="num mt-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-line bg-surface shadow-card">
            <p className="px-4 pt-4 text-sm font-semibold text-ink">Coming up</p>
            <ul className="mt-2 divide-y divide-line">
              {due.map((d) => (
                <li key={d.t} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted"><CalendarClock className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-ink">{d.t}</p>
                    <p className="text-xs text-ink-faint">{d.s}</p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-semibold text-ink">{d.a}</p>
                    <span className={cx('rounded-md px-1.5 py-0.5 text-[11px] font-medium', d.tone === 'warning' ? 'bg-warning-soft text-warning' : 'bg-surface-sunken text-ink-muted')}>{d.badge}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Calculator() {
  const [amount, setAmount] = useState(300000);
  const [rate, setRate] = useState(11.5);
  const [months, setMonths] = useState(36);
  const { emi, totalPayable, totalInterest } = useMemo(() => emiBreakdown(amount, rate, months), [amount, rate, months]);
  const principalShare = totalPayable ? (amount / totalPayable) * 100 : 100;

  const sliders = [
    { id: 'calc-amount', label: 'Loan amount', value: amount, set: setAmount, min: 10000, max: 5000000, step: 5000, display: formatINR(amount) },
    { id: 'calc-rate', label: 'Interest rate', value: rate, set: setRate, min: 0, max: 30, step: 0.25, display: `${rate}% p.a.` },
    { id: 'calc-tenure', label: 'Tenure', value: months, set: setMonths, min: 3, max: 120, step: 1, display: `${months} months` },
  ];

  return (
    <section id="calculator" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight text-ink">EMI calculator</h2>
        <p className="mt-3 text-ink-muted">The same reducing-balance maths Tenura uses when you add a loan.</p>
      </div>
      <Card className="mt-10 grid gap-0 overflow-hidden md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-7 p-6 sm:p-8">
          {sliders.map((s) => (
            <div key={s.id}>
              <div className="flex items-center justify-between">
                <label htmlFor={s.id} className="text-sm font-medium text-ink">{s.label}</label>
                <span className="num rounded-lg bg-surface-sunken px-2.5 py-1 text-sm font-medium text-ink">{s.display}</span>
              </div>
              <input
                id={s.id}
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={s.value}
                onChange={(e) => s.set(Number(e.target.value))}
                className="mt-3 w-full accent-[rgb(var(--ink))]"
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col justify-center border-t border-line bg-surface-sunken p-6 sm:p-8 md:border-l md:border-t-0">
          <p className="text-sm text-ink-muted">Monthly EMI</p>
          <p className="num mt-1 text-4xl font-semibold tracking-tight text-ink" aria-live="polite">{formatINR(emi)}</p>
          <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-surface">
            <div className="bg-[var(--chart-1)]" style={{ width: `${principalShare}%` }} />
            <div className="ml-0.5 flex-1 bg-[var(--chart-2)]" />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="flex items-center gap-2 text-ink-muted"><span className="h-2 w-2 rounded-sm bg-[var(--chart-1)]" />Principal</dt>
              <dd className="num font-medium text-ink">{formatINR(amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="flex items-center gap-2 text-ink-muted"><span className="h-2 w-2 rounded-sm bg-[var(--chart-2)]" />Interest</dt>
              <dd className="num font-medium text-ink">{formatINR(totalInterest)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2">
              <dt className="font-medium text-ink">Total payable</dt>
              <dd className="num font-semibold text-ink">{formatINR(totalPayable)}</dd>
            </div>
          </dl>
          <Button variant="primary" className="mt-6" onClick={() => navigate('/signup')}>Track this loan in Tenura</Button>
        </div>
      </Card>
    </section>
  );
}
