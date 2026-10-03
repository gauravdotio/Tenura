-- =============================================================================
-- Credit card limit & network. Run after 001. Safe to re-run.
-- (Card numbers, CVVs and expiry dates are deliberately never stored.)
-- =============================================================================

alter table public.liabilities
  add column if not exists credit_limit numeric(14, 2) check (credit_limit > 0),
  add column if not exists card_network text check (card_network in ('visa', 'mastercard', 'rupay', 'amex', 'diners'));

-- Backup restore must carry the new columns
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
