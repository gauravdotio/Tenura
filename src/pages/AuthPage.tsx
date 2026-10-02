import { useState, type FormEvent } from 'react';
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { href, navigate } from '../lib/router';
import { Logo } from '../components/layout/Logo';
import { Button, Field, Input } from '../components/ui';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { signIn, signUp, startDemo, backend } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null);
  const isSignup = mode === 'signup';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const errs: Record<string, string> = {};
    if (isSignup && !name.trim()) errs.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (password.length < (isSignup ? 8 : 1)) errs.password = isSignup ? 'Use at least 8 characters.' : 'Enter your password.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      if (isSignup) {
        const { confirmEmail } = await signUp({ name, email, password });
        if (confirmEmail) {
          setConfirmSentTo(email.trim());
          setBusy(false);
          return;
        }
      } else {
        await signIn(email, password);
      }
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <a href={href('/')} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Home
          </a>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          {confirmSentTo ? (
            <div className="animate-fade-in text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-positive-soft text-positive">
                <MailCheck className="h-6 w-6" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Check your inbox</h1>
              <p className="mt-2 text-sm text-ink-muted">
                We sent a confirmation link to <span className="font-medium text-ink">{confirmSentTo}</span>. Open it to activate your account, then sign in.
              </p>
              <Button className="mt-6 w-full" onClick={() => navigate('/login')}>Go to sign in</Button>
            </div>
          ) : (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{isSignup ? 'Create your account' : 'Welcome back'}</h1>
              <p className="mt-1.5 text-sm text-ink-muted">
                {isSignup ? 'One place for your family’s loans, EMIs, bills and policies.' : 'Sign in to see your household’s finances.'}
              </p>

              <form onSubmit={submit} className="mt-8 grid gap-4" noValidate>
                {isSignup && (
                  <Field label="Your name" error={fieldErrors.name} htmlFor="auth-name">
                    <Input id="auth-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gaurav Rawat" />
                  </Field>
                )}
                <Field label="Email" error={fieldErrors.email} htmlFor="auth-email">
                  <Input id="auth-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </Field>
                <Field label="Password" error={fieldErrors.password} hint={isSignup ? 'At least 8 characters.' : undefined} htmlFor="auth-password">
                  <div className="relative">
                    <Input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint hover:text-ink"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                {error && <p role="alert" className="rounded-xl bg-negative-soft px-3 py-2.5 text-sm text-negative">{error}</p>}

                <Button type="submit" variant="primary" size="lg" loading={busy} className="mt-2 w-full">
                  {isSignup ? 'Create account' : 'Sign in'}
                </Button>
                {isSignup && (
                  <p className="text-center text-xs text-ink-faint">
                    By creating an account you agree to our{' '}
                    <a href={href('/terms')} className="underline underline-offset-2 hover:text-ink">Terms</a> and{' '}
                    <a href={href('/privacy')} className="underline underline-offset-2 hover:text-ink">Privacy policy</a>.
                  </p>
                )}
              </form>

              <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  startDemo();
                  navigate('/app', { replace: true });
                }}
              >
                Explore the demo — no sign-up
              </Button>

              <p className="mt-8 text-center text-sm text-ink-muted">
                {isSignup ? 'Already have an account? ' : 'New to Tenura? '}
                <a href={href(isSignup ? '/login' : '/signup')} className="font-medium text-ink underline-offset-4 hover:underline">
                  {isSignup ? 'Sign in' : 'Create an account'}
                </a>
              </p>
              {backend === 'local' && (
                <p className="mt-6 rounded-xl border border-line px-3 py-2.5 text-xs text-ink-faint">
                  Running without a cloud backend — accounts and data are stored in this browser only. Connect Supabase to sync across devices.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthAside />
    </div>
  );
}

function AuthAside() {
  const rows = [
    { t: 'HDFC Personal Loan', s: 'EMI 9 of 36', a: '₹9,894', d: 'In 3 days', tone: 'text-warning' },
    { t: 'LIC Jeevan Labh', s: 'Yearly premium', a: '₹48,500', d: 'In 9 days', tone: 'text-ink-faint' },
    { t: 'SBI Card ··7713', s: 'Card bill', a: '₹26,000', d: 'In 5 days', tone: 'text-ink-faint' },
  ];
  return (
    <div className="relative hidden overflow-hidden border-l border-line bg-surface-sunken lg:flex lg:items-center lg:justify-center">
      <div className="w-full max-w-md px-10">
        <p className="text-sm font-medium text-ink-muted">Coming up this month</p>
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface shadow-lg">
          {rows.map((r) => (
            <div key={r.t} className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-ink">{r.t}</p>
                <p className="text-xs text-ink-faint">{r.s}</p>
              </div>
              <div className="text-right">
                <p className="num text-sm font-semibold text-ink">{r.a}</p>
                <p className={`text-xs ${r.tone}`}>{r.d}</p>
              </div>
            </div>
          ))}
        </div>
        <blockquote className="mt-10 text-lg font-medium leading-relaxed tracking-tight text-ink">
          “Every EMI, card bill and LIC premium for the whole family — finally in one list.”
        </blockquote>
      </div>
    </div>
  );
}
