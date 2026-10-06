-- =============================================================================
-- Family logins. Run after 001–004. Safe to re-run.
--
-- The account holder can invite a household member (by email/phone + a
-- one-time code). Once the invitee signs in and accepts, their own login is
-- linked to that member: they can read and edit ONLY that member's loans,
-- cards, EMIs, expenses and policies — never anyone else's, and never the
-- household's member list. Rows they create still belong to the owner's
-- household (user_id = owner), so the owner keeps seeing everything.
-- =============================================================================

alter table public.members
  add column if not exists email            text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column if not exists phone            text check (phone is null or phone ~ '^\+?[0-9 ]{8,16}$'),
  add column if not exists linked_user_id   uuid references auth.users (id) on delete set null,
  add column if not exists invite_code      text,
  add column if not exists invite_expires_at timestamptz;

create unique index if not exists members_invite_code_idx on public.members (invite_code) where invite_code is not null;
create index if not exists members_linked_user_idx on public.members (linked_user_id) where linked_user_id is not null;
-- A person can be linked to at most one member of a given household
create unique index if not exists members_one_link_per_household_idx
  on public.members (user_id, linked_user_id) where linked_user_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can use them without RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.my_linked_member_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from members where linked_user_id = auth.uid()
$$;

create or replace function public.member_owner(p_member uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from members where id = p_member
$$;

create or replace function public.liability_owner(p_liability uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from liabilities where id = p_liability
$$;

create or replace function public.liability_member(p_liability uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select member_id from liabilities where id = p_liability
$$;

revoke all on function public.my_linked_member_ids() from public, anon;
revoke all on function public.member_owner(uuid) from public, anon;
revoke all on function public.liability_owner(uuid) from public, anon;
revoke all on function public.liability_member(uuid) from public, anon;
grant execute on function public.my_linked_member_ids() to authenticated;
grant execute on function public.member_owner(uuid) to authenticated;
grant execute on function public.liability_owner(uuid) to authenticated;
grant execute on function public.liability_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Policies for linked members (the existing "owner access" policies stay)
-- ---------------------------------------------------------------------------
drop policy if exists "linked member reads own profile" on public.members;
create policy "linked member reads own profile" on public.members
  for select to authenticated
  using (linked_user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['liabilities', 'expenses', 'policies'] loop
    execute format('drop policy if exists "linked member access" on public.%I', t);
    execute format(
      'create policy "linked member access" on public.%I for all to authenticated
         using (member_id in (select public.my_linked_member_ids()))
         with check (member_id in (select public.my_linked_member_ids())
                     and user_id = public.member_owner(member_id))', t);
  end loop;
end $$;

drop policy if exists "linked member access" on public.installments;
create policy "linked member access" on public.installments
  for all to authenticated
  using (public.liability_member(liability_id) in (select public.my_linked_member_ids()))
  with check (public.liability_member(liability_id) in (select public.my_linked_member_ids())
              and user_id = public.liability_owner(liability_id));

-- ---------------------------------------------------------------------------
-- Invites
-- ---------------------------------------------------------------------------

-- Owner creates (or refreshes) a 7-day invite code for one of their members.
create or replace function public.create_member_invite(p_member uuid)
returns table (code text, expires_at timestamptz)
language plpgsql security invoker set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no 0/O/1/I
  new_code text;
  m members;
begin
  select * into m from members where id = p_member and user_id = auth.uid();
  if not found then raise exception 'member not found' using errcode = '42501'; end if;
  if m.is_primary then raise exception 'you are already the account holder'; end if;
  if m.linked_user_id is not null then raise exception 'this member already has a login — unlink it first'; end if;

  loop
    new_code := '';
    for i in 1..8 loop
      -- byte 0 of a v4 UUID is fully random (core Postgres, no extension needed); 256 % 32 = 0, so no bias
      new_code := new_code || substr(alphabet, 1 + (get_byte(decode(replace(gen_random_uuid()::text, '-', ''), 'hex'), 0) % 32), 1);
    end loop;
    exit when not exists (select 1 from members where invite_code = new_code);
  end loop;

  update members set invite_code = new_code, invite_expires_at = now() + interval '7 days' where id = p_member;
  return query select new_code, now() + interval '7 days';
end $$;

-- Failed/used attempts, to stop anyone guessing codes. Never readable from the browser.
create table if not exists public.invite_attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  at      timestamptz not null default now()
);
create index if not exists invite_attempts_user_idx on public.invite_attempts (user_id, at desc);
alter table public.invite_attempts enable row level security;
revoke all on public.invite_attempts from anon, authenticated;

-- The invitee (signed in with their own account) accepts a code.
-- Returns no rows for an unknown/expired code (rather than raising) so the attempt is recorded.
create or replace function public.accept_member_invite(p_code text)
returns table (member_id uuid, member_name text, owner_name text)
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  m members;
begin
  if uid is null then raise exception 'please sign in first' using errcode = '42501'; end if;
  if (select count(*) from invite_attempts where user_id = uid and at > now() - interval '1 hour') >= 10 then
    raise exception 'too many attempts — please try again in an hour' using errcode = '54000';
  end if;
  insert into invite_attempts (user_id) values (uid);
  delete from invite_attempts where at < now() - interval '1 day';

  select * into m from members
  where invite_code = upper(trim(coalesce(p_code, ''))) and invite_expires_at > now() and linked_user_id is null
  for update;
  if not found then return; end if;
  if m.user_id = uid then raise exception 'you can''t accept an invite from your own household'; end if;
  if exists (select 1 from members where user_id = m.user_id and linked_user_id = uid) then
    raise exception 'your account is already linked to someone in this household';
  end if;

  update members set linked_user_id = uid, invite_code = null, invite_expires_at = null where id = m.id;

  return query
    select m.id, m.name,
           coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
    from auth.users u where u.id = m.user_id;
end $$;

-- Owner removes a member's login, or a linked member leaves.
create or replace function public.unlink_member(p_member uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update members
     set linked_user_id = null, invite_code = null, invite_expires_at = null
   where id = p_member
     and (user_id = auth.uid() or linked_user_id = auth.uid());
  if not found then raise exception 'member not found' using errcode = '42501'; end if;
end $$;

-- Profiles shared with the caller, for the "Shared with you" switcher.
create or replace function public.my_shared_profiles()
returns table (member_id uuid, member_name text, member_color text, owner_id uuid, owner_name text)
language sql stable security definer set search_path = public, auth as $$
  select m.id, m.name, m.color, m.user_id,
         coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
  from members m join auth.users u on u.id = m.user_id
  where m.linked_user_id = auth.uid()
  order by m.created_at
$$;

revoke all on function public.create_member_invite(uuid) from public, anon;
revoke all on function public.accept_member_invite(text) from public, anon;
revoke all on function public.unlink_member(uuid) from public, anon;
revoke all on function public.my_shared_profiles() from public, anon;
grant execute on function public.create_member_invite(uuid) to authenticated;
grant execute on function public.accept_member_invite(text) to authenticated;
grant execute on function public.unlink_member(uuid) to authenticated;
grant execute on function public.my_shared_profiles() to authenticated;

-- ---------------------------------------------------------------------------
-- Backup restore keeps member contact details and existing logins
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
end $$;
