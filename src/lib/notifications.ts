import { supabase } from './supabase';
import { SITE } from './site';

/** Reminder preferences and web-push subscription for the signed-in user (migration 006). */

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  days_before: number[];
  monthly_digest: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  email_enabled: true,
  push_enabled: false,
  whatsapp_enabled: false,
  whatsapp_number: null,
  days_before: [3, 1],
  monthly_digest: true,
};

function db() {
  if (!supabase) throw new Error('Reminders need cloud sync.');
  return supabase;
}

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  const { data, error } = await db().from('notification_settings').select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return { ...DEFAULT_NOTIFICATIONS, ...(data ?? {}) };
}

export async function saveNotificationSettings(s: NotificationSettings): Promise<void> {
  const { error } = await db()
    .from('notification_settings')
    .upsert({ ...s, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** iPhone/iPad only allow web push once Tenura is added to the Home Screen. */
export function needsInstallForPush() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  return ios && !standalone;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Ask permission, subscribe this browser, and store the subscription. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('This browser doesn’t support notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them for this site in your browser settings.');
  const reg = await navigator.serviceWorker.register('./sw.js');
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(SITE.vapidPublicKey) }));
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const { error } = await db()
    .from('push_subscriptions')
    .upsert({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 200) }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
}

/** Unsubscribe this browser. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await db().from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
}

export async function thisBrowserSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(await reg?.pushManager.getSubscription());
}

/** Sends a test reminder to the signed-in user on every channel they have on. */
export async function sendTestReminder(): Promise<Record<string, string>> {
  const { data, error } = await db().functions.invoke('send-reminders', { body: { mode: 'test' } });
  if (error) throw new Error(error.message || 'The reminder service isn’t deployed yet.');
  return (data?.channels ?? {}) as Record<string, string>;
}
