-- =============================================================================
-- OPTIONAL — only for databases that ran the pre-2.0 `supabase_schema.sql`.
--
-- 001_init.sql renames the old tables to legacy_*. This script copies their rows
-- into the new tables for every legacy user_id that is a real Supabase auth user,
-- then leaves the legacy tables in place (locked down) so you can verify and
-- drop them yourself:
--   drop table public.legacy_emi_schedules, public.legacy_liabilities,
--              public.legacy_expenses, public.legacy_profiles;
-- Running it twice is harmless: users that already have members are skipped.
-- =============================================================================

do $$
begin
  if to_regclass('public.legacy_profiles') is null then
    raise notice 'No legacy tables found — nothing to migrate.';
    return;
  end if;

  -- Which auth users need migrating
  create temp table _users on commit drop as
  select u.id as uid
  from auth.users u
  where exists (select 1 from public.legacy_profiles p where p.user_id = u.id::text)
     or exists (select 1 from public.legacy_liabilities l where l.user_id = u.id::text);

  -- Users created before the signup trigger existed have no members yet; users
  -- created after it have exactly the auto-created primary member. Skip anyone else.
  delete from _users x
  where (select count(*) from public.members m where m.user_id = x.uid) > 1
     or exists (select 1 from public.liabilities l where l.user_id = x.uid);

  -- Legacy profile id → new member id (legacy ids were plain text and not unique per user)
  create temp table _member_map on commit drop as
  select p.user_id::uuid as uid, p.id as old_id, gen_random_uuid() as new_id,
         p.name, coalesce(nullif(p.role, ''), 'Family') as relation,
         coalesce(p.monthly_budget, 0) as monthly_budget,
         row_number() over (partition by p.user_id order by p.created_at) = 1 as first_profile
  from public.legacy_profiles p
  join _users x on x.uid::text = p.user_id;

  -- Drop the auto-created primary member; the first legacy profile becomes primary
  delete from public.members m
  using _users x
  where m.user_id = x.uid
    and exists (select 1 from _member_map mm where mm.uid = x.uid);

  insert into public.members (id, user_id, name, relation, color, monthly_budget, is_primary)
  select new_id, uid, name, case when first_profile then 'Self' else relation end,
         'blue', monthly_budget, first_profile
  from _member_map;

  -- Liabilities whose profile id doesn't resolve fall back to the user's primary member
  create temp table _liab_map on commit drop as
  select l.*, l.user_id::uuid as uid, gen_random_uuid() as new_id,
         coalesce(
           (select mm.new_id from _member_map mm where mm.uid::text = l.user_id and mm.old_id = l.profile_id),
           (select m.id from public.members m where m.user_id::text = l.user_id and m.is_primary)
         ) as member_id
  from public.legacy_liabilities l
  join _users x on x.uid::text = l.user_id;

  insert into public.liabilities (id, user_id, member_id, provider, kind, status, balance,
                                  emi_amount, tenure_months, start_month, notes)
  select new_id, uid, member_id, provider_name, type,
         case status when 'paid_off' then 'closed' when 'converted_to_emi' then 'converted' else 'active' end,
         greatest(coalesce(amount, 0), 0),
         nullif(emi_amount, 0), nullif(tenure, 0),
         case when start_date ~ '^\d{4}-\d{2}' then left(start_date, 7) end,
         nullif(concat_ws(' · ', nullif(status_note, ''), nullif(notes, '')), '')
  from _liab_map
  where member_id is not null;

  insert into public.installments (user_id, liability_id, seq, due_month, amount, paid_on)
  select lm.uid, lm.new_id,
         coalesce((m ->> 'installmentIndex')::int, ord::int),
         left(m ->> 'monthDate', 7),
         coalesce((m ->> 'amount')::numeric, 0),
         case when (m ->> 'isPaid')::boolean
              then coalesce((m ->> 'paidDate')::date, (left(m ->> 'monthDate', 7) || '-01')::date) end
  from public.legacy_emi_schedules s
  join _liab_map lm on lm.id = s.liability_id and lm.user_id = s.user_id
  cross join lateral jsonb_array_elements(s.months) with ordinality as t(m, ord)
  where lm.member_id is not null and (m ->> 'monthDate') ~ '^\d{4}-\d{2}'
  on conflict (liability_id, seq) do nothing;

  insert into public.expenses (user_id, member_id, title, amount, category, spent_on, payment_method, is_recurring)
  select uid, member_id, title, amount, category, spent_on, payment_method, is_recurring
  from (
    select e.user_id::uuid as uid,
           coalesce(
             (select mm.new_id from _member_map mm where mm.uid::text = e.user_id and mm.old_id = e.profile_id),
             (select m.id from public.members m where m.user_id::text = e.user_id and m.is_primary)
           ) as member_id,
           e.title, e.amount, e.category, e.date::date as spent_on, e.payment_method,
           coalesce(e.is_recurring, false) as is_recurring
    from public.legacy_expenses e
    join _users x on x.uid::text = e.user_id
    where e.amount > 0 and e.date ~ '^\d{4}-\d{2}-\d{2}$'
  ) rows
  where member_id is not null;
end $$;
