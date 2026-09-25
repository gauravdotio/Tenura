-- ==============================================================================
-- TENURA FINANCIAL LEDGER - ROBUST SUPABASE DATABASE SCHEMA
-- Run this entire script in your Supabase Project -> SQL Editor -> Click 'Run'
-- Supports both Supabase Auth UUIDs and account usernames without foreign-key blockers.
-- ==============================================================================

-- 1. Enable UUID Extension
create extension if not exists "uuid-ossp";

-- 2. User Profiles Table (Primary and Household Members like Gaurav, DeeDee)
create table if not exists public.profiles (
  id text primary key,
  user_id text not null,
  name text not null,
  initials text not null,
  role text default 'Primary Account',
  accent_color text default '#6366F1',
  monthly_budget numeric default 75000,
  created_at timestamptz default now()
);

-- 3. Liabilities Table (Credit Cards, Personal Loans, Consumer EMIs)
create table if not exists public.liabilities (
  id text primary key,
  user_id text not null,
  profile_id text not null,
  provider_name text not null,
  type text not null check (type in ('credit_card', 'loan', 'emi', 'bnpl')),
  amount numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'converted_to_emi', 'paid_off', 'overdue')),
  status_note text,
  emi_amount numeric,
  tenure integer,
  total_amount numeric,
  start_date text,
  has_schedule boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- 4. EMI Amortization Schedules Table
create table if not exists public.emi_schedules (
  liability_id text primary key,
  user_id text not null,
  profile_id text not null,
  title text not null,
  original_amount numeric not null,
  monthly_emi numeric not null,
  total_tenure integer not null,
  months jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 5. Daily Expenses Table
create table if not exists public.expenses (
  id text primary key,
  user_id text not null,
  profile_id text not null,
  title text not null,
  amount numeric not null default 0,
  category text not null,
  date text not null,
  payment_method text not null default 'UPI',
  is_recurring boolean default false,
  created_at timestamptz default now()
);

-- ==============================================================================
-- 6. PERMISSIONS & DATA SECURITY
-- Ensure anon and authenticated keys have full access, filtered by user_id in the app
-- ==============================================================================

alter table public.profiles disable row level security;
alter table public.liabilities disable row level security;
alter table public.emi_schedules disable row level security;
alter table public.expenses disable row level security;

-- Grant permissions to public anon and authenticated roles
grant all on public.profiles to anon, authenticated, service_role;
grant all on public.liabilities to anon, authenticated, service_role;
grant all on public.emi_schedules to anon, authenticated, service_role;
grant all on public.expenses to anon, authenticated, service_role;
