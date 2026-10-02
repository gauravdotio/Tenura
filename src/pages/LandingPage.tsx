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
import { emiBreakdown } from '../lib/finance/calc';
import { formatINR } from '../lib/format';
import { navigate } from '../lib/router';
import { Button, Card, cx } from '../components/ui';
import { CountUp, Reveal } from '../components/site/Reveal';
import { SiteFooter, SiteHeader } from '../components/site/SiteChrome';
import { goToSection } from '../components/site/nav';

const FEATURES = [
  { icon: CreditCard, title: 'Cards, loans & EMIs', body: 'Every credit card balance, personal loan, consumer EMI and pay-later plan with what’s actually left to pay.' },
  { icon: CalendarClock, title: 'Automatic EMI schedules', body: 'Enter amount, rate and tenure. Tenura works out the EMI and builds the month-by-month plan for you to tick off.' },
  { icon: BellRing, title: 'One “coming up” list', body: 'EMIs, card bill dates and insurance premiums due in the next 30 days — sorted, with overdue items flagged.' },
  { icon: ShieldCheck, title: 'LIC & insurance', body: 'Premium amounts, frequencies, sum assured and maturity dates. Mark a premium paid and the next due date rolls forward.' },
  { icon: Users, title: 'Your whole family', body: 'Add parents, a spouse or siblings under your login and switch between their dashboards — or see the household together.' },
  { icon: Receipt, title: 'Daily expenses & budget', body: 'Log spending by category and see how the month is tracking against each person’s budget.' },
];

const STEPS = [
  { title: 'Add what you owe', body: 'Cards, loans, EMIs and LIC policies — for you and anyone in the family. Takes about ten minutes.' },
  { title: 'Get your schedule', body: 'Tenura calculates every EMI and lays out each month’s payments, card bills and premiums.' },
  { title: 'Tick it off', body: 'Mark things paid as they go out. Watch the debt come down and the debt-free date get closer.' },
];

const LENDERS = ['HDFC Bank', 'SBI Card', 'ICICI Bank', 'Axis Bank', 'Kotak', 'IDFC FIRST', 'IndusInd', 'RBL Bank', 'Bajaj Finserv', 'LIC of India', 'HDFC Life', 'Star Health', 'Amazon Pay Later', 'Tata Capital'];

const FAQ = [
  { q: 'Does Tenura connect to my bank?', a: 'No. You add your loans, cards and policies yourself, which takes a few minutes. Nothing is ever pulled from — or sent to — your bank.' },
  { q: 'Can my family members log in?', a: 'Family members are managed from your account, so they don’t need their own login or email. You can view each person on their own or the whole household together.' },
  { q: 'Who can see my data?', a: 'Only you. Each record is tied to your account and the database’s row-level security refuses every request that isn’t yours. When you sign out, nothing stays on screen.' },
  { q: 'How is the EMI calculated?', a: 'With the standard reducing-balance formula banks use. For no-cost EMIs, leave the rate at 0%. You can always override the EMI to match your statement.' },
  { q: 'Is it free?', a: 'Yes. Tenura is free while in beta.' },
  { q: 'Can I get my data out?', a: 'Any time — export a full JSON backup or a CSV of your loans from Settings, and restore from a backup in one click.' },
];

export function LandingPage() {

  return (
    <div className="min-h-dvh bg-canvas">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="hero-glow pointer-events-none absolute inset-x-0 top-24 mx-auto h-[420px] max-w-4xl" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="rise-in inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3 py-1 text-xs font-medium text-ink-muted shadow-card backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive" />
              </span>
              Built for Indian households · Free in beta
            </p>
            <h1 className="rise-in mt-6 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-ink [animation-delay:80ms] sm:text-6xl">
              Every EMI, card bill and premium your family pays.{' '}
              <span className="bg-gradient-to-r from-accent to-positive bg-clip-text text-transparent">One place.</span>
            </h1>
            <p className="rise-in mx-auto mt-5 max-w-xl text-pretty text-base text-ink-muted [animation-delay:160ms] sm:text-lg">
              Tenura tracks your loans, credit cards, EMI schedules, LIC policies and daily spending — for you and the family members you look after — and tells you what’s due next.
            </p>
            <div className="rise-in mt-8 flex flex-col items-center justify-center gap-3 [animation-delay:240ms] sm:flex-row">
              <Button variant="primary" size="lg" onClick={() => navigate('/signup')} className="group">
                Create free account
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" onClick={() => goToSection('how-it-works')}>See how it works</Button>
            </div>
            <p className="rise-in mt-4 text-xs text-ink-faint [animation-delay:300ms]">No bank linking. No card details. Just the numbers you choose to add.</p>
          </div>

          <HeroPreview />
        </div>
      </section>

      {/* Lender marquee */}
      <section className="border-y border-line bg-surface py-6" aria-label="Works with any lender">
        <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-ink-faint">Track loans, cards & policies from any lender</p>
        <div className="marquee overflow-hidden">
          <div className="marquee-track flex w-max gap-10 pr-10">
            {[...LENDERS, ...LENDERS].map((l, i) => (
              <span key={i} className="whitespace-nowrap text-[15px] font-medium text-ink-faint" aria-hidden={i >= LENDERS.length}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-sm font-medium text-accent">Features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Stop keeping it all in your head</h2>
            <p className="mt-3 text-ink-muted">
              Three cards with different due dates, an AC on EMI, a personal loan, Mom’s LIC premium every quarter… Tenura keeps the whole picture so you don’t have to.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <div className="group h-full rounded-2xl border border-line bg-surface p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-sunken text-ink transition-colors duration-300 group-hover:bg-ink group-hover:text-ink-inverse">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[15px] font-semibold text-ink">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-accent">How it works</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Set up once. Stay on top every month.</h2>
          </Reveal>
          <div className="relative mt-14">
          <div className="absolute left-[16.6%] right-[16.6%] top-5 hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent md:block" aria-hidden />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 140} className="relative text-center">
                <span className="relative mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-canvas text-sm font-semibold text-ink shadow-card">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-ink">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </Reveal>
            ))}
          </ol>
          </div>
        </div>
      </section>

      <Calculator />

      {/* Privacy */}
      <section className="border-y border-line bg-surface py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 md:grid-cols-2">
          <Reveal>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-positive-soft text-positive"><Lock className="h-5 w-5" /></span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Private by design</h2>
            <p className="mt-3 text-ink-muted">Your finances are nobody else’s business — including other Tenura users.</p>
            <a href="#/security" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              How we protect your data <ArrowRight className="h-4 w-4" />
            </a>
          </Reveal>
          <ul className="space-y-5">
            {[
              ['Owner-only access', 'Every row in the database belongs to one account, enforced by Postgres row-level security — not just by the app.'],
              ['Nothing left behind', 'Sign out and your household’s data is cleared from the screen and memory immediately.'],
              ['No bank logins, ever', 'Tenura never asks for netbanking credentials, card numbers or OTPs.'],
              ['Your data, portable', 'Export everything to JSON or CSV whenever you like. Delete your account and it’s gone.'],
            ].map(([t, b], i) => (
              <Reveal as="li" key={t} delay={i * 90} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-positive text-white"><Check className="h-3 w-3" /></span>
                <div>
                  <p className="text-sm font-medium text-ink">{t}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">{b}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
        <Reveal>
          <p className="text-sm font-medium text-accent">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Questions, answered</h2>
        </Reveal>
        <Reveal delay={100} className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-faint transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <p className="mt-2 animate-fade-in text-sm leading-relaxed text-ink-muted">{f.a}</p>
            </details>
          ))}
        </Reveal>
        <p className="mt-6 text-sm text-ink-muted">
          Something else? <a href="#/contact" className="font-medium text-accent hover:underline">Get in touch</a>.
        </p>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center sm:px-12">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-accent/30 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-positive/25 blur-3xl" aria-hidden />
          <h2 className="relative text-3xl font-semibold tracking-tight text-ink-inverse sm:text-4xl">Know exactly what’s due, every month</h2>
          <p className="relative mx-auto mt-3 max-w-md text-ink-inverse/70">Set it up in ten minutes. Free while in beta.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => navigate('/signup')} className="h-12 rounded-xl bg-canvas px-6 text-[15px] font-medium text-ink transition-transform hover:-translate-y-0.5">
              Create free account
            </button>
            <button onClick={() => navigate('/login')} className="h-12 rounded-xl border border-ink-inverse/25 px-6 text-[15px] font-medium text-ink-inverse transition-colors hover:bg-ink-inverse/10">
              Sign in
            </button>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  );
}

function HeroPreview() {
  const due = [
    { t: 'HDFC Personal Loan', s: 'EMI 9 of 36 · 5 Oct', a: '₹9,893', badge: 'In 3 days', tone: 'warning' },
    { t: 'SBI Card ··7713', s: 'Card bill · 7 Oct', a: '₹26,000', badge: 'In 5 days', tone: 'neutral' },
    { t: 'LIC Jeevan Labh', s: 'Yearly premium · 11 Oct', a: '₹48,500', badge: 'In 9 days', tone: 'neutral' },
    { t: 'MacBook Air · Didi', s: 'EMI 3 of 6 · 5 Oct', a: '₹9,000', badge: 'In 3 days', tone: 'warning' },
  ];
  const stats: [string, number, string][] = [
    ['Outstanding debt', 460161, 'bg-negative'],
    ['Monthly commitments', 36806, 'bg-accent'],
    ['Repaid so far', 114245, 'bg-positive'],
    ['Spent this month', 39388, 'bg-ink-faint'],
  ];
  return (
    <div className="rise-in relative mx-auto mt-16 max-w-5xl [animation-delay:380ms]" aria-hidden>
      {/* floating callouts */}
      <div className="float-slow absolute -left-20 top-44 z-10 hidden rounded-xl border border-line bg-surface-raised px-4 py-3 shadow-lg xl:block">
        <p className="text-xs text-ink-faint">Debt-free by</p>
        <p className="text-sm font-semibold text-ink">January 2029</p>
      </div>
      <div className="float-slower absolute -right-20 bottom-20 z-10 hidden items-center gap-3 rounded-xl border border-line bg-surface-raised px-4 py-3 shadow-lg xl:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-positive text-white"><Check className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-ink">AC EMI paid</p>
          <p className="text-xs text-ink-faint">4 of 12 · ₹2,331</p>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-2 shadow-lg sm:p-3">
        <div className="rounded-xl border border-line bg-canvas p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(([l, v, dot]) => (
              <div key={l} className="rounded-xl border border-line bg-surface p-4 shadow-card">
                <p className="flex items-center gap-2 text-xs text-ink-muted"><span className={cx('h-1.5 w-1.5 rounded-full', dot)} />{l}</p>
                <p className="mt-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">
                  <CountUp value={v} format={formatINR} />
                </p>
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
    <section id="calculator" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
      <Reveal className="max-w-2xl">
        <p className="text-sm font-medium text-accent">EMI calculator</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">What will this loan really cost?</h2>
        <p className="mt-3 text-ink-muted">The same reducing-balance maths Tenura uses when you add a loan.</p>
      </Reveal>
      <Reveal delay={120}>
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
              <div className="bg-[var(--chart-1)] transition-[width] duration-300" style={{ width: `${principalShare}%` }} />
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
      </Reveal>
    </section>
  );
}
