/**
 * Pure planning logic for reminders: given everything that is coming due and
 * each person's notification settings, decide which messages to send today.
 * No I/O here, so it can be unit-tested and reused by any channel.
 */

export interface DueItem {
  recipient_id: string;
  recipient_email: string | null;
  recipient_name: string;
  item_key: string;
  kind: 'installment' | 'card' | 'premium';
  title: string;
  subtitle: string;
  amount: number | string;
  due_date: string; // YYYY-MM-DD
  member_name: string;
}

export interface NotifySettings {
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  days_before: number[];
  monthly_digest: boolean;
}

export const DEFAULT_SETTINGS: NotifySettings = {
  email_enabled: true,
  push_enabled: false,
  whatsapp_enabled: false,
  whatsapp_number: null,
  days_before: [3, 1],
  monthly_digest: true,
};

export type Channel = 'email' | 'push' | 'whatsapp';

export interface Message {
  userId: string;
  channel: Channel;
  kind: 'due' | 'digest' | 'test';
  /** Rows to write to reminder_log; a message is only sent if they were not logged before. */
  log: { item_key: string; due_date: string }[];
  to: string | null; // email address or WhatsApp number; null for push
  subject: string;
  text: string;
  html: string;
  push: { title: string; body: string; url: string };
  /** Structured lines, used for WhatsApp templates. */
  items: DueItem[];
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const formatINR = (n: number | string) => inr.format(Number(n) || 0);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const toUTC = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

export function daysBetween(fromIso: string, toIso: string) {
  return Math.round((toUTC(toIso) - toUTC(fromIso)) / 86_400_000);
}

/** Today's date in India, YYYY-MM-DD. */
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const when = (days: number) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function emailHtml(heading: string, intro: string, items: DueItem[], siteUrl: string, showMember: boolean) {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #ecebe6">
          <div style="font-weight:600;color:#161614">${escapeHtml(i.title)}</div>
          <div style="font-size:13px;color:#6b6a65">${escapeHtml(i.subtitle)}${showMember ? ` · ${escapeHtml(i.member_name)}` : ''} · due ${formatDate(i.due_date)}</div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #ecebe6;text-align:right;font-weight:600;color:#161614;white-space:nowrap">${formatINR(i.amount)}</td>
      </tr>`,
    )
    .join('');
  const total = items.reduce((s, i) => s + Number(i.amount), 0);
  return `<!doctype html><html><body style="margin:0;background:#f6f6f3;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-size:18px;font-weight:700;color:#161614;margin-bottom:24px">Tenura</div>
    <div style="background:#fff;border:1px solid #e4e3dd;border-radius:16px;padding:24px">
      <h1 style="margin:0 0 6px;font-size:20px;color:#161614">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 16px;color:#58574f;font-size:14px">${escapeHtml(intro)}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
        <tr><td style="padding-top:12px;font-weight:600">Total</td><td style="padding-top:12px;text-align:right;font-weight:700">${formatINR(total)}</td></tr>
      </table>
      <a href="${siteUrl}/#/app" style="display:inline-block;margin-top:20px;background:#161614;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:600">Open Tenura</a>
    </div>
    <p style="font-size:12px;color:#8a8983;margin-top:16px">You’re receiving this because reminders are on in Tenura → Settings → Notifications.</p>
  </div></body></html>`;
}

function textBody(intro: string, items: DueItem[], siteUrl: string) {
  return `${intro}\n\n${items.map((i) => `• ${i.title} — ${formatINR(i.amount)} (${i.subtitle}, due ${formatDate(i.due_date)})`).join('\n')}\n\nOpen Tenura: ${siteUrl}/#/app`;
}

function build(
  userId: string,
  first: DueItem,
  settings: NotifySettings,
  kind: Message['kind'],
  items: DueItem[],
  heading: string,
  intro: string,
  pushTitle: string,
  pushBody: string,
  siteUrl: string,
): Message[] {
  const showMember = new Set(items.map((i) => i.member_name)).size > 1;
  const base = {
    userId,
    kind,
    log: items.map((i) => ({ item_key: kind === 'digest' ? `digest-${i.due_date.slice(0, 7)}` : i.item_key, due_date: kind === 'digest' ? `${i.due_date.slice(0, 7)}-01` : i.due_date })),
    subject: heading,
    text: textBody(intro, items, siteUrl),
    html: emailHtml(heading, intro, items, siteUrl, showMember),
    push: { title: pushTitle, body: pushBody, url: `${siteUrl}/#/app` },
    items,
  };
  // a digest is one log row, not one per item
  if (kind === 'digest') base.log = [base.log[0]];
  const out: Message[] = [];
  if (settings.email_enabled && first.recipient_email) out.push({ ...base, channel: 'email', to: first.recipient_email });
  if (settings.push_enabled) out.push({ ...base, channel: 'push', to: null });
  if (settings.whatsapp_enabled && settings.whatsapp_number) out.push({ ...base, channel: 'whatsapp', to: settings.whatsapp_number });
  return out;
}

export function planReminders(
  items: DueItem[],
  settingsByUser: Map<string, NotifySettings>,
  today: string,
  siteUrl: string,
): Message[] {
  const byUser = new Map<string, DueItem[]>();
  for (const i of items) byUser.set(i.recipient_id, [...(byUser.get(i.recipient_id) ?? []), i]);

  const messages: Message[] = [];
  for (const [userId, list] of byUser) {
    const settings = settingsByUser.get(userId) ?? DEFAULT_SETTINGS;
    const first = list[0];
    const firstName = first.recipient_name.split(' ')[0];

    // "Due soon" — one message per lead time (e.g. everything due in 3 days)
    for (const lead of [...new Set(settings.days_before)].sort((a, b) => b - a)) {
      const due = list.filter((i) => daysBetween(today, i.due_date) === lead);
      if (!due.length) continue;
      const total = due.reduce((s, i) => s + Number(i.amount), 0);
      const heading = due.length === 1 ? `${due[0].title} — ${formatINR(due[0].amount)} due ${when(lead)}` : `${due.length} payments due ${when(lead)} · ${formatINR(total)}`;
      const intro = `Hi ${firstName}, here’s what’s due ${when(lead)} (${formatDate(due[0].due_date)}).`;
      const pushBody = due.length === 1 ? `${due[0].subtitle} · ${formatINR(due[0].amount)} due ${when(lead)}` : due.map((i) => i.title).slice(0, 3).join(', ') + (due.length > 3 ? '…' : '');
      messages.push(...build(userId, first, settings, 'due', due, heading, intro, due.length === 1 ? due[0].title : heading, pushBody, siteUrl));
    }

    // "This month at a glance" on the 1st
    if (settings.monthly_digest && today.endsWith('-01')) {
      const month = today.slice(0, 7);
      const inMonth = list.filter((i) => i.due_date.startsWith(month));
      if (inMonth.length) {
        const total = inMonth.reduce((s, i) => s + Number(i.amount), 0);
        const monthName = formatDate(today).split(' ').slice(1).join(' ');
        const heading = `${monthName} at a glance · ${formatINR(total)} due`;
        const intro = `Hi ${firstName}, ${inMonth.length} payment${inMonth.length === 1 ? '' : 's'} fall due this month.`;
        messages.push(...build(userId, first, settings, 'digest', inMonth, heading, intro, heading, `${inMonth.length} payments this month · ${formatINR(total)}`, siteUrl));
      }
    }
  }
  return messages;
}
