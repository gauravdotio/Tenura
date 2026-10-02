import { ArrowRight, Heart, Lock, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../lib/router';
import { SITE } from '../../lib/site';
import { ContentPage, GitHubMark, Prose } from '../../components/site/SiteChrome';
import { startDemoAndGo } from '../../components/site/nav';
import { Reveal } from '../../components/site/Reveal';
import { Button } from '../../components/ui';

const VALUES = [
  { icon: Heart, title: 'Built from real life', body: 'Every feature exists because a real household needed it — not because a competitor had it.' },
  { icon: Users, title: 'Family first', body: 'Indian finances are rarely individual. Parents, spouses and siblings belong in the same picture.' },
  { icon: Lock, title: 'Private by default', body: 'No bank logins, no selling data, no ads. Your numbers stay yours.' },
  { icon: Sparkles, title: 'Calm, not clever', body: 'Clear numbers and a short list of what’s due. No jargon, no gamified nudges.' },
];

export function AboutPage() {
  const { startDemo } = useAuth();
  return (
    <ContentPage
      eyebrow="About"
      title="Built because the spreadsheet stopped working"
      intro="Tenura started as a personal fix for a very ordinary problem: too many EMIs, card bills and premiums, spread across a family, with nowhere to see them all."
    >
      <Reveal>
        <Prose>
          <p>
            Three credit cards with three different due dates. A personal loan. An AC and a laptop on no-cost EMI. A sister’s MacBook instalments. Mom’s LIC premium every quarter. Each one has its own app, SMS or paper statement — and missing even one means a late fee or a dent in a credit score.
          </p>
          <p>
            Banking apps only show their own products, and budgeting apps are built for one person’s spending, not a household’s commitments. So {SITE.author} built the tool he wanted: one list of everything the family owes, what’s due next, and how fast it’s coming down.
          </p>
          <h2>What Tenura does</h2>
          <ul>
            <li>Tracks credit cards, loans, consumer EMIs, pay-later plans and insurance policies for every member of a household.</li>
            <li>Calculates EMIs with the same reducing-balance formula banks use, and generates month-by-month schedules.</li>
            <li>Shows one “coming up” list of everything due in the next 30 days.</li>
            <li>Logs daily spending against a monthly budget.</li>
          </ul>
          <h2>How it’s built</h2>
          <p>
            Tenura is a React and TypeScript web app on a Supabase (Postgres) backend. Every table is protected with row-level security, so the database itself refuses to show one person’s data to another. The source code is <a href={SITE.github} target="_blank" rel="noreferrer">open on GitHub</a>.
          </p>
        </Prose>
      </Reveal>

      <div className="mt-14 grid gap-4 sm:grid-cols-2">
        {VALUES.map((v, i) => (
          <Reveal key={v.title} delay={i * 80}>
            <div className="h-full rounded-2xl border border-line bg-surface p-5 shadow-card">
              <v.icon className="h-5 w-5 text-ink-muted" />
              <h3 className="mt-3 font-semibold text-ink">{v.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{v.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-14 flex flex-col gap-3 rounded-2xl border border-line bg-surface-sunken p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-ink">See it with a sample household</p>
          <p className="text-sm text-ink-muted">No sign-up needed — nothing is saved.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => startDemoAndGo(startDemo)}>Explore the demo <ArrowRight className="h-4 w-4" /></Button>
          <Button onClick={() => window.open(SITE.github, '_blank', 'noopener')} icon={<GitHubMark className="h-4 w-4" />}>Code</Button>
        </div>
      </Reveal>
      <p className="mt-6 text-sm text-ink-muted">
        Questions? <a href="#/contact" className="text-accent hover:underline" onClick={(e) => { e.preventDefault(); navigate('/contact'); }}>Contact us</a>.
      </p>
    </ContentPage>
  );
}
