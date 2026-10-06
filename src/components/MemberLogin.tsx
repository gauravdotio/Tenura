import { useState } from 'react';
import { Check, Copy, KeyRound, Mail, MessageCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Member } from '../lib/finance/types';
import { createInvite, inviteLink, inviteMessage, unlinkMember, whatsAppShareUrl } from '../lib/family';
import { formatDate } from '../lib/finance/dates';
import { Badge, Button, ConfirmDialog, Modal } from './ui';

type LinkState = { linked: boolean; code?: string; expiresAt?: string };

/**
 * Login status for one household member, with invite / share / remove-login
 * actions. Status is kept locally after an action so the page doesn't reload.
 */
export function MemberLogin({ member }: { member: Member }) {
  const { user, backend } = useAuth();
  const toast = useToast();
  const [state, setState] = useState<LinkState>({
    linked: Boolean(member.linkedUserId),
    code: member.inviteCode,
    expiresAt: member.inviteExpiresAt,
  });
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  if (member.isPrimary) return null;

  const pending = !state.linked && state.code && state.expiresAt && new Date(state.expiresAt) > new Date();

  async function invite() {
    setBusy(true);
    try {
      const { code, expiresAt } = await createInvite(member.id);
      setState({ linked: false, code, expiresAt });
      setSharing(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create an invite');
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await unlinkMember(member.id);
      setState({ linked: false });
      toast.success(`${member.name} can no longer log in to your household`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the login');
    } finally {
      setBusy(false);
      setConfirmUnlink(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-line px-3 py-2.5">
      {backend !== 'supabase' ? (
        <p className="flex items-center gap-2 text-xs text-ink-faint">
          <KeyRound className="h-3.5 w-3.5" /> Family logins need cloud sync.
        </p>
      ) : state.linked ? (
        <div className="flex items-center justify-between gap-2">
          <Badge tone="positive"><UserCheck className="h-3 w-3" /> Has their own login</Badge>
          <button onClick={() => setConfirmUnlink(true)} className="text-xs font-medium text-ink-muted hover:text-negative">Remove login</button>
        </div>
      ) : pending ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-muted">
            <Badge tone="warning">Invite sent</Badge> <span className="ml-1">expires {formatDate(state.expiresAt!.slice(0, 10))}</span>
          </span>
          <button onClick={() => setSharing(true)} className="text-xs font-medium text-accent hover:underline">Share again</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-muted">Let {member.name.split(' ')[0]} see their own profile</span>
          <Button size="sm" loading={busy} onClick={invite} icon={<KeyRound className="h-3.5 w-3.5" />}>Invite to log in</Button>
        </div>
      )}

      {sharing && state.code && (
        <ShareInvite
          member={member}
          ownerName={user?.name ?? 'Your family member'}
          code={state.code}
          expiresAt={state.expiresAt!}
          onClose={() => setSharing(false)}
        />
      )}
      <ConfirmDialog
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={unlink}
        busy={busy}
        confirmLabel="Remove login"
        title={`Remove ${member.name}’s login?`}
        description={`${member.name} will immediately lose access to their profile in your household. Their data stays with you, and you can invite them again any time.`}
      />
    </div>
  );
}

function ShareInvite({ member, ownerName, code, expiresAt, onClose }: { member: Member; ownerName: string; code: string; expiresAt: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(code);
  const message = inviteMessage(member.name, ownerName, code);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is visible to copy by hand */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Invite ${member.name}`}
      description={`Send this link to ${member.name.split(' ')[0]}. It works once and expires on ${formatDate(expiresAt.slice(0, 10))}.`}
      size="sm"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-surface-sunken p-3">
          <p className="text-xs text-ink-faint">Invite link</p>
          <p className="mt-1 break-all font-mono text-[13px] text-ink">{link}</p>
        </div>
        <div className="grid gap-2">
          <a
            href={whatsAppShareUrl(message, member.phone)}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="h-4 w-4" /> Send on WhatsApp{member.phone ? ` to ${member.phone}` : ''}
          </a>
          {member.email && (
            <a
              href={`mailto:${member.email}?subject=${encodeURIComponent('Your Tenura login')}&body=${encodeURIComponent(message)}`}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium text-ink hover:bg-surface-sunken"
            >
              <Mail className="h-4 w-4" /> Email {member.email}
            </a>
          )}
          <Button onClick={copy} icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}>{copied ? 'Copied' : 'Copy link'}</Button>
        </div>
        <p className="flex gap-2 text-xs text-ink-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-positive" />
          They’ll sign in with their own email and see only {member.name.split(' ')[0]}’s loans, cards, EMIs, policies and expenses — never yours or anyone else’s.
        </p>
      </div>
    </Modal>
  );
}
