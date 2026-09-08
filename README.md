# Inkdesk

Shop-floor CRM for tattoo parlors. One shop per account. Owners and artists can keep clients, the roster, appointments, deposits, session notes, and chair-side reference images in one place — without a public booking site or a card processor.

## Product scope

**In this trial**

- Email/password sign-up and login. Multi-tenant by shop (one shop per account).
- Clients: create, list, search, tags, notes, last visit.
- Artists: name, specialty, active / inactive.
- Appointments: day list with a week strip; consult / tattoo session / touch-up; scheduled, completed, cancelled, no-show; deposit amount and paid/unpaid.
- Session notes on a booking or a client card: design, placement, ink/colors, aftercare given.
- **References / prep art:** JPEG, PNG, or WebP attachments on a client card or a booking. Flag `prepForVisit` to badge today’s chairs. Soft-delete hides them from galleries.
- Dashboard: today’s chairs, unpaid deposits, recent clients, prep-ready badge.
- Settings: shop name, timezone, business hours reminder.

**Out of scope for v1**

- Stripe (or any payments). Deposits are bookkeeping only.
- SMS reminders.
- Public booking page.
- Inventory, retail, or payroll.
- Client self-upload, HEIC conversion, image editing, or S3.

## Assumptions

- One login owns one shop. Extra staff logins, roles, and artist self-serve come later.
- Times are stored in UTC and shown in the shop timezone.
- SQLite is enough for a single-shop trial on a laptop. Switch to Postgres before sharing a server.
- Auth is a signed, httpOnly session cookie (JWT via `jose` + `bcryptjs` passwords). No third-party auth provider.
- Re-seeding recreates the shop, which invalidates existing session cookies. Inkdesk expires those cookies and sends you to `/login` instead of looping.
- Session notes require at least one of: design notes, placement, or ink/colors.
- Creates (client, appointment, session note) send an idempotency key so a double-submit does not insert two rows.
- Images live on local disk under `storage/shops/{shopId}/clients/{clientId}/` (gitignored). Serve them only through authenticated `GET /api/images/[id]`. Soft-deleted rows stay in the database with `deletedAt` set and are hidden from galleries. HEIC is rejected with an error; export JPEG/PNG/WebP instead. Caps: 10 MB per file, about 50 images per client and 20 per booking.

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
- Priya Nair’s card and today’s 12:00 booking include a sample reference JPEG and design PNG, both flagged prep-for-visit so the dashboard shows **Prep ready**.

Scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js on port 43147 |
| `npm run db:migrate` | Create / apply Prisma migrations |
| `npm run db:seed` | Reset demo data (Blackbird Ink). Existing demo JWTs are expired on next request. Writes sample images under `storage/`. |
| `npm run build` / `npm start` | Production build |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Default: `file:./dev.db` (file lives in `prisma/`) |
| `AUTH_SECRET` | Signs session cookies. Use a long random value in production. |

`.env` is gitignored. Commit `.env.example` only.

Uploaded files are not secrets, but they are shop-private. Do not commit `storage/shops/`.

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
app/            App Router pages (auth + shop) and GET /api/images/[id]
actions/        Server actions
components/     Shell, forms, galleries, UI primitives
lib/            Prisma, session, dates, validation, image storage
prisma/         Schema, migrations, seed, fixture JPEGs/PNGs
storage/        Local image disk (shops/ is gitignored)
```

## Suggested next milestones

1. **Online booking** — public page for consults and sessions against open artist hours, writing into the same appointment table.
2. **Deposits via Stripe** — collect the recorded deposit, mark `depositPaid` from a webhook, email a receipt.
3. **Consent forms** — age, aftercare, and release signed on a tablet before the machine starts.
4. **Staff accounts** — more than one login per shop, artist-only calendars.
5. **SMS** — next-day reminders and “your deposit is still open” texts.
6. **Object storage** — move parlor images off the laptop disk to S3 (or similar) when more than one machine needs the files.
