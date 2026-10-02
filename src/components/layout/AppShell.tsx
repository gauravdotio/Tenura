import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  BarChart3,
  CalendarClock,
  ChevronsUpDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Plus,
  Receipt,
  Settings,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { useTheme, type ThemePref } from '../../context/ThemeContext';
import { useOpenDialog } from '../../context/DialogContext';
import { href, navigate } from '../../lib/router';
import { Button, MemberAvatar, cx } from '../ui';
import { Logo } from './Logo';

export const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard },
  { to: '/app/liabilities', label: 'Loans & cards', icon: CreditCard },
  { to: '/app/emis', label: 'EMI schedules', icon: CalendarClock },
  { to: '/app/expenses', label: 'Expenses', icon: Receipt },
  { to: '/app/insurance', label: 'Insurance & LIC', icon: ShieldCheck },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/household', label: 'Household', icon: Users },
] as const;

export function AppShell({ path, children }: { path: string; children: ReactNode }) {
  // Remember which page the drawer was opened on, so navigating closes it
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawerOpen = drawerPath === path;
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? path : null);
  const { user } = useAuth();
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerPath(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface lg:flex">
        <Sidebar path={path} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/40" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-[284px] max-w-[85vw] animate-slide-in flex-col bg-surface shadow-lg" aria-label="Navigation">
            <button onClick={() => setDrawerOpen(false)} className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-faint hover:text-ink" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            <Sidebar path={path} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setDrawerOpen(true)} className="-ml-1.5 rounded-lg p-1.5 text-ink-muted hover:text-ink" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Logo to="/app" />
          <QuickAdd compact />
        </header>

        {user?.mode === 'demo' && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line bg-accent-soft px-4 py-2 text-center text-[13px] text-ink">
            <span>You’re exploring a demo household. Changes aren’t saved.</span>
            <a href={href('/signup')} className="font-medium text-accent hover:underline">Create your free account →</a>
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function Sidebar({ path }: { path: string }) {
  return (
    <>
      <div className="flex h-16 items-center px-5">
        <Logo to="/app" />
      </div>
      <div className="px-3">
        <ScopeSwitcher />
      </div>
      <nav className="mt-4 flex-1 overflow-y-auto px-3" aria-label="Main">
        <ul className="space-y-0.5">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/app' ? path === '/app' : path.startsWith(to);
            return (
              <li key={to}>
                <a
                  href={href(to)}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                    active ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:bg-surface-sunken/60 hover:text-ink',
                  )}
                >
                  <Icon className={cx('h-[18px] w-[18px]', active ? 'text-ink' : 'text-ink-faint')} aria-hidden />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 hidden px-1 lg:block">
          <QuickAdd />
        </div>
      </nav>
      <div className="border-t border-line p-3">
        <UserMenu path={path} />
      </div>
    </>
  );
}

function ScopeSwitcher() {
  const { data, scope, setScope } = useFinance();
  const openDialog = useOpenDialog();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, open, () => setOpen(false));

  const current = data.members.find((m) => m.id === scope);
  const options = [{ id: 'all', label: 'Whole household', sub: `${data.members.length} member${data.members.length === 1 ? '' : 's'}` }, ...data.members.map((m) => ({ id: m.id, label: m.name, sub: m.isPrimary ? 'You' : m.relation }))];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-left shadow-card transition-colors hover:border-line-strong"
      >
        {current ? (
          <MemberAvatar member={current} />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
            <Users className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Viewing</span>
          <span className="block truncate text-sm font-semibold text-ink">{current ? current.name : 'Whole household'}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-ink-faint" aria-hidden />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 mt-1.5 animate-fade-in rounded-xl border border-line bg-surface-raised p-1.5 shadow-lg" role="listbox" aria-label="Choose whose finances to view">
          {options.map((o) => {
            const m = data.members.find((x) => x.id === o.id);
            return (
              <button
                key={o.id}
                role="option"
                aria-selected={scope === o.id}
                onClick={() => {
                  setScope(o.id);
                  setOpen(false);
                }}
                className={cx('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-sunken', scope === o.id && 'bg-surface-sunken')}
              >
                {m ? <MemberAvatar member={m} size="sm" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-sunken text-ink-muted"><Users className="h-3 w-3" /></span>}
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{o.label}</span>
                <span className="text-xs text-ink-faint">{o.sub}</span>
              </button>
            );
          })}
          <div className="my-1 h-px bg-line" />
          <button
            onClick={() => {
              setOpen(false);
              openDialog({ type: 'member' });
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <UserPlus className="h-4 w-4" /> Add family member
          </button>
        </div>
      )}
    </div>
  );
}

function QuickAdd({ compact }: { compact?: boolean }) {
  const openDialog = useOpenDialog();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, open, () => setOpen(false));

  const items = [
    { label: 'Loan or credit card', onClick: () => openDialog({ type: 'liability' }) },
    { label: 'Expense', onClick: () => openDialog({ type: 'expense' }) },
    { label: 'Insurance policy', onClick: () => openDialog({ type: 'policy' }) },
    { label: 'Family member', onClick: () => openDialog({ type: 'member' }) },
  ];

  return (
    <div ref={ref} className="relative">
      {compact ? (
        <button onClick={() => setOpen((o) => !o)} className="-mr-1.5 rounded-lg p-1.5 text-ink hover:bg-surface-sunken" aria-label="Add new" aria-expanded={open}>
          <Plus className="h-5 w-5" />
        </button>
      ) : (
        <Button variant="primary" className="w-full" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Add new
        </Button>
      )}
      {open && (
        <div className={cx('absolute z-30 mt-1.5 w-56 animate-fade-in rounded-xl border border-line bg-surface-raised p-1.5 shadow-lg', compact ? 'right-0 top-full' : 'left-0 top-full')}>
          {items.map((i) => (
            <button
              key={i.label}
              onClick={() => {
                setOpen(false);
                i.onClick();
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface-sunken"
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ path }: { path: string }) {
  const { user, signOut } = useAuth();
  const { primary } = useFinance();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClose(ref, open, () => setOpen(false));
  if (!user) return null;

  const themes: { value: ThemePref; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute inset-x-0 bottom-full z-20 mb-1.5 animate-fade-in rounded-xl border border-line bg-surface-raised p-1.5 shadow-lg">
          <div className="px-2 pb-2 pt-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-faint">{user.email}</p>
          </div>
          <div className="mx-1 mb-1 flex rounded-lg bg-surface-sunken p-0.5" role="radiogroup" aria-label="Theme">
            {themes.map((t) => (
              <button
                key={t.value}
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium', theme === t.value ? 'bg-surface text-ink shadow-card' : 'text-ink-muted hover:text-ink')}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <a href={href('/app/settings')} onClick={() => setOpen(false)} className={cx('flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-surface-sunken', path === '/app/settings' ? 'text-ink' : 'text-ink-muted hover:text-ink')}>
            <Settings className="h-4 w-4" /> Settings & data
          </a>
          <button
            onClick={async () => {
              await signOut();
              navigate('/login', { replace: true });
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> {user.mode === 'demo' ? 'Exit demo' : 'Sign out'}
          </button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-surface-sunken">
        <MemberAvatar member={{ name: user.name, color: primary?.color ?? 'blue' }} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
          <span className="block truncate text-xs text-ink-faint">{user.mode === 'demo' ? 'Demo account' : user.email}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-ink-faint" aria-hidden />
      </button>
    </div>
  );
}

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}
