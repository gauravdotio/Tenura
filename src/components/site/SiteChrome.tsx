import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { href, navigate } from '../../lib/router';
import { SITE } from '../../lib/site';
import { Logo } from '../layout/Logo';
import { Button, cx } from '../ui';
import { goToSection, startDemoAndGo } from './nav';

const SECTIONS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'calculator', label: 'EMI calculator' },
  { id: 'faq', label: 'FAQ' },
];

export function SiteHeader() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled || open ? 'border-b border-line/70 bg-canvas/85 backdrop-blur-md' : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-ink-muted md:flex" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => goToSection(s.id, e)} className="transition-colors hover:text-ink">
              {s.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user && user.mode !== 'demo' ? (
            <Button variant="primary" size="sm" onClick={() => navigate('/app')}>Open dashboard</Button>
          ) : (
            <>
              <a href={href('/login')} className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink sm:block">Sign in</a>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>Get started</Button>
            </>
          )}
          <button onClick={() => setOpen((o) => !o)} className="-mr-1.5 rounded-lg p-1.5 text-ink-muted hover:text-ink md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="animate-fade-in border-t border-line px-4 pb-4 pt-2 md:hidden" aria-label="Sections">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                setOpen(false);
                goToSection(s.id, e);
              }}
              className="block rounded-lg px-2 py-2.5 text-[15px] text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              {s.label}
            </a>
          ))}
          <a href={href('/login')} className="block rounded-lg px-2 py-2.5 text-[15px] text-ink-muted hover:bg-surface-sunken hover:text-ink">Sign in</a>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { startDemo } = useAuth();
  const columns: { title: string; links: { label: string; to?: string; section?: string; onClick?: () => void; external?: string }[] }[] = [
    {
      title: 'Product',
      links: [
        { label: 'Features', section: 'features' },
        { label: 'How it works', section: 'how-it-works' },
        { label: 'EMI calculator', section: 'calculator' },
        { label: 'Live demo', onClick: () => startDemoAndGo(startDemo) },
        { label: 'FAQ', section: 'faq' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', to: '/about' },
        { label: 'Contact', to: '/contact' },
        { label: 'Source code', external: SITE.github },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy policy', to: '/privacy' },
        { label: 'Terms of use', to: '/terms' },
        { label: 'Security', to: '/security' },
      ],
    },
  ];

  const linkClass = 'text-sm text-ink-muted transition-colors hover:text-ink';

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">{SITE.tagline}</p>
          <a href={SITE.github} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink">
            <GitHubMark className="h-4 w-4" /> Star on GitHub
          </a>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.external ? (
                    <a href={l.external} target="_blank" rel="noreferrer" className={linkClass}>{l.label}</a>
                  ) : l.to ? (
                    <a href={href(l.to)} className={linkClass}>{l.label}</a>
                  ) : l.section ? (
                    <a href={`#${l.section}`} onClick={(e) => goToSection(l.section!, e)} className={linkClass}>{l.label}</a>
                  ) : (
                    <button onClick={l.onClick} className={linkClass}>{l.label}</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} {SITE.name}. Designed & built by {SITE.author}.</p>
          <p>Tenura is a tracking tool, not a bank or financial adviser.</p>
        </div>
      </div>
    </footer>
  );
}

/** Layout for About / Contact / legal pages. */
export function ContentPage({ eyebrow, title, intro, children, updated }: { eyebrow: string; title: string; intro?: ReactNode; children: ReactNode; updated?: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteHeader />
      <main className="flex-1">
        <div className="relative overflow-hidden border-b border-line">
          <div className="hero-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-4 pb-12 pt-14 sm:px-6 sm:pt-20">
            <a href={href('/')} className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Home
            </a>
            <p className="mt-8 animate-fade-in text-sm font-medium text-accent">{eyebrow}</p>
            <h1 className="mt-2 animate-fade-in text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{title}</h1>
            {intro && <div className="mt-4 max-w-2xl animate-fade-in text-pretty text-lg text-ink-muted">{intro}</div>}
            {updated && <p className="mt-4 text-sm text-ink-faint">Last updated {updated}</p>}
          </div>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Long-form text styles for legal/about pages. */
export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-5 text-[15px] leading-relaxed text-ink-muted [&_a]:text-accent [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-ink [&_li]:pl-1 [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
      {children}
    </div>
  );
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
