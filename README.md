# TG Exercise Tracker

Coach/client workout logging. Next.js 14 (App Router) · Prisma · PostgreSQL · NextAuth (Google).

## Setup

```bash
pnpm install                      # also runs prisma generate
cp .env.example .env.local        # fill in values (see below)
createdb tg_exercise_tracker
npx prisma migrate dev --name init
npx prisma db seed                # optional: exercise library + sample template
pnpm dev                          # http://localhost:3000
```

### Environment
- `NEXTAUTH_SECRET`: `openssl rand -base64 32`
- Google Cloud Console -> OAuth client (Web). Authorized redirect URI:
  `http://localhost:3000/api/auth/callback/google` (and your production URL equivalent).
- `ADMIN_EMAILS`: your Google email(s). Anyone listed becomes a coach on login (log out/in after changing).

## How it works
1. Coach signs in -> **Templates**: add exercises, build one week, set the number of weeks.
2. **Clients**: invite by Google email, open the client, assign a template + start date.
3. Client signs in with that same Google account, logs sets. Last week's weight is suggested automatically.
4. Coach can lock days, pause/complete blocks, and view analytics.

Weights are in kg: change `lib/constants.ts` for lbs.

## Telegram notifications
Set `TELEGRAM_BOT_TOKEN` (from @BotFather) and `TELEGRAM_CHAT_ID`. You get a message when a client submits a workout.
Open your bot and press Start once, otherwise Telegram blocks it from messaging you.

## Deploy (Vercel)
Set `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`.
Run `npx prisma migrate deploy` against the production DB.

## API (all under `/api/v1`, JSON envelope `{success, data, error}`)
`GET/POST clients` · `GET clients/:id` · `GET/POST exercises` · `GET/POST templates` ·
`GET/POST blocks` · `GET/PATCH blocks/:id` · `GET/PATCH days/:id` · `POST days/:id/submit` ·
`GET analytics/progress` · `GET analytics/cycle-report` · `GET health`
