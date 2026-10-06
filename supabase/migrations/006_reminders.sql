-- =============================================================================
-- Reminders: per-user notification settings, web-push subscriptions, a send
-- log (so nothing is sent twice) and a function the scheduled sender calls to
-- find what is due and who should hear about it. Run after 005. Safe to re-run.
-- =============================================================================

create table if not exists public.notification_settings (
  user_id           uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  email_enabled     boolean not null default true,
  push_enabled      boolean not null default false,
  whatsapp_enabled  boolean not null default false,
  whatsapp_number   text check (whatsapp_number is null or whatsapp_number ~ '^\+?[0-9 ]{8,16}$'),
  days_before       smallint[] not null default '{3,1}' check (array_length(days_before, 1) between 1 and 4),
  monthly_digest    boolean not null default true,
  updated_at        timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Only real browser push services, so the sender can never be pointed at another server (SSRF)
  endpoint    text not null unique check (
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]*push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/'
  ),
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Written only by the sender (service role); never readable from the browser.
create table if not exists public.reminder_log (
  user_id   uuid not null references auth.users (id) on delete cascade,
  item_key  text not null,
  due_date  date not null,
  channel   text not null check (channel in ('email', 'push', 'whatsapp')),
  kind      text not null default 'due' check (kind in ('due', 'digest', 'test')),
  sent_at   timestamptz not null default now(),
  primary key (user_id, item_key, due_date, channel, kind)
);

alter table public.notification_settings enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;

drop policy if exists "owner access" on public.notification_settings;
create policy "owner access" on public.notification_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner access" on public.push_subscriptions;
create policy "owner access" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.notification_settings, public.push_subscriptions, public.reminder_log from anon;
revoke all on public.reminder_log from authenticated;
grant select, insert, update, delete on public.notification_settings to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- Everything due between two dates, once per person who should hear about it:
-- the account holder for their whole household, and a linked member for
-- their own profile. Mirrors the app's "Coming up" logic.
-- ---------------------------------------------------------------------------
create or replace function public.upcoming_items(p_from date, p_to date)
returns table (
  recipient_id   uuid,
  recipient_email text,
  recipient_name text,
  item_key       text,
  kind           text,
  title          text,
  subtitle       text,
  amount         numeric,
  due_date       date,
  member_name    text
)
language sql stable security definer set search_path = public, auth as $$
  with plans as (
    -- next unpaid instalment of every open plan
    select distinct on (l.id)
      l.id as liability_id, l.user_id, l.member_id, l.provider, l.card_last4, l.due_day,
      i.id as installment_id, i.seq, i.amount, i.due_month,
      (select count(*) from installments x where x.liability_id = l.id) as total
    from liabilities l
    join installments i on i.liability_id = l.id and i.paid_on is null
    where l.status <> 'closed'
    order by l.id, i.seq
  ),
  items as (
    select p.user_id, p.member_id, 'i-' || p.installment_id as item_key, 'installment' as kind,
           p.provider || coalesce(' ··' || p.card_last4, '') as title,
           'EMI ' || p.seq || ' of ' || p.total as subtitle,
           p.amount,
           make_date(split_part(p.due_month, '-', 1)::int, split_part(p.due_month, '-', 2)::int,
             least(coalesce(p.due_day, 5),
                   extract(day from (to_date(p.due_month || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day'))::int)) as due_date
    from plans p

    union all
    -- revolving card bills (cards without an EMI plan), next occurrence of the due day
    select l.user_id, l.member_id, 'c-' || l.id, 'card',
           l.provider || coalesce(' ··' || l.card_last4, ''), 'Card bill', l.balance,
           (select min(d) from (
              select make_date(extract(year from m)::int, extract(month from m)::int,
                       least(l.due_day, extract(day from (m + interval '1 month - 1 day'))::int)) as d
              from (values (date_trunc('month', p_from)::date), ((date_trunc('month', p_from) + interval '1 month')::date)) v(m)
            ) s where d >= p_from)
    from liabilities l
    where l.kind = 'credit_card' and l.status = 'active' and l.balance > 0 and l.due_day is not null
      and not exists (select 1 from installments i where i.liability_id = l.id)

    union all
    select p.user_id, p.member_id, 'p-' || p.id, 'premium', p.name, p.provider || ' premium', p.premium, p.next_due_date
    from policies p
    where p.status = 'active' and p.next_due_date is not null
  ),
  recipients as (
    select it.*, it.user_id as rid from items it
    union all
    select it.*, m.linked_user_id from items it join members m on m.id = it.member_id where m.linked_user_id is not null
  )
  select r.rid, u.email,
         coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
         r.item_key, r.kind, r.title, r.subtitle, r.amount, r.due_date, m.name
  from recipients r
  join auth.users u on u.id = r.rid
  join members m on m.id = r.member_id
  where r.due_date between p_from and p_to
  order by r.rid, r.due_date
$$;

revoke all on function public.upcoming_items(date, date) from public, anon, authenticated;
grant execute on function public.upcoming_items(date, date) to service_role;
