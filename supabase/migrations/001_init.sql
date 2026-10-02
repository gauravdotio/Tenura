-- =============================================================================
-- Tenura — database schema
--
-- Run in Supabase → SQL Editor (or `supabase db push`). Safe to re-run.
--
-- Every table is owned by an auth user (user_id → auth.users) and protected by
-- row-level security, so a signed-in user can only ever read or write their own
-- household's rows. Household members are rows in `members`; they don't have a
-- login of their own — the account holder manages them.
-- =============================================================================

create extension if not exists pgcrypto;

-- If the pre-2.0 schema (text ids, RLS disabled) is present, move it aside so it
-- can be migrated with 002_migrate_legacy.sql instead of clashing with the new tables.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'liabilities' and column_name = 'provider_name') then
    alter table public.liabilities rename to legacy_liabilities;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'expenses' and column_name = 'profile_id') then
    alter table public.expenses rename to legacy_expenses;
  end if;
  if to_regclass('public.profiles') is not null and to_regclass('public.legacy_profiles') is null then
    alter table public.profiles rename to legacy_profiles;
  end if;
  if to_regclass('public.emi_schedules') is not null and to_regclass('public.legacy_emi_schedules') is null then
    alter table public.emi_schedules rename to legacy_emi_schedules;
  end if;
end $$;

do $$
declare t text;
begin
  -- the legacy tables had RLS disabled and were readable by anyone holding the anon key
  foreach t in array array['legacy_profiles', 'legacy_liabilities', 'legacy_emi_schedules', 'legacy_expenses'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Household members (the account holder is the member with is_primary = true)
-- ---------------------------------------------------------------------------
create table if not exists public.members (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  relation       text not null default 'Family',
  color          text not null default 'blue',
  monthly_budget numeric(14, 2) not null default 0 check (monthly_budget >= 0),
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists members_user_id_idx on public.members (user_id);
-- At most one primary member per account
create unique index if not exists members_one_primary_idx
  on public.members (user_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Liabilities: credit cards, loans, consumer EMIs, BNPL
-- ---------------------------------------------------------------------------
create table if not exists public.liabilities (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id      uuid not null references public.members (id) on delete restrict,
  provider       text not null check (char_length(provider) between 1 and 120),
  kind           text not null check (kind in ('credit_card', 'loan', 'emi', 'bnpl')),
  status         text not null default 'active' check (status in ('active', 'converted', 'closed')),
  balance        numeric(14, 2) not null default 0 check (balance >= 0),
  interest_rate  numeric(6, 3) check (interest_rate >= 0),
  emi_amount     numeric(14, 2) check (emi_amount > 0),
  tenure_months  integer check (tenure_months between 1 and 480),
  start_month    text check (start_month ~ '^\d{4}-\d{2}$'),
  due_day        smallint check (due_day between 1 and 31),
  card_last4     text check (card_last4 ~ '^\d{4}$'),
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists liabilities_user_id_idx on public.liabilities (user_id);
create index if not exists liabilities_member_id_idx on public.liabilities (member_id);

-- ---------------------------------------------------------------------------
-- EMI installments — one row per month of a repayment plan
-- ---------------------------------------------------------------------------
create table if not exists public.installments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  liability_id  uuid not null references public.liabilities (id) on delete cascade,
  seq           integer not null check (seq >= 1),
  due_month     text not null check (due_month ~ '^\d{4}-\d{2}$'),
  amount        numeric(14, 2) not null check (amount >= 0),
  paid_on       date,
  unique (liability_id, seq)
);

create index if not exists installments_user_id_idx on public.installments (user_id);

-- ---------------------------------------------------------------------------
-- Day-to-day expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id       uuid not null references public.members (id) on delete restrict,
  title           text not null check (char_length(title) between 1 and 120),
  amount          numeric(14, 2) not null check (amount > 0),
  category        text not null,
  spent_on        date not null,
  payment_method  text not null default 'UPI',
  is_recurring    boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, spent_on desc);

-- ---------------------------------------------------------------------------
-- Insurance / LIC policies
-- ---------------------------------------------------------------------------
create table if not exists public.policies (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id         uuid not null references public.members (id) on delete restrict,
  provider          text not null,
  name              text not null,
  policy_number     text,
  premium           numeric(14, 2) not null check (premium >= 0),
  frequency         text not null check (frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  sum_assured       numeric(16, 2) not null default 0 check (sum_assured >= 0),
  next_due_date     date,
  maturity_date     date,
  status            text not null default 'active' check (status in ('active', 'lapsed', 'matured')),
  notes             text,
  created_at        timestamptz not null default now()
);

create index if not exists policies_user_id_idx on public.policies (user_id);

-- ---------------------------------------------------------------------------
-- Row-level security: owner-only access on every table
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['members', 'liabilities', 'installments', 'expenses', 'policies'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner access" on public.%I', t);
    execute format(
      'create policy "owner access" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- A member referenced by a liability/expense/policy must belong to the same user.
create or replace function public.assert_member_owner()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.members m where m.id = new.member_id and m.user_id = new.user_id) then
    raise exception 'member % does not belong to this account', new.member_id using errcode = '42501';
  end if;
  return new;
end $$;

drop trigger if exists liabilities_member_owner on public.liabilities;
create trigger liabilities_member_owner before insert or update of member_id, user_id on public.liabilities
  for each row execute function public.assert_member_owner();
drop trigger if exists expenses_member_owner on public.expenses;
create trigger expenses_member_owner before insert or update of member_id, user_id on public.expenses
  for each row execute function public.assert_member_owner();
drop trigger if exists policies_member_owner on public.policies;
create trigger policies_member_owner before insert or update of member_id, user_id on public.policies
  for each row execute function public.assert_member_owner();

-- ---------------------------------------------------------------------------
-- New sign-ups get a primary member named after them
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (user_id, name, relation, color, monthly_budget, is_primary)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'Self', 'blue', 50000, true
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Remove a member, moving their records to another member of the same account
-- ---------------------------------------------------------------------------
create or replace function public.remove_member(p_member uuid, p_reassign_to uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_member = p_reassign_to then
    raise exception 'cannot reassign a member to itself';
  end if;
  if exists (select 1 from members where id = p_member and is_primary) then
    raise exception 'the primary member cannot be removed';
  end if;
  update liabilities set member_id = p_reassign_to where member_id = p_member;
  update expenses    set member_id = p_reassign_to where member_id = p_member;
  update policies    set member_id = p_reassign_to where member_id = p_member;
  delete from members where id = p_member;
end $$;

-- ---------------------------------------------------------------------------
-- Atomically replace all of the caller's data (backup restore / sample data)
-- payload: { members: [...], liabilities: [...], installments: [...], expenses: [...], policies: [...] }
-- ---------------------------------------------------------------------------
create or replace function public.replace_my_data(payload jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  delete from liabilities where user_id = uid;   -- cascades to installments
  delete from expenses    where user_id = uid;
  delete from policies    where user_id = uid;
  delete from members     where user_id = uid;

  insert into members (id, user_id, name, relation, color, monthly_budget, is_primary)
  select id, uid, name, relation, color, monthly_budget, is_primary
  from jsonb_populate_recordset(null::members, payload -> 'members');

  insert into liabilities (id, user_id, member_id, provider, kind, status, balance, interest_rate,
                           emi_amount, tenure_months, start_month, due_day, card_last4, notes, created_at)
  select id, uid, member_id, provider, kind, status, balance, interest_rate,
         emi_amount, tenure_months, start_month, due_day, card_last4, notes, coalesce(created_at, now())
  from jsonb_populate_recordset(null::liabilities, payload -> 'liabilities');

  insert into installments (id, user_id, liability_id, seq, due_month, amount, paid_on)
  select id, uid, liability_id, seq, due_month, amount, paid_on
  from jsonb_populate_recordset(null::installments, payload -> 'installments');

  insert into expenses (id, user_id, member_id, title, amount, category, spent_on, payment_method, is_recurring, notes)
  select id, uid, member_id, title, amount, category, spent_on, payment_method, is_recurring, notes
  from jsonb_populate_recordset(null::expenses, payload -> 'expenses');

  insert into policies (id, user_id, member_id, provider, name, policy_number, premium, frequency,
                        sum_assured, next_due_date, maturity_date, status, notes)
  select id, uid, member_id, provider, name, policy_number, premium, frequency,
         sum_assured, next_due_date, maturity_date, status, notes
  from jsonb_populate_recordset(null::policies, payload -> 'policies');
end $$;

-- ---------------------------------------------------------------------------
-- Let a user permanently delete their own account (and, via cascade, all data)
-- ---------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.replace_my_data(jsonb) from public, anon;
grant execute on function public.replace_my_data(jsonb) to authenticated;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
