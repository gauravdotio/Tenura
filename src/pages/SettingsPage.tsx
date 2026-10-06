import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Archive, BellRing, Cloud, Download, FileJson, HardDrive, Monitor, Moon, Palette, Sun, Upload, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { downloadFile, liabilitiesCsv, makeBackup, parseBackup } from '../lib/finance/backup';
import { outstandingFor } from '../lib/finance/calc';
import { toISODate } from '../lib/finance/dates';
import type { FinanceData } from '../lib/finance/types';
import { findLegacyVaults } from '../lib/auth/localAuth';
import { navigate } from '../lib/router';
import { pluralize } from '../lib/format';
import { Button, Card, ConfirmDialog, Field, Input, PageHeader, Segmented, cx } from '../components/ui';
import type { Tint } from '../components/Visuals';
import { NotificationSettingsPanel } from '../components/NotificationSettings';

const TINTS: Record<Tint, string> = {
  accent: 'bg-accent-soft text-accent',
  negative: 'bg-negative-soft text-negative',
  warning: 'bg-warning-soft text-warning',
  positive: 'bg-positive-soft text-positive',
  neutral: 'bg-surface-sunken text-ink-muted',
};

function Section({ title, description, icon, tint = 'neutral', children }: { title: string; description?: string; icon?: ReactNode; tint?: Tint; children: ReactNode }) {
  return (
    <Card className="grid gap-6 p-5 md:grid-cols-[240px_1fr] md:p-6">
      <div>
        {icon && <span className={cx('mb-3 flex h-9 w-9 items-center justify-center rounded-xl [&>svg]:h-4 [&>svg]:w-4', TINTS[tint])}>{icon}</span>}
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-ink-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </Card>
  );
}

export function SettingsPage() {
  const { user, updateName, deleteAccount } = useAuth();
  const { data, storage, installmentsByLiability, replaceData, clearAllData, shared } = useFinance();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ data: FinanceData; source: string } | null>(null);
  const [confirm, setConfirm] = useState<'clear' | 'delete' | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const legacy = useMemo(() => findLegacyVaults(), []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await updateName(name);
      toast.success('Name updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your name');
    } finally {
      setSavingName(false);
    }
  }

  function exportJson() {
    downloadFile(`tenura-backup-${toISODate(new Date())}.json`, JSON.stringify(makeBackup(data), null, 2), 'application/json');
  }
  function exportCsv() {
    const csv = liabilitiesCsv(data, (l) => outstandingFor(l, installmentsByLiability.get(l.id) ?? []));
    downloadFile(`tenura-loans-${toISODate(new Date())}.csv`, csv, 'text/csv');
  }

  function stageImport(text: string, source: string) {
    const result = parseBackup(text);
    if (!result.ok) return toast.error(result.error);
    setPendingImport({ data: result.data, source });
  }

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      toast.success(done);
      setConfirm(null);
      setPendingImport(null);
    } catch {
      /* toast shown by the data layer */
    } finally {
      setBusy(false);
    }
  }

  const counts = (d: FinanceData) =>
    [pluralize(d.members.length, 'member'), pluralize(d.liabilities.length, 'loan/card', 'loans/cards'), pluralize(d.expenses.length, 'expense'), pluralize(d.policies.length, 'policy', 'policies')].join(', ');

  return (
    <div className="animate-fade-in space-y-4">
      <PageHeader title="Settings" description="Your account, appearance and data." />

      <Section title="Account" description="How you appear in Tenura." icon={<UserRound />} tint="accent">
        <form onSubmit={saveName} className="grid max-w-md gap-4">
          <Field label="Name" htmlFor="set-name">
            <Input id="set-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="set-email">
            <Input id="set-email" value={user?.email ?? ''} disabled readOnly />
          </Field>
          <Button type="submit" variant="primary" className="justify-self-start" loading={savingName} disabled={name.trim() === user?.name}>
            Save
          </Button>
        </form>
      </Section>

      <Section title="Reminders" description="Get a nudge before every EMI, card bill and premium — for you, and for anyone you’ve linked." icon={<BellRing />} tint="warning">
        <NotificationSettingsPanel />
      </Section>

      <Section title="Appearance" icon={<Palette />} tint="warning">
        <Segmented
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: <span className="flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" /> Light</span> },
            { value: 'dark', label: <span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Dark</span> },
            { value: 'system', label: <span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" /> System</span> },
          ]}
        />
      </Section>

      <Section title="Storage" description="Where your household’s data lives." icon={<Cloud />} tint="positive">
        <div className="flex items-start gap-3 rounded-xl bg-surface-sunken p-4">
          {storage === 'supabase' ? <Cloud className="mt-0.5 h-5 w-5 text-positive" /> : <HardDrive className="mt-0.5 h-5 w-5 text-ink-muted" />}
          <div className="text-sm">
            <p className="font-medium text-ink">
              {storage === 'supabase' ? 'Synced to the cloud' : 'Stored in this browser'}
            </p>
            <p className="mt-0.5 text-ink-muted">
              {storage === 'supabase'
                ? 'Saved to your private Postgres database. Row-level security means only you can read it.'
                : 'Data stays on this device. Export a backup regularly, or connect Supabase to sync across devices.'}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Backup & restore" description="Download everything as JSON, or your loans as a spreadsheet." icon={<Archive />} tint="accent">
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download className="h-4 w-4" />} onClick={exportJson}>Export backup (.json)</Button>
          <Button icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export loans (.csv)</Button>
          {!shared && <Button icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>Restore from backup…</Button>}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) stageImport(await file.text(), file.name);
            }}
          />
        </div>
        <p className="mt-3 text-xs text-ink-faint">Backups from the previous version of Tenura can be restored too.</p>

        {!shared && legacy.length > 0 && (
          <div className="mt-5 rounded-xl border border-line p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-ink"><FileJson className="h-4 w-4 text-ink-faint" /> Data from the previous version found in this browser</p>
            <ul className="mt-3 space-y-2">
              {legacy.map((v) => (
                <li key={v.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-ink-muted">{v.label}</span>
                  <Button size="sm" onClick={() => stageImport(v.json, 'previous version')}>Import</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Danger zone" description="These can’t be undone." icon={<AlertTriangle />} tint="negative">
        <div className="flex flex-wrap gap-2">
          {!shared && <Button className="text-negative hover:text-negative" onClick={() => setConfirm('clear')}>Clear all data…</Button>}
          <Button variant="danger" onClick={() => setConfirm('delete')}>Delete my account…</Button>
        </div>
      </Section>

      <ConfirmDialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        onConfirm={() => pendingImport && void run(() => replaceData(pendingImport.data), 'Backup restored')}
        busy={busy}
        tone="primary"
        confirmLabel="Replace my data"
        title="Restore this backup?"
        description={
          pendingImport && (
            <>
              <p>From <span className="font-medium text-ink">{pendingImport.source}</span>: {counts(pendingImport.data)}.</p>
              <p className="mt-2">This replaces everything currently in your account ({counts(data)}). Export a backup first if you want to keep it.</p>
            </>
          )
        }
      />
      <ConfirmDialog
        open={confirm === 'clear'}
        onClose={() => setConfirm(null)}
        onConfirm={() => void run(clearAllData, 'All data cleared')}
        busy={busy}
        confirmLabel="Clear everything"
        title="Clear all data?"
        description="Every loan, card, EMI schedule, expense, policy and family member will be deleted. Your account stays. This can’t be undone."
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => {
          setConfirm(null);
          setDeleteText('');
        }}
        onConfirm={() => {
          if (deleteText !== 'DELETE') return;
          setBusy(true);
          deleteAccount()
            .then(() => navigate('/', { replace: true }))
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : 'Could not delete your account');
              setBusy(false);
            });
        }}
        busy={busy}
        confirmLabel="Delete account"
        confirmDisabled={deleteText !== 'DELETE'}
        title="Delete your account?"
        description={
          <div className="space-y-3">
            <p>Your login and all of your household’s data will be permanently deleted.</p>
            <Field label="Type DELETE to confirm" htmlFor="del-confirm">
              <Input id="del-confirm" value={deleteText} onChange={(e) => setDeleteText(e.target.value)} autoComplete="off" />
            </Field>
          </div>
        }
      />
    </div>
  );
}
