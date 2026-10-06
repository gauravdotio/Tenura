import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { DialogContext, type Dialog } from './context/DialogContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { PENDING_INVITE_KEY } from './lib/family';
import { JoinPage } from './pages/JoinPage';
import { navigate, useRoute } from './lib/router';
import { AppShell } from './components/layout/AppShell';
import { Button } from './components/ui';
import { LiabilityForm } from './components/forms/LiabilityForm';
import { ConvertToEmiForm } from './components/forms/ConvertToEmiForm';
import { ExpenseForm } from './components/forms/ExpenseForm';
import { PolicyForm } from './components/forms/PolicyForm';
import { MemberForm } from './components/forms/MemberForm';
import { AuthPage } from './pages/AuthPage';
import { LandingPage } from './pages/LandingPage';
import { AboutPage } from './pages/site/AboutPage';
import { ContactPage } from './pages/site/ContactPage';
import { PrivacyPage, SecurityPage, TermsPage } from './pages/site/LegalPages';
import { NotFoundPage } from './pages/site/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { LiabilitiesPage } from './pages/LiabilitiesPage';
import { EmiSchedulesPage } from './pages/EmiSchedulesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { InsurancePage } from './pages/InsurancePage';
import { HouseholdPage } from './pages/HouseholdPage';
import { SettingsPage } from './pages/SettingsPage';

// Recharts is the heaviest dependency — only load it when Analytics is opened
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <Router />
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

const PUBLIC_PAGES: Record<string, () => ReactNode> = {
  '/': () => <LandingPage />,
  '/about': () => <AboutPage />,
  '/contact': () => <ContactPage />,
  '/privacy': () => <PrivacyPage />,
  '/terms': () => <TermsPage />,
  '/security': () => <SecurityPage />,
};

function Router() {
  const { user, loading } = useAuth();
  const { active } = useWorkspace();
  const { path, params } = useRoute();
  const inApp = path === '/app' || path.startsWith('/app/');

  // Route guards
  useEffect(() => {
    if (loading) return;
    if (inApp && !user) navigate('/login', { replace: true });
    if (user && (path === '/login' || path === '/signup')) navigate('/app', { replace: true });
    // Someone opened an invite link before signing in: take them back to it
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      /* private mode */
    }
    if (user && pending && path !== '/join') navigate(`/join?code=${encodeURIComponent(pending)}`, { replace: true });
  }, [loading, user, inApp, path]);

  if (loading) return <FullScreenSpinner />;

  if (!inApp) {
    if (path === '/login' || path === '/signup') return user ? <FullScreenSpinner /> : <AuthPage key={path} mode={path === '/signup' ? 'signup' : 'login'} />;
    if (path === '/join') return <JoinPage code={params.get('code') ?? ''} />;
    const page = PUBLIC_PAGES[path];
    return page ? page() : <NotFoundPage />;
  }
  if (!user) return <FullScreenSpinner />;

  return (
    // Keyed by user + workspace: signing out or switching households discards all in-memory data
    <FinanceProvider key={`${user.id}:${active?.memberId ?? 'own'}`} user={user} shared={active}>
      <Workspace path={path} params={params} />
    </FinanceProvider>
  );
}

function Workspace({ path, params }: { path: string; params: URLSearchParams }) {
  const { status, retry, shared } = useFinance();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = useCallback(() => setDialog(null), []);

  let page: ReactNode;
  switch (path) {
    case '/app':
      page = <OverviewPage />;
      break;
    case '/app/liabilities':
      page = <LiabilitiesPage />;
      break;
    case '/app/emis':
      page = <EmiSchedulesPage key={params.get('plan') ?? ''} focusId={params.get('plan') ?? undefined} />;
      break;
    case '/app/expenses':
      page = <ExpensesPage />;
      break;
    case '/app/insurance':
      page = <InsurancePage />;
      break;
    case '/app/analytics':
      page = (
        <Suspense fallback={<InlineSpinner />}>
          <AnalyticsPage />
        </Suspense>
      );
      break;
    case '/app/household':
      // Only the account holder manages household members
      page = shared ? <NotFound /> : <HouseholdPage />;
      break;
    case '/app/settings':
      page = <SettingsPage />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <DialogContext.Provider value={setDialog}>
      <AppShell path={path}>
        {status === 'loading' && <InlineSpinner />}
        {status === 'error' && (
          <div className="flex flex-col items-center py-24 text-center">
            <AlertTriangle className="h-6 w-6 text-negative" />
            <h1 className="mt-3 text-lg font-semibold text-ink">Couldn’t load your data</h1>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">Check your connection and try again. Nothing has been lost.</p>
            <Button className="mt-5" onClick={retry}>Try again</Button>
          </div>
        )}
        {status === 'ready' && page}
      </AppShell>

      {status === 'ready' && dialog?.type === 'liability' && <LiabilityForm key={dialog.liability?.id ?? 'new'} liability={dialog.liability} onClose={close} />}
      {status === 'ready' && dialog?.type === 'convert' && <ConvertToEmiForm liability={dialog.liability} onClose={close} />}
      {status === 'ready' && dialog?.type === 'expense' && <ExpenseForm key={dialog.expense?.id ?? 'new'} expense={dialog.expense} onClose={close} />}
      {status === 'ready' && dialog?.type === 'policy' && <PolicyForm key={dialog.policy?.id ?? 'new'} policy={dialog.policy} onClose={close} />}
      {status === 'ready' && dialog?.type === 'member' && <MemberForm key={dialog.member?.id ?? 'new'} member={dialog.member} onClose={close} />}
    </DialogContext.Provider>
  );
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="text-lg font-semibold text-ink">Page not found</h1>
      <a href="#/app" className="mt-2 inline-block text-sm text-accent hover:underline">Back to overview</a>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
    </div>
  );
}

function InlineSpinner() {
  return (
    <div className="flex justify-center py-24" role="status" aria-label="Loading">
      <Loader2 className="h-5 w-5 animate-spin text-ink-faint" />
    </div>
  );
}
