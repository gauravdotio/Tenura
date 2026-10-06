import { useEffect, useState } from 'react';
import { CheckCircle2, Link2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { PENDING_INVITE_KEY, acceptInvite } from '../lib/family';
import { navigate } from '../lib/router';
import { ContentPage } from '../components/site/SiteChrome';
import { Button, Card } from '../components/ui';

const setPending = (code: string | null) => {
  try {
    if (code) sessionStorage.setItem(PENDING_INVITE_KEY, code);
    else sessionStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    /* private mode */
  }
};

/** Landing page for an invite link: /#/join?code=XXXXXXXX */
export function JoinPage({ code }: { code: string }) {
  const { user, backend, signOut } = useAuth();
  const { refresh, switchTo } = useWorkspace();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ memberName: string; ownerName: string; memberId: string } | null>(null);
  const clean = code.trim().toUpperCase();

  // Remember the code across sign-up / sign-in, which leave this page
  useEffect(() => {
    if (clean && !user) setPending(clean);
  }, [clean, user]);

  async function accept() {
    setState('busy');
    try {
      const r = await acceptInvite(clean);
      setPending(null);
      await refresh();
      setResult(r);
      setState('done');
    } catch (err) {
      setPending(null);
      setMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  let body;
  if (backend !== 'supabase') {
    body = <p className="text-sm text-ink-muted">Family logins need cloud sync, which isn’t set up in this copy of Tenura.</p>;
  } else if (!clean) {
    body = <p className="text-sm text-ink-muted">This invite link is missing its code. Ask the person who invited you to send it again.</p>;
  } else if (state === 'done' && result) {
    body = (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-positive" />
        <h2 className="mt-4 text-xl font-semibold text-ink">You’re in, {result.memberName.split(' ')[0]}!</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {result.ownerName} shared your profile with you. You can see and update your own loans, cards, EMIs, policies and expenses — nobody else’s.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-6"
          onClick={() => {
            switchTo(result.memberId);
            navigate('/app');
          }}
        >
          Open my profile
        </Button>
      </div>
    );
  } else if (!user) {
    body = (
      <>
        <p className="text-sm text-ink-muted">
          Sign in or create a free account with your own email to accept it. Your login stays yours — you’ll only see your own profile in their household.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" size="lg" onClick={() => navigate('/signup')}>Create account</Button>
          <Button size="lg" onClick={() => navigate('/login')}>I already have an account</Button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-ink-muted">
          You’re signed in as <span className="font-medium text-ink">{user.email}</span>. Accepting links this login to the profile you were invited to — you’ll see and manage only that profile’s data.
        </p>
        {state === 'error' && <p role="alert" className="mt-4 rounded-xl bg-negative-soft px-3 py-2.5 text-sm text-negative">{message}</p>}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="primary" size="lg" loading={state === 'busy'} onClick={accept} disabled={state === 'error'}>Accept invite</Button>
          <Button size="lg" variant="ghost" onClick={async () => { setPending(clean); await signOut(); navigate('/login'); }}>Use a different account</Button>
        </div>
      </>
    );
  }

  return (
    <ContentPage eyebrow="Invitation" title="You’ve been invited to Tenura" intro="A family member wants to share your loans, cards, EMIs and policies with you.">
      <Card className="mx-auto max-w-xl p-6 sm:p-8">
        {state !== 'done' && clean && (
          <div className="mb-6 flex items-center gap-3 rounded-xl bg-surface-sunken px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Link2 className="h-4 w-4" /></span>
            <div>
              <p className="text-xs text-ink-faint">Invite code</p>
              <p className="font-mono text-sm font-semibold tracking-widest text-ink">{clean}</p>
            </div>
            <Users className="ml-auto h-5 w-5 text-ink-faint" />
          </div>
        )}
        {body}
      </Card>
    </ContentPage>
  );
}
