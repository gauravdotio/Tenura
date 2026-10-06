// Supabase Edge Function: send-reminders
//
//   POST {"mode":"run"}   — daily job (schedule it from Supabase → Integrations → Cron).
//                           Must be called with the service-role key or the CRON_SECRET header.
//   POST {"mode":"test"}  — sends a test reminder to the signed-in caller only.
//
// Secrets (Supabase → Edge Functions → Secrets). Every channel is optional:
//   RESEND_API_KEY, REMINDER_FROM            email via Resend
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,     web push
//   VAPID_SUBJECT (mailto:you@example.com)
//   WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WhatsApp Cloud API (approved utility template)
//   WHATSAPP_TEMPLATE (default "payment_reminder"), WHATSAPP_LANG (default "en")
//   SITE_URL (default https://tenura.gauravdot.in), CRON_SECRET (optional)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the platform.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { DEFAULT_SETTINGS, formatDate, formatINR, planReminders, todayInIndia, type DueItem, type Message, type NotifySettings } from './plan.ts';

const env = (k: string) => Deno.env.get(k) ?? '';
const SITE_URL = env('SITE_URL') || 'https://tenura.gauravdot.in';
// Projects may expose the legacy service-role JWT, the newer sb_secret_ key, or both
const SERVER_KEYS = [env('SUPABASE_SERVICE_ROLE_KEY'), env('SUPABASE_SECRET_KEY'), ...secretKeys()].filter(Boolean);
function secretKeys(): string[] {
  // Newer projects expose SUPABASE_SECRET_KEYS as JSON, e.g. {"default":"sb_secret_..."}
  try {
    return Object.values(JSON.parse(env('SUPABASE_SECRET_KEYS') || '{}')).filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}
const admin = createClient(env('SUPABASE_URL'), SERVER_KEYS[0], { auth: { persistSession: false } });

const pushReady = Boolean(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY'));
if (pushReady) webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:reminders@tenura.app', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info' } });

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

async function sendEmail(m: Message) {
  if (!env('RESEND_API_KEY')) throw new Error('email not configured');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('REMINDER_FROM') || 'Tenura <onboarding@resend.dev>', to: [m.to], subject: m.subject, html: m.html, text: m.text }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

async function sendPush(m: Message) {
  if (!pushReady) throw new Error('push not configured');
  const { data: subs } = await admin.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', m.userId);
  if (!subs?.length) throw new Error('no push subscriptions');
  let delivered = 0;
  for (const s of subs) {
    if (!isPushService(s.endpoint)) continue; // never post anywhere but a real push service

    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m.push), { TTL: 60 * 60 * 24 });
      delivered++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // Browser unsubscribed or the subscription expired — forget it
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push failed', status, err);
    }
  }
  if (!delivered) throw new Error('no push delivered');
}

/** WhatsApp Cloud API with an approved utility template: {{1}} name, {{2}} item, {{3}} amount, {{4}} due date. */
async function sendWhatsApp(m: Message) {
  if (!env('WHATSAPP_TOKEN') || !env('WHATSAPP_PHONE_NUMBER_ID')) throw new Error('whatsapp not configured');
  const to = (m.to ?? '').replace(/[^0-9]/g, '').replace(/^(?!91)(\d{10})$/, '91$1');
  for (const i of m.items) {
    const res = await fetch(`https://graph.facebook.com/v21.0/${env('WHATSAPP_PHONE_NUMBER_ID')}/messages`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env('WHATSAPP_TOKEN')}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: env('WHATSAPP_TEMPLATE') || 'payment_reminder',
          language: { code: env('WHATSAPP_LANG') || 'en' },
          components: [{ type: 'body', parameters: [i.recipient_name.split(' ')[0], i.title, formatINR(i.amount), formatDate(i.due_date)].map((text) => ({ type: 'text', text })) }],
        },
      }),
    });
    if (!res.ok) throw new Error(`whatsapp ${res.status}: ${await res.text()}`);
  }
}

const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]*push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/;
function isPushService(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname);
  } catch {
    return false;
  }
}

const SENDERS = { email: sendEmail, push: sendPush, whatsapp: sendWhatsApp } as const;

/** Log first (so concurrent runs can't double-send), send, and un-log on failure so tomorrow retries. */
async function deliver(m: Message) {
  const rows = m.log.map((l) => ({ user_id: m.userId, item_key: l.item_key, due_date: l.due_date, channel: m.channel, kind: m.kind }));
  if (m.kind !== 'test') {
    const { data, error } = await admin.from('reminder_log').upsert(rows, { onConflict: 'user_id,item_key,due_date,channel,kind', ignoreDuplicates: true }).select('item_key');
    if (error) throw error;
    if (!data?.length) return 'skipped';
  }
  try {
    await SENDERS[m.channel](m);
    return 'sent';
  } catch (err) {
    if (m.kind !== 'test') {
      for (const r of rows) {
        await admin.from('reminder_log').delete().match(r);
      }
    }
    console.error(`${m.channel} to ${m.userId} failed:`, err instanceof Error ? err.message : err);
    return 'failed';
  }
}

async function loadSettings(userIds: string[]) {
  const map = new Map<string, NotifySettings>();
  if (!userIds.length) return map;
  const { data } = await admin.from('notification_settings').select('*').in('user_id', userIds);
  for (const s of data ?? []) map.set(s.user_id, { ...DEFAULT_SETTINGS, ...s });
  return map;
}

// ---------------------------------------------------------------------------

async function runDaily() {
  const today = todayInIndia();
  const until = new Date(Date.parse(`${today}T00:00:00Z`) + 40 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await admin.rpc('upcoming_items', { p_from: today, p_to: until });
  if (error) throw error;
  const items = (data ?? []) as DueItem[];
  const settings = await loadSettings([...new Set(items.map((i) => i.recipient_id))]);
  const messages = planReminders(items, settings, today, SITE_URL);
  const results = { sent: 0, skipped: 0, failed: 0 };
  for (const m of messages) results[await deliver(m)]++;
  return { today, items: items.length, messages: messages.length, ...results };
}

async function runTest(userId: string, email: string | undefined, name: string) {
  const settings = (await loadSettings([userId])).get(userId) ?? DEFAULT_SETTINGS;
  const sample: DueItem = {
    recipient_id: userId, recipient_email: email ?? null, recipient_name: name, item_key: 'test', kind: 'installment',
    title: 'Test reminder', subtitle: 'This is how Tenura reminders look', amount: 1234, due_date: todayInIndia(), member_name: name,
  };
  const messages = planReminders([{ ...sample }], new Map([[userId, { ...settings, days_before: [0], monthly_digest: false }]]), todayInIndia(), SITE_URL)
    .map((m) => ({ ...m, kind: 'test' as const, subject: 'Tenura test reminder', push: { ...m.push, title: 'Tenura reminders are on ✅', body: 'You’ll get a nudge before every EMI, bill and premium.' } }));
  const out: Record<string, string> = {};
  for (const m of messages) out[m.channel] = await deliver(m);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({});
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const body = await req.json().catch(() => ({}));
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');

  try {
    if (body.mode === 'test') {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return json({ error: 'sign in first' }, 401);
      const u = data.user;
      const name = (u.user_metadata?.full_name as string) || u.email?.split('@')[0] || 'there';
      return json({ ok: true, channels: await runTest(u.id, u.email, name) });
    }

    // The dashboard's cron sends the secret key as an `apikey` header rather than a bearer token
    const apikey = req.headers.get('apikey') ?? '';
    const cronOk =
      (env('CRON_SECRET') && req.headers.get('x-cron-secret') === env('CRON_SECRET')) ||
      (token !== '' && SERVER_KEYS.includes(token)) ||
      (apikey !== '' && SERVER_KEYS.includes(apikey));
    if (!cronOk) return json({ error: 'forbidden' }, 403);
    return json({ ok: true, ...(await runDaily()) });
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : 'failed' }, 500);
  }
});
