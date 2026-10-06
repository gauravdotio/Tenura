-- =============================================================================
-- Income, investments and the AI money planner. Run after 007. Safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Income sources (take-home, after tax)
-- ---------------------------------------------------------------------------
create table if not exists public.incomes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id   uuid not null references public.members (id) on delete restrict,
  kind        text not null check (kind in ('salary', 'business', 'freelance', 'rental', 'pension', 'interest', 'other')),
  source      text not null check (char_length(source) between 1 and 120),
  amount      numeric(14, 2) not null check (amount > 0),
  frequency   text not null default 'monthly' check (frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  is_active   boolean not null default true,
  notes       text check (notes is null or char_length(notes) <= 1000),
  created_at  timestamptz not null default now()
);
create index if not exists incomes_user_id_idx on public.incomes (user_id);
create index if not exists incomes_member_id_idx on public.incomes (member_id);

-- ---------------------------------------------------------------------------
-- Investments: SIP, mutual funds, shares, FD, RD, PPF, EPF, NPS, gold, savings
-- ---------------------------------------------------------------------------
create table if not exists public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  member_id       uuid not null references public.members (id) on delete restrict,
  kind            text not null check (kind in ('sip', 'mutual_fund', 'stocks', 'fd', 'rd', 'ppf', 'epf', 'nps', 'gold', 'savings', 'other')),
  provider        text not null default '' check (char_length(provider) <= 120),
  name            text not null check (char_length(name) between 1 and 120),
  contribution    numeric(14, 2) check (contribution is null or contribution > 0),
  frequency       text check (frequency is null or frequency in ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  invested        numeric(16, 2) not null default 0 check (invested >= 0),
  current_value   numeric(16, 2) check (current_value is null or current_value >= 0),
  interest_rate   numeric(5, 2) check (interest_rate is null or interest_rate between 0 and 100),
  start_date      date,
  maturity_date   date,
  emergency_fund  boolean not null default false,
  status          text not null default 'active' check (status in ('active', 'paused', 'matured', 'closed')),
  notes           text check (notes is null or char_length(notes) <= 1000),
  created_at      timestamptz not null default now()
);
create index if not exists investments_user_id_idx on public.investments (user_id);
create index if not exists investments_member_id_idx on public.investments (member_id);

-- ---------------------------------------------------------------------------
-- Access: the account holder owns everything; a linked family member can use
-- only their own profile's rows (same rules as liabilities, expenses, policies)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['incomes', 'investments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner access" on public.%I', t);
    execute format(
      'create policy "owner access" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format('drop policy if exists "linked member access" on public.%I', t);
    execute format(
      'create policy "linked member access" on public.%I for all to authenticated
         using (member_id in (select public.my_linked_member_ids()))
         with check (member_id in (select public.my_linked_member_ids())
                     and user_id = public.member_owner(member_id))', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop trigger if exists %I on public.%I', t || '_member_owner', t);
    execute format(
      'create trigger %I before insert or update of member_id, user_id on public.%I
         for each row execute function public.assert_member_owner()', t || '_member_owner', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Removing a member moves their income and investments too
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
  update incomes     set member_id = p_reassign_to where member_id = p_member;
  update investments set member_id = p_reassign_to where member_id = p_member;
  delete from members where id = p_member;
end $$;

-- ---------------------------------------------------------------------------
-- Backup restore includes income and investments (and keeps family logins)
-- ---------------------------------------------------------------------------
create or replace function public.replace_my_data(payload jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  create temp table if not exists _kept_links (id uuid primary key, linked_user_id uuid) on commit drop;
  delete from _kept_links;
  insert into _kept_links select id, linked_user_id from members where user_id = uid and linked_user_id is not null;

  delete from liabilities where user_id = uid;   -- cascades to installments
  delete from expenses    where user_id = uid;
  delete from policies    where user_id = uid;
  delete from incomes     where user_id = uid;
  delete from investments where user_id = uid;
  delete from members     where user_id = uid;

  insert into members (id, user_id, name, relation, color, monthly_budget, is_primary, email, phone, linked_user_id)
  select r.id, uid, r.name, r.relation, r.color, r.monthly_budget, r.is_primary, r.email, r.phone, k.linked_user_id
  from jsonb_populate_recordset(null::members, payload -> 'members') r
  left join _kept_links k on k.id = r.id;

  insert into liabilities (id, user_id, member_id, provider, kind, status, balance, interest_rate,
                           emi_amount, tenure_months, start_month, due_day, card_last4, credit_limit,
                           card_network, notes, created_at)
  select id, uid, member_id, provider, kind, status, balance, interest_rate,
         emi_amount, tenure_months, start_month, due_day, card_last4, credit_limit,
         card_network, notes, coalesce(created_at, now())
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

  insert into incomes (id, user_id, member_id, kind, source, amount, frequency, is_active, notes)
  select id, uid, member_id, kind, source, amount, frequency, coalesce(is_active, true), notes
  from jsonb_populate_recordset(null::incomes, coalesce(payload -> 'incomes', '[]'::jsonb));

  insert into investments (id, user_id, member_id, kind, provider, name, contribution, frequency, invested,
                           current_value, interest_rate, start_date, maturity_date, emergency_fund, status, notes)
  select id, uid, member_id, kind, coalesce(provider, ''), name, contribution, frequency, coalesce(invested, 0),
         current_value, interest_rate, start_date, maturity_date, coalesce(emergency_fund, false),
         coalesce(status, 'active'), notes
  from jsonb_populate_recordset(null::investments, coalesce(payload -> 'investments', '[]'::jsonb));
end $$;

-- ---------------------------------------------------------------------------
-- AI planner usage, for a per-user daily limit. Written only by the server.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  user_id  uuid not null references auth.users (id) on delete cascade,
  at       timestamptz not null default now()
);
create index if not exists ai_usage_user_idx on public.ai_usage (user_id, at desc);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
