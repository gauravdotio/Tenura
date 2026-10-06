-- =============================================================================
-- Security hardening (audit, Oct 2026). Run after 006. Safe to re-run.
-- =============================================================================

-- 1. Pin search_path on every remaining function (Supabase advisor:
--    "function_search_path_mutable") so a malicious object in another schema
--    can never be picked up instead of ours.
alter function public.assert_member_owner() set search_path = public;

-- 2. Trigger-only functions must not be callable as RPCs.
revoke all on function public.assert_member_owner() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- 3. Contact form flood protection. Anyone can submit (no login), so cap it:
--    at most 3 messages per email address per hour, 60 per hour overall.
create or replace function public.throttle_contact_messages()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from contact_messages where lower(email) = lower(new.email) and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'too many messages — please try again later' using errcode = '54000';
  end if;
  if (select count(*) from contact_messages where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'we are receiving a lot of messages right now — please try again later' using errcode = '54000';
  end if;
  return new;
end $$;
revoke all on function public.throttle_contact_messages() from public, anon, authenticated;

drop trigger if exists contact_messages_throttle on public.contact_messages;
create trigger contact_messages_throttle before insert on public.contact_messages
  for each row execute function public.throttle_contact_messages();

-- 4. Anonymous contact messages can't claim to come from a signed-in user.
drop policy if exists "anyone can submit" on public.contact_messages;
create policy "anyone can submit" on public.contact_messages
  for insert to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or (auth.uid() is not null and (user_id is null or user_id = (select auth.uid())))
  );
