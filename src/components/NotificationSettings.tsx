import { useEffect, useState } from 'react';
import { BellRing, Mail, MessageCircle, Send, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  DEFAULT_NOTIFICATIONS,
  disablePush,
  enablePush,
  loadNotificationSettings,
  needsInstallForPush,
  pushSupported,
  saveNotificationSettings,
  sendTestReminder,
  thisBrowserSubscribed,
  type NotificationSettings,
} from '../lib/notifications';
import { Button, Input, cx } from './ui';

const LEADS = [
  { value: 7, label: '7 days before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: '1 day before' },
  { value: 0, label: 'On the day' },
];

function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-positive' : 'bg-line-strong',
      )}
    >
      <span className={cx('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

function Row({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-ink-muted [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function NotificationSettingsPanel() {
  const { user, backend } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [saved, setSaved] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [loaded, setLoaded] = useState(false);
  const [deviceOn, setDeviceOn] = useState(false);
  const [busy, setBusy] = useState<'save' | 'push' | 'test' | null>(null);
  const cloud = backend === 'supabase' && user?.mode === 'supabase';

  useEffect(() => {
    if (!cloud) return;
    let cancelled = false;
    Promise.all([loadNotificationSettings(), thisBrowserSubscribed()])
      .then(([s, on]) => {
        if (cancelled) return;
        setSettings(s);
        setSaved(s);
        setDeviceOn(on);
        setLoaded(true);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cloud]);

  if (!cloud) {
    return <p className="text-sm text-ink-muted">Reminders are sent from the cloud, so they need cloud sync to be set up.</p>;
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  const set = (patch: Partial<NotificationSettings>) => setSettings((s) => ({ ...s, ...patch }));

  async function save(next = settings) {
    setBusy('save');
    try {
      await saveNotificationSettings(next);
      setSaved(next);
      toast.success('Reminder settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(null);
    }
  }

  async function togglePush(on: boolean) {
    setBusy('push');
    try {
      if (on) await enablePush();
      else await disablePush();
      setDeviceOn(on);
      const next = { ...settings, push_enabled: on || settings.push_enabled };
      setSettings(next);
      await saveNotificationSettings(next);
      setSaved(next);
      toast.success(on ? 'Notifications are on for this device' : 'Notifications turned off for this device');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not change notifications');
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy('test');
    try {
      if (dirty) await saveNotificationSettings(settings).then(() => setSaved(settings));
      const result = await sendTestReminder();
      const sent = Object.entries(result).filter(([, v]) => v === 'sent').map(([k]) => k);
      if (sent.length) toast.success(`Test sent by ${sent.join(' and ')}`);
      else toast.error('Nothing was sent — turn on a channel first, or the reminder service isn’t fully set up yet.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send a test');
    } finally {
      setBusy(null);
    }
  }

  const toggleLead = (v: number) => {
    const has = settings.days_before.includes(v);
    const next = has ? settings.days_before.filter((d) => d !== v) : [...settings.days_before, v].sort((a, b) => b - a);
    if (next.length) set({ days_before: next });
  };

  return (
    <div className={cx('transition-opacity', !loaded && 'pointer-events-none opacity-60')} aria-busy={!loaded}>
      <div className="divide-y divide-line rounded-xl border border-line px-4">
        <Row icon={<Mail />} title="Email" hint={<>Sent to {user?.email}</>}>
          <Switch checked={settings.email_enabled} onChange={(v) => set({ email_enabled: v })} label="Email reminders" />
        </Row>
        <Row
          icon={<Smartphone />}
          title="Push on this device"
          hint={
            !pushSupported()
              ? 'This browser doesn’t support notifications.'
              : needsInstallForPush()
                ? 'On iPhone: tap Share → “Add to Home Screen”, open Tenura from there, then turn this on.'
                : 'A notification on this phone or computer, even when Tenura is closed.'
          }
        >
          <Switch checked={deviceOn} onChange={togglePush} label="Push notifications on this device" disabled={!pushSupported() || needsInstallForPush() || busy === 'push'} />
        </Row>
        <Row
          icon={<MessageCircle />}
          title="WhatsApp"
          hint={
            <>
              <span className="mr-1 rounded bg-warning-soft px-1.5 py-0.5 font-medium text-warning">Coming soon</span>
              Opt in now and reminders start once Tenura’s WhatsApp Business number is approved.
              {settings.whatsapp_enabled && (
                <Input
                  className="mt-2 h-9 max-w-[220px]"
                  type="tel"
                  inputMode="tel"
                  value={settings.whatsapp_number ?? ''}
                  onChange={(e) => set({ whatsapp_number: e.target.value || null })}
                  placeholder="WhatsApp number"
                  aria-label="WhatsApp number"
                />
              )}
            </>
          }
        >
          <Switch checked={settings.whatsapp_enabled} onChange={(v) => set({ whatsapp_enabled: v })} label="WhatsApp reminders" />
        </Row>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-ink">Remind me</p>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="When to remind">
          {LEADS.map((l) => {
            const on = settings.days_before.includes(l.value);
            return (
              <button
                key={l.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLead(l.value)}
                className={cx('rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors', on ? 'border-ink bg-ink text-ink-inverse' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink')}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
        <span className="flex items-center gap-3">
          <BellRing className="h-4 w-4 text-ink-muted" />
          <span>
            <span className="block text-sm font-medium text-ink">Monthly summary</span>
            <span className="block text-xs text-ink-muted">On the 1st: everything due that month, in one message.</span>
          </span>
        </span>
        <Switch checked={settings.monthly_digest} onChange={(v) => set({ monthly_digest: v })} label="Monthly summary" />
      </label>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => save()} loading={busy === 'save'} disabled={!dirty}>Save</Button>
        <Button onClick={test} loading={busy === 'test'} icon={<Send className="h-4 w-4" />}>Send me a test</Button>
      </div>
    </div>
  );
}
