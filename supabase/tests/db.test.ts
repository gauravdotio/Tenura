/**
 * Database tests: run every migration in an in-memory Postgres (PGlite) with a
 * minimal stand-in for Supabase's `auth` schema, then act as different users to
 * prove what row-level security allows and blocks.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const MIGRATIONS = join(__dirname, '..', 'migrations');

const AUTH_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema extensions;
  create extension pgcrypto schema extensions;
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
`;

let db: PGlite;

const OWNER = '00000000-0000-4000-8000-00000000000a';
const SISTER = '00000000-0000-4000-8000-00000000000b';
const STRANGER = '00000000-0000-4000-8000-00000000000c';

/** Run SQL as a signed-in user (role `authenticated`), or as the service role. */
async function as<T = Record<string, unknown>>(who: string | 'service', sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${who === 'service' || who === 'anon' ? '' : who}', false);`);
  await db.exec(who === 'service' ? 'set role service_role' : who === 'anon' ? 'set role anon' : 'set role authenticated');
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role');
  }
}

async function asFails(who: string, sql: string, params: unknown[] = []) {
  try {
    await as(who, sql, params);
    return false;
  } catch {
    return true;
  }
}

let ownerPrimary: string;
let didi: string;
let ownerCard: string;
let didiLoan: string;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(AUTH_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql') && !f.startsWith('002')).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }
  // service_role needs table access like on Supabase
  await db.exec(`grant all on all tables in schema public to service_role; grant execute on all functions in schema public to service_role;`);

  // Three sign-ups; the trigger creates each one's primary member
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values
    ($1, 'gaurav@test.in', '{"full_name":"Gaurav Rawat"}'),
    ($2, 'didi@test.in', '{"full_name":"Didi Rawat"}'),
    ($3, 'stranger@test.in', '{}')`, [OWNER, SISTER, STRANGER]);

  ownerPrimary = (await as<{ id: string }>(OWNER, `select id from members where is_primary`))[0].id;
  didi = (await as<{ id: string }>(OWNER, `insert into members (name, relation, email) values ('Didi', 'Sibling', 'didi@test.in') returning id`))[0].id;
  ownerCard = (await as<{ id: string }>(OWNER,
    `insert into liabilities (member_id, provider, kind, balance, due_day, credit_limit, card_network)
     values ($1, 'SBI Card', 'credit_card', 26000, 7, 120000, 'rupay') returning id`, [ownerPrimary]))[0].id;
  didiLoan = (await as<{ id: string }>(OWNER,
    `insert into liabilities (member_id, provider, kind, balance, emi_amount, tenure_months, start_month)
     values ($1, 'MacBook EMI', 'emi', 54000, 9000, 6, '2026-09') returning id`, [didi]))[0].id;
  await as(OWNER, `insert into installments (liability_id, seq, due_month, amount, paid_on) values
    ($1, 1, '2026-09', 9000, '2026-09-04'), ($1, 2, '2026-10', 9000, null), ($1, 3, '2026-11', 9000, null)`, [didiLoan]);
  await as(OWNER, `insert into expenses (member_id, title, amount, category, spent_on) values
    ($1, 'Owner groceries', 4500, 'groceries', '2026-10-02'), ($2, 'Didi gym', 1500, 'health', '2026-10-03')`, [ownerPrimary, didi]);
  await as(OWNER, `insert into policies (member_id, provider, name, premium, frequency, next_due_date) values
    ($1, 'LIC of India', 'Jeevan Labh', 48500, 'yearly', '2026-10-11'), ($2, 'Star Health', 'Optima', 21600, 'yearly', '2026-10-09')`, [ownerPrimary, didi]);
}, 60_000);

describe('before linking', () => {
  it('another user sees nothing of the household', async () => {
    expect(await as(SISTER, `select * from liabilities`)).toHaveLength(0);
    expect(await as(SISTER, `select * from members where user_id = $1`, [OWNER])).toHaveLength(0);
  });

  it('only the owner can create an invite, and not for themselves', async () => {
    expect(await asFails(SISTER, `select * from create_member_invite($1)`, [didi])).toBe(true);
    expect(await asFails(OWNER, `select * from create_member_invite($1)`, [ownerPrimary])).toBe(true);
  });
});

describe('invites', () => {
  let code: string;

  it('owner creates a code; wrong codes and self-acceptance are rejected', async () => {
    code = (await as<{ code: string }>(OWNER, `select code from create_member_invite($1)`, [didi]))[0].code;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(await as(SISTER, `select * from accept_member_invite('WRONGCOD')`)).toHaveLength(0);
    expect(await asFails(OWNER, `select * from accept_member_invite($1)`, [code])).toBe(true);
  });

  it('an expired code does not work', async () => {
    await as(OWNER, `update members set invite_expires_at = now() - interval '1 minute' where id = $1`, [didi]);
    expect(await as(SISTER, `select * from accept_member_invite($1)`, [code])).toHaveLength(0);
    code = (await as<{ code: string }>(OWNER, `select code from create_member_invite($1)`, [didi]))[0].code;
  });

  it('the invitee accepts (case-insensitive) and the code is used up', async () => {
    const res = await as<{ member_name: string; owner_name: string }>(SISTER, `select * from accept_member_invite($1)`, [code.toLowerCase()]);
    expect(res[0]).toMatchObject({ member_name: 'Didi', owner_name: 'Gaurav Rawat' });
    expect(await as(STRANGER, `select * from accept_member_invite($1)`, [code])).toHaveLength(0);
    const shared = await as<{ owner_name: string; member_name: string }>(SISTER, `select * from my_shared_profiles()`);
    expect(shared).toEqual([expect.objectContaining({ member_name: 'Didi', owner_name: 'Gaurav Rawat' })]);
  });
});

describe('a linked member', () => {
  it('reads only their own profile’s rows', async () => {
    expect((await as<{ id: string }>(SISTER, `select id from members where user_id = $1`, [OWNER])).map((r) => r.id)).toEqual([didi]);
    expect((await as<{ provider: string }>(SISTER, `select provider from liabilities`)).map((r) => r.provider)).toEqual(['MacBook EMI']);
    expect(await as(SISTER, `select * from installments`)).toHaveLength(3);
    expect((await as<{ title: string }>(SISTER, `select title from expenses`)).map((r) => r.title)).toEqual(['Didi gym']);
    expect((await as<{ name: string }>(SISTER, `select name from policies`)).map((r) => r.name)).toEqual(['Optima']);
  });

  it('can add, edit and delete their own data, stored in the owner’s household', async () => {
    const card = await as<{ id: string }>(SISTER,
      `insert into liabilities (user_id, member_id, provider, kind, balance) values ($1, $2, 'HDFC Regalia', 'credit_card', 18500) returning id`, [OWNER, didi]);
    expect(card).toHaveLength(1);
    await as(SISTER, `update installments set paid_on = '2026-10-05' where liability_id = $1 and seq = 2`, [didiLoan]);
    await as(SISTER, `insert into expenses (user_id, member_id, title, amount, category, spent_on) values ($1, $2, 'Course', 3499, 'education', '2026-10-04')`, [OWNER, didi]);
    await as(SISTER, `delete from expenses where title = 'Didi gym'`);
    // The owner sees the changes
    expect((await as<{ provider: string }>(OWNER, `select provider from liabilities where member_id = $1 order by provider`, [didi])).map((r) => r.provider)).toEqual(['HDFC Regalia', 'MacBook EMI']);
    expect((await as<{ paid_on: string | null }>(OWNER, `select paid_on from installments where liability_id = $1 and seq = 2`, [didiLoan]))[0].paid_on).not.toBeNull();
    expect((await as<{ title: string }>(OWNER, `select title from expenses where member_id = $1`, [didi])).map((r) => r.title)).toEqual(['Course']);
  });

  it('cannot touch anyone else’s data', async () => {
    // add to the owner's own profile
    expect(await asFails(SISTER, `insert into liabilities (user_id, member_id, provider, kind, balance) values ($1, $2, 'Sneaky', 'loan', 1)`, [OWNER, ownerPrimary])).toBe(true);
    // file a row under their own account instead of the household
    expect(await asFails(SISTER, `insert into liabilities (user_id, member_id, provider, kind, balance) values ($1, $2, 'Wrong owner', 'loan', 1)`, [SISTER, didi])).toBe(true);
    // move their row onto the owner's profile
    expect(await asFails(SISTER, `update liabilities set member_id = $1 where id = $2`, [ownerPrimary, didiLoan])).toBe(true);
    // edit or delete the owner's card: silently affects nothing
    await as(SISTER, `update liabilities set balance = 0 where id = $1`, [ownerCard]);
    await as(SISTER, `delete from liabilities where id = $1`, [ownerCard]);
    expect((await as<{ balance: string }>(OWNER, `select balance from liabilities where id = $1`, [ownerCard]))[0].balance).toBe('26000.00');
    // rename members or grab the primary flag
    await as(SISTER, `update members set name = 'Hacked', is_primary = true where id = $1`, [didi]);
    expect((await as<{ name: string }>(OWNER, `select name from members where id = $1`, [didi]))[0].name).toBe('Didi');
  });

  it('a stranger still sees nothing', async () => {
    for (const t of ['members', 'liabilities', 'installments', 'expenses', 'policies']) {
      expect(await as(STRANGER, `select * from ${t} where user_id = $1`, [OWNER])).toHaveLength(0);
    }
  });
});

describe('reminders', () => {
  it('lists due items for the owner (everything) and the linked member (their own)', async () => {
    const rows = await as<{ recipient_id: string; title: string; due_date: string; kind: string }>('service',
      `select recipient_id, title, due_date::text, kind from upcoming_items('2026-10-06', '2026-10-31') order by recipient_id, due_date, title`);
    const forOwner = rows.filter((r) => r.recipient_id === OWNER).map((r) => `${r.kind}:${r.title}@${r.due_date}`);
    const forSister = rows.filter((r) => r.recipient_id === SISTER).map((r) => `${r.kind}:${r.title}@${r.due_date}`);
    expect(forOwner).toEqual(['card:SBI Card@2026-10-07', 'premium:Optima@2026-10-09', 'premium:Jeevan Labh@2026-10-11']);
    expect(forSister).toEqual(['premium:Optima@2026-10-09']);
    // Didi's next EMI is November (October was marked paid above)
    const nov = await as<{ recipient_id: string; title: string; due_date: string }>('service',
      `select recipient_id, title, due_date::text from upcoming_items('2026-11-01', '2026-11-30') where kind = 'installment'`);
    expect(nov.map((r) => r.due_date)).toEqual(['2026-11-05', '2026-11-05']);
  });

  it('is not callable from the browser', async () => {
    expect(await asFails(OWNER, `select * from upcoming_items('2026-10-01', '2026-10-31')`)).toBe(true);
  });

  it('users manage only their own notification settings and push subscriptions', async () => {
    await as(SISTER, `insert into notification_settings (days_before, push_enabled) values ('{3,1}', true)`);
    await as(SISTER, `insert into push_subscriptions (endpoint, p256dh, auth) values ('https://fcm.googleapis.com/fcm/send/abc', 'k', 'a')`);
    expect(await as(OWNER, `select * from notification_settings`)).toHaveLength(0);
    expect(await as(OWNER, `select * from push_subscriptions`)).toHaveLength(0);
    expect(await asFails(OWNER, `select * from reminder_log`)).toBe(true);
  });
});

describe('security hardening', () => {
  it('blocks push endpoints that are not real push services (SSRF)', async () => {
    for (const bad of ['http://fcm.googleapis.com/x', 'https://169.254.169.254/latest', 'https://evil.example/fcm.googleapis.com/', 'https://localhost:54321/rest/v1/']) {
      expect(await asFails(OWNER, `insert into push_subscriptions (endpoint, p256dh, auth) values ($1, 'k', 'a')`, [bad])).toBe(true);
    }
    await as(OWNER, `insert into push_subscriptions (endpoint, p256dh, auth) values ('https://web.push.apple.com/QGx', 'k', 'a')`);
  });

  it('locks out invite-code guessing after 10 tries an hour', async () => {
    const tries = async () => (await as<{ n: string }>('service', `select count(*)::text as n from invite_attempts where user_id = $1 and at > now() - interval '1 hour'`, [STRANGER]))[0].n;
    while (Number(await tries()) < 10) await as(STRANGER, `select * from accept_member_invite('ZZZZZZZZ')`);
    // the 11th attempt in an hour is refused, even with a well-formed code
    expect(await asFails(STRANGER, `select * from accept_member_invite('ZZZZZZZZ')`)).toBe(true);
  });

  it('throttles the public contact form', async () => {
    const send = (email: string) => as('anon', `insert into contact_messages (name, email, message) values ('Bot', $1, 'hello hello hello')`, [email]);
    for (let i = 0; i < 3; i++) await send('bot@spam.test');
    let blocked = false;
    try { await send('bot@spam.test'); } catch { blocked = true; }
    expect(blocked).toBe(true);
    // an anonymous visitor can't pretend to be a user
    expect(await asFails('anon', `insert into contact_messages (name, email, message, user_id) values ('X', 'x@test.in', 'hello hello', $1)`, [OWNER])).toBe(true);
  });

  it('trigger functions and the reminder query are not callable from the browser', async () => {
    expect(await asFails(OWNER, `select public.handle_new_user()`)).toBe(true);
    expect(await asFails('anon', `select * from upcoming_items('2026-10-01', '2026-10-31')`)).toBe(true);
    expect(await asFails('anon', `select * from members`)).toBe(true);
  });
});

describe('unlinking & restore', () => {
  it('a backup restore by the owner keeps the member’s login', async () => {
    const payload = {
      members: await as(OWNER, `select id, name, relation, color, monthly_budget, is_primary, email, phone from members`),
      liabilities: [], installments: [], expenses: [], policies: [],
    };
    await as(OWNER, `select replace_my_data($1::jsonb)`, [JSON.stringify(payload)]);
    expect((await as<{ name: string }>(SISTER, `select name from members where user_id = $1`, [OWNER])).map((r) => r.name)).toEqual(['Didi']);
  });

  it('after unlinking, the member’s login sees nothing', async () => {
    await as(OWNER, `select unlink_member($1)`, [didi]);
    expect(await as(SISTER, `select * from members where user_id = $1`, [OWNER])).toHaveLength(0);
    expect(await as(SISTER, `select * from my_shared_profiles()`)).toHaveLength(0);
  });
});
