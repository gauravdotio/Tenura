# Security policy

## Reporting a vulnerability

Please **don’t open a public issue**. Use the contact form at
<https://tenura.gauravdot.in/#/contact> and choose “Privacy or my data”, and
include steps to reproduce. You’ll get an acknowledgement within a few days.

## How Tenura protects data

- **Row-level security on every table.** Postgres policies allow each row to be
  read or written only by the household that owns it, or by a family member
  who was invited to that one profile. This is enforced by the database, not
  just the app, and covered by automated tests (`supabase/tests/db.test.ts`).
- **No card data.** Tenura never asks for or stores card numbers, CVVs,
  expiry dates, PINs, OTPs or bank logins.
- **Least privilege functions.** Database functions pin `search_path`;
  privileged ones (`security definer`) check the caller and are not callable
  anonymously. The reminder query is callable only by the server.
- **Abuse limits.** Invite codes are single-use, expire in 7 days and lock
  out after 10 attempts an hour; the public contact form is rate-limited;
  push endpoints are restricted to real push services (no SSRF).
- **Browser hardening.** Strict Content-Security-Policy (no inline or
  third-party scripts), HSTS, `X-Frame-Options: DENY`, `nosniff`,
  restrictive `Permissions-Policy` and `Cross-Origin-Opener-Policy`.
- **Secrets** (Supabase service key, Resend key, VAPID private key) live only
  in Supabase/Vercel secret storage, never in the repository.
- **Supply chain.** CI fails on high/critical vulnerabilities in shipped
  dependencies; Dependabot opens weekly update PRs.
