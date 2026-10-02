-- =============================================================================
-- Contact form inbox. Anyone (signed in or not) may submit a message; nobody can
-- read messages through the API — view them in the Supabase dashboard
-- (Table Editor → contact_messages) or with the service role.
-- =============================================================================

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  topic       text not null default 'general' check (topic in ('general', 'feedback', 'bug', 'privacy', 'other')),
  message     text not null check (char_length(message) between 10 and 4000),
  user_id     uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "anyone can submit" on public.contact_messages;
create policy "anyone can submit" on public.contact_messages
  for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

revoke all on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
