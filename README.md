# BondarGames

A minimalistic board game reservation app — Next.js 16 (App Router) + Tailwind + Prisma + Neon Postgres + NextAuth v5 + nodemailer.

Public visitors can see the schedule. Registered & email-verified users can book seats and cancel up to 24 hours before the event. Admins can create and delete events at any time.

## Stack

- **Framework:** Next.js 16 (Turbopack) + React 19, App Router
- **Styling:** Tailwind 4, minimalistic Revolut-inspired light theme
- **Database:** Postgres via Neon (Vercel-native); Prisma 7 with the `@prisma/adapter-pg` driver adapter (serverless-friendly)
- **Auth:** NextAuth v5 — Google OAuth + local email/password, JWT session strategy
- **Email:** nodemailer over Gmail SMTP (App Password)

## Local setup

```bash
npm install
cp .env.example .env       # then fill in non-DB values (Auth, Google, SMTP, ADMIN_EMAIL)
npm run db:up              # start local Postgres in Docker
npm run db:migrate         # apply the schema
npm run db:seed            # optional — creates an admin (ADMIN_EMAIL/ADMIN_PASSWORD) + a sample event
npm run dev
```

Open http://localhost:3000.

The default `.env.example` is pre-wired for the Docker container — `postgresql://bondar:bondar@localhost:5432/bondargames`. Stop the DB with `npm run db:down`, wipe it with `npm run db:reset`.

## Required environment variables

See `.env.example`. Briefly:

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon Postgres pooled + direct URLs (Migrate needs the direct URL) |
| `AUTH_SECRET` | NextAuth session secret (`openssl rand -base64 32`) |
| `AUTH_URL`, `AUTH_TRUST_HOST` | NextAuth canonical URL and trust flag |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Gmail SMTP (use a Google App Password) |
| `APP_URL` | Base URL used in verification email links |
| `ADMIN_EMAIL` | The first user signing up with this email gets the `ADMIN` role |

## Google OAuth setup

1. Create OAuth credentials at https://console.cloud.google.com → APIs & Services → Credentials.
2. Authorized JavaScript origins: `http://localhost:3000`, your Vercel URL.
3. Authorized redirect URI: `${AUTH_URL}/api/auth/callback/google`.

## Gmail SMTP setup

1. Enable 2-Step Verification on the Google account.
2. Create an App Password at https://myaccount.google.com/apppasswords.
3. Use that 16-character password as `SMTP_PASSWORD`.

## Vercel deployment

1. Create a Vercel project from this repo.
2. From **Storage → Create Database**, attach a **Neon Postgres** database. It auto-injects `DATABASE_URL` and `DIRECT_URL` into the project's env vars.
3. Set the rest of the env vars (Auth, Google, SMTP, `APP_URL` → your deployment URL).
4. Vercel runs `npm run build`, which runs `prisma generate && next build`. Run `npm run db:deploy` from your local terminal (against the Vercel-provided URLs) for the first migration, or wire it into the build command.
5. Push to deploy.

## Rules baked into the app

- Unauthenticated visitors can view the schedule but cannot book.
- Local signups must verify their email via a tokenised confirmation link before booking. Google signups are pre-verified.
- A reservation can include 1–N seats up to the remaining capacity of the event.
- Users can cancel **only up to 24 hours before** the event's start.
- Admins can delete any event or any reservation at any time.

## Project layout

```
app/
  api/                 REST routes (auth, signup, verify, events, reservations)
  auth/                Sign in / sign up / verify pages
  admin/               Admin dashboard
  profile/             User's bookings
  page.tsx             Public schedule
components/            UI components
lib/
  db.ts                Prisma client (driver adapter)
  mailer.ts            Nodemailer transport + templates
  tokens.ts            Verification token helpers
  format.ts            Date / currency formatting
prisma/
  schema.prisma        Models: User, Account, VerificationToken, Event, Reservation
  seed.ts              Optional admin + sample event
auth.ts                NextAuth v5 config
prisma.config.ts       Prisma 7 datasource config
```
