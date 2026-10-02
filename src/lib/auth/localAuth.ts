/**
 * Browser-only accounts, used when no Supabase project is configured.
 *
 * This is a convenience mode for running the app offline, not a security
 * boundary: anyone with access to the browser profile can read localStorage.
 * Passwords are still never stored in plain text — only a salted PBKDF2 hash.
 */

export interface LocalAccount {
  id: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

const ACCOUNTS_KEY = 'tenura:v4:accounts';
const SESSION_KEY = 'tenura:v4:session';
const ITERATIONS = 210_000;

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256);
  return toHex(bits);
}

/** Constant-time comparison so a wrong password doesn't leak how close it was. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readAccounts(): LocalAccount[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function createLocalAccount(name: string, email: string, password: string): Promise<LocalAccount> {
  const accounts = readAccounts();
  const normalized = email.trim().toLowerCase();
  if (accounts.some((a) => a.email === normalized)) {
    throw new Error('An account with this email already exists on this device.');
  }
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const account: LocalAccount = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: normalized,
    salt,
    passwordHash: await hashPassword(password, salt),
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  return account;
}

export async function verifyLocalAccount(email: string, password: string): Promise<LocalAccount> {
  const account = readAccounts().find((a) => a.email === email.trim().toLowerCase());
  // Hash even when the account is missing so timing doesn't reveal which emails exist
  const hash = await hashPassword(password, account?.salt ?? '00'.repeat(16));
  if (!account || !safeEqual(hash, account.passwordHash)) {
    throw new Error('Incorrect email or password.');
  }
  return account;
}

export function updateLocalAccount(id: string, patch: Partial<Pick<LocalAccount, 'name'>>) {
  writeAccounts(readAccounts().map((a) => (a.id === id ? { ...a, ...patch } : a)));
}

export function deleteLocalAccount(id: string) {
  writeAccounts(readAccounts().filter((a) => a.id !== id));
}

export function getLocalSession(): LocalAccount | null {
  const id = localStorage.getItem(SESSION_KEY);
  return (id && readAccounts().find((a) => a.id === id)) || null;
}

export function setLocalSession(id: string | null) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else localStorage.removeItem(SESSION_KEY);
}

/** Remove storage written by the pre-2.0 app (it kept a plain-text PIN and shared vault copies). */
export function purgeLegacyStorage() {
  const legacyKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && /^tenura_(registered_users|active_session|last_active)/.test(k)) legacyKeys.push(k);
  }
  legacyKeys.forEach((k) => localStorage.removeItem(k));
}

/** Snapshots the previous app version left in this browser, for one-click import. */
export function findLegacyVaults(): { key: string; label: string; json: string }[] {
  const out: { key: string; label: string; json: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !/^tenura_(vault|backup)_/.test(k)) continue;
    const json = localStorage.getItem(k);
    if (!json) continue;
    try {
      const parsed = JSON.parse(json);
      const count = Array.isArray(parsed.liabilities) ? parsed.liabilities.length : 0;
      if (count > 0) out.push({ key: k, label: `${k.replace(/^tenura_(vault|backup)_/, '')} · ${count} liabilities`, json });
    } catch {
      /* ignore unreadable entries */
    }
  }
  return out;
}
