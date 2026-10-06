import { supabase } from './supabase';
import { SITE } from './site';

/** Thin wrappers around the family-login database functions (see migration 005). */

function db() {
  if (!supabase) throw new Error('Family logins need cloud sync, which isn’t set up in this copy of Tenura.');
  return supabase;
}

export interface SharedProfileRow {
  member_id: string;
  member_name: string;
  member_color: string;
  owner_id: string;
  owner_name: string;
}

export async function createInvite(memberId: string): Promise<{ code: string; expiresAt: string }> {
  const { data, error } = await db().rpc('create_member_invite', { p_member: memberId });
  if (error) throw new Error(error.message);
  const row = (data as { code: string; expires_at: string }[])[0];
  return { code: row.code, expiresAt: row.expires_at };
}

export async function acceptInvite(code: string): Promise<{ memberId: string; memberName: string; ownerName: string }> {
  const { data, error } = await db().rpc('accept_member_invite', { p_code: code });
  if (error) throw new Error(error.message);
  const row = (data as { member_id: string; member_name: string; owner_name: string }[])[0];
  if (!row) throw new Error('This invite link is invalid, has already been used, or has expired. Ask for a new one.');
  return { memberId: row.member_id, memberName: row.member_name, ownerName: row.owner_name };
}

export async function unlinkMember(memberId: string): Promise<void> {
  const { error } = await db().rpc('unlink_member', { p_member: memberId });
  if (error) throw new Error(error.message);
}

export async function listSharedProfiles(): Promise<SharedProfileRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('my_shared_profiles');
  if (error) throw new Error(error.message);
  return (data ?? []) as SharedProfileRow[];
}

export function inviteLink(code: string) {
  const base = typeof window === 'undefined' ? SITE.url : `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
  return `${base}/#/join?code=${code}`;
}

export function inviteMessage(memberName: string, ownerName: string, code: string) {
  return `Hi ${memberName.split(' ')[0]}, ${ownerName.split(' ')[0]} added you on Tenura to keep track of your loans, cards, EMIs and policies. Open this link to set up your login (valid for 7 days): ${inviteLink(code)}`;
}

/** wa.me link with the message pre-filled; uses the member's number when we have one. */
export function whatsAppShareUrl(text: string, phone?: string) {
  const digits = (phone ?? '').replace(/[^0-9]/g, '');
  const to = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export const PENDING_INVITE_KEY = 'tenura:pending-invite';
