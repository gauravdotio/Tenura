# Tenura

[![CI](https://github.com/gauravdotio/Tenura/actions/workflows/ci.yml/badge.svg)](https://github.com/gauravdotio/Tenura/actions/workflows/ci.yml)

**Every EMI, card bill and premium your family pays — in one place.**

Tenura is a household finance tracker built for Indian families. It keeps credit cards, loans, consumer EMIs, pay-later plans, LIC / insurance policies and daily expenses for you *and* the family members you look after, and tells you what's due next.

**Live: [tenura-rose.vercel.app](https://tenura-rose.vercel.app)** — create a free account to try it.

## Features

- **Loans & cards** — credit card balances, personal loans, consumer EMIs and BNPL, with what's actually left to pay.
- **Automatic EMI schedules** — enter amount, rate and tenure; the EMI is calculated with the reducing-balance formula and a month-by-month plan is generated to tick off. Convert a card balance to EMI in one step.
- **"Coming up" reminders** — the next EMI of every plan, card bills (by due day) and insurance premiums due in the next 30 days, with overdue items flagged and one-click *Mark paid*.
- **Insurance & LIC** — premiums, frequency, sum assured and maturity. Paying a premium rolls the next due date forward.
- **Household members** — add a spouse, parent or sibling under your account and switch between their dashboards or view everyone together. Removing a member re-assigns their records; nothing is lost.
- **Expenses & budgets** — categorised spending by month against each member's budget.
- **Analytics** — 12-month outflow projection, debt burndown, outstanding by lender / member, spending by category.
- **Your data, portable** — JSON backup & restore (including backups from the previous version) and CSV export.
- Marketing site with About, Contact (stored in Postgres), Privacy, Terms and Security pages.
- Light & dark themes, responsive down to 360 px, keyboard-accessible dialogs, reduced-motion aware animations.

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript (strict), Tailwind CSS with design tokens, Recharts (lazy-loaded) |
| Backend | Supabase — Postgres, Auth, row-level security, SQL functions |
| Tooling | Vite, Vitest, oxlint, GitHub Actions CI, Vercel |

## Architecture

```
src/
  lib/finance/      Pure domain logic — EMI maths, schedules, summaries, reminders,
                    projections, backup parsing. No React; fully unit-tested.
  lib/data/         FinanceRepository interface + three implementations:
                      SupabaseRepository  (Postgres via supabase-js)
                      LocalRepository     (per-user localStorage, offline mode)
  lib/auth/         Browser-only accounts for offline mode (PBKDF2-hashed passwords)
  context/          Auth, Finance (data + actions), Theme, Toasts, Dialogs
  components/       UI kit, app shell, forms
  pages/            Landing, auth, and one page per dashboard section
supabase/migrations SQL schema, RLS policies, triggers and RPCs
```

**Every change is a `Mutation`** (`member/upsert`, `liability/upsert`, `installment/setPaid`, …). The UI applies it optimistically with a pure reducer and hands the same object to the active repository to persist; on failure the UI re-syncs from the source of truth and shows an error. Swapping storage backends needs no UI changes.

**Isolation between users** is enforced at three levels: Postgres row-level security (`user_id = auth.uid()` on every table, plus a trigger that rejects cross-account member references), per-user storage keys in offline mode, and a `FinanceProvider` keyed by user id so signing out discards all in-memory state.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

Without Supabase configured the app runs in **local mode**: accounts and data live in the browser. To use the cloud backend:

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/001_init.sql`, then `003_contact_messages.sql` (contact-form inbox).
   - Upgrading from the pre-2.0 schema? Also run `002_migrate_legacy.sql` to copy existing rows across.
3. Copy `.env.example` to `.env` and fill in the project URL and anon key (Project Settings → API).
4. Optional: in Authentication → URL Configuration, add your deployed URL so email-confirmation links work.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | oxlint |
| `npm run build` | Type-check and production build to `dist/` |

## Security notes

- The anon key is safe to ship to the browser: without a signed-in session, RLS denies every read and write.
- `delete_my_account()` is a `security definer` function that can only delete the caller's own auth user; all data cascades.
- Offline mode is a convenience, not a security boundary — anyone with access to the browser profile can read localStorage.

---

Built by Gaurav Rawat.
