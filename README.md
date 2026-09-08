# Inkdesk

Shop-floor CRM for tattoo parlors. One shop per account. Owners and artists can keep clients, the roster, appointments, deposits, and session notes in one place — without a public booking site or a card processor.

## Product scope

**In this trial**

- Email/password sign-up and login. Multi-tenant by shop (one shop per account).
- Clients: create, list, search, tags, notes, last visit.
- Artists: name, specialty, active / inactive.
- Appointments: day list with a week strip; consult / tattoo session / touch-up; scheduled, completed, cancelled, no-show; deposit amount and paid/unpaid.
- Session notes on a booking or a client card: design, placement, ink/colors, aftercare given.
- Dashboard: today’s chairs, unpaid deposits, recent clients.
- Settings: shop name, timezone, business hours reminder.

**Out of scope for v1**

- Stripe (or any payments). Deposits are bookkeeping only.
- SMS reminders.
- Public booking page.
- Inventory, retail, or payroll.

## Assumptions

- One login owns one shop. Extra staff logins, roles, and artist self-serve come later.
- Times are stored in UTC and shown in the shop timezone.
- SQLite is enough for a single-shop trial on a laptop. Switch to Postgres before sharing a server.
- Auth is a signed, httpOnly session cookie (JWT via `jose` + `bcryptjs` passwords). No third-party auth provider.

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
# Optionally replace AUTH_SECRET:
#   openssl rand -base64 32
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:43147](http://localhost:43147).

**Demo shop**

- Email: `demo@blackbird.ink`
- Password: `parlor-demo`
- Shop: Blackbird Ink — two artists, eight clients, a week of bookings.

Scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js on port 43147 |
| `npm run db:migrate` | Create / apply Prisma migrations |
| `npm run db:seed` | Reset demo data (Blackbird Ink) |
| `npm run build` / `npm start` | Production build |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Default: `file:./dev.db` (file lives in `prisma/`) |
| `AUTH_SECRET` | Signs session cookies. Use a long random value in production. |

`.env` is gitignored. Commit `.env.example` only.

## Switch to Postgres

1. Change the datasource in `prisma/schema.prisma`:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Point `DATABASE_URL` at Postgres, for example:

   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/inkdesk?schema=public"
   ```

3. Generate a fresh migration (do not reuse the SQLite SQL):

   ```bash
   npx prisma migrate dev --name postgres_init
   npm run db:seed
   ```

No other application code is SQLite-specific. Tags are stored as a JSON string so the same field works on both databases.

## Project layout

```
app/            App Router pages (auth + shop)
actions/        Server actions
components/     Shell, forms, UI primitives
lib/            Prisma, session, dates, validation
prisma/         Schema, migrations, seed
```

## Suggested next milestones

1. **Online booking** — public page for consults and sessions against open artist hours, writing into the same appointment table.
2. **Deposits via Stripe** — collect the recorded deposit, mark `depositPaid` from a webhook, email a receipt.
3. **Consent forms** — age, aftercare, and release signed on a tablet before the machine starts.
4. **Photo references** — attach design refs and healed photos to a client or session note.
5. **Staff accounts** — more than one login per shop, artist-only calendars.
6. **SMS** — next-day reminders and “your deposit is still open” texts.
