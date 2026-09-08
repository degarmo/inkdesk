# Inkdesk

Shop-floor CRM for tattoo parlors. One shop per account, with owner / admin / staff logins. Each parlor connects **its own Stripe account** in Admin → Settings. There is no shared Tally Two (or other platform) Stripe account.

## Product scope

**In this trial**

- Email/password sign-up and login. Multi-tenant by shop (one shop per account).
- Roles: `owner`, `admin`, `staff`. Existing accounts migrate to `owner`. `/admin` is owner+admin only.
- Clients: create, list, search, tags, notes, last visit.
- Artists: name, specialty, active / inactive.
- Appointments: day list with a week strip; consult / tattoo session / touch-up; scheduled, completed, cancelled, no-show; deposit amount and paid/unpaid.
- Session notes on a booking or a client card: design, placement, ink/colors, aftercare given.
- **References / prep art:** JPEG, PNG, or WebP attachments on a client card or a booking. Flag `prepForVisit` to badge today’s chairs. Soft-delete hides them from galleries.
- Dashboard: today’s chairs, unpaid deposits, recent clients, prep-ready badge.
- Settings: shop name, timezone, business hours reminder.
- **Admin (`/admin`):** parlor owners and admins — users, parlor settings, appointment oversight, payment history for **that shop**.
- **Platform (`/platform`):** Inkdesk operators over **all shops**. Separate `PlatformUser` table and cookie. Shop logins cannot open it.
- **Stripe (per parlor):** save `stripePublishableKey`, `stripeSecretKey`, and `stripeWebhookSecret` on the shop. Checkout and API calls use **that shop’s secret key**. Pay deposit / pay balance open Checkout. `checkout.session.completed` marks the payment succeeded and, for deposits, sets `appointment.depositPaid`.

**Out of scope for v1**

- Stripe Connect (platform charges / destination charges). Next step if parlors should onboard without pasting keys.
- **Acting as a parlor from `/platform` (impersonation).** Operators get a read-only snapshot.
- SMS reminders.
- Public booking page.
- Inventory, retail, or payroll.
- Client self-upload, HEIC conversion, image editing, or S3.

## Roles

| Role | Shop floor | Shop Admin (`/admin`) | Platform (`/platform`) |
| --- | --- | --- | --- |
| Owner | Yes | Yes — users, parlor Stripe keys, appointments, payments | No |
| Admin | Yes | Same Admin tools; cannot deactivate the last owner | No |
| Staff | Yes | No. `/admin` redirects to the dashboard | No |
| Platform operator | No | No | Yes — metrics, every shop, bookings and payments pulse |

## Stripe: each parlor brings its own account

Inkdesk is multi-tenant. Card traffic must never use a global platform key as the primary path.

1. Open **Admin → Parlor settings**.
2. Paste this parlor’s publishable key, secret key, and webhook signing secret.
3. Secret key and webhook secret are encrypted at rest (AES-256-GCM using `AUTH_SECRET`).
4. In Stripe Dashboard → Webhooks, add:
   - `https://<host>/api/stripe/webhook/<shopId>` (preferred), or
   - `https://<host>/api/stripe/webhook` (identifies the shop from Checkout `metadata.shopId`, then verifies with **that shop’s** signing secret)
5. Checkout Sessions always set `metadata.shopId`.

If a shop has no secret key saved, pay buttons show **Connect Stripe in Admin → Settings**.

Optional `.env` keys (`STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`) are a **local-dev fallback** when the demo shop has empty settings. Paste a test key into the demo parlor’s settings for smoke tests — do not treat `.env` as the only path, and do not require a shared Inkdesk Stripe account.

## Assumptions

- Times are stored in UTC and shown in the shop timezone.
- SQLite is enough for a single-shop trial on a laptop. Switch to Postgres before sharing a server.
- Auth is a signed, httpOnly session cookie (JWT via `jose` + `bcryptjs` passwords). No third-party auth provider. Live role and `active` come from the database on each request.
- Re-seeding recreates the shop, which invalidates existing session cookies. Inkdesk expires those cookies and sends you to `/login` instead of looping.
- Session notes require at least one of: design notes, placement, or ink/colors.
- Creates (client, appointment, session note) send an idempotency key so a double-submit does not insert two rows.
- Images live on local disk under `storage/shops/{shopId}/clients/{clientId}/` (gitignored). Serve them only through authenticated `GET /api/images/[id]`. Soft-deleted rows stay in the database with `deletedAt` set and are hidden from galleries. HEIC is rejected with an error; export JPEG/PNG/WebP instead. Caps: 10 MB per file, about 50 images per client and 20 per booking.
- Successful form updates `redirect()` so a no-JS POST does not hang.

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

**Demo shop — Blackbird Ink** (America/Los_Angeles)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `demo@blackbird.ink` | `parlor-demo` |
| Admin | `admin@blackbird.ink` | `parlor-admin` |
| Staff | `artist@blackbird.ink` | `parlor-staff` |

Seed includes two artists, eight clients, a week of bookings, and Priya Nair’s sample reference JPEG + design PNG (prep-for-visit). Stripe keys are **not** seeded; connect them in Admin → Settings.

**Second demo parlor — Harbor Needle** (America/New_York)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@harborneedle.ink` | `parlor-harbor` |

**Quiet parlor — Ash & Ivy** exists so platform metrics can show a shop with no login or booking in 30 days (`ivy@ashandivy.ink` / `parlor-quiet`).

**Platform operator** (all shops, not a parlor login)

| | Email | Password |
| --- | --- | --- |
| Operator | `platform@inkdesk.app` | `platform-admin` |

Open [http://localhost:43147/platform/login](http://localhost:43147/platform/login). Routes: `/platform` overview, `/platform/shops`, `/platform/shops/[id]`, `/platform/bookings`, `/platform/payments`. Shop JWTs cannot open these pages.

A shop is counted **active** if a parlor user signed in in the last 30 days (`User.lastSeenAt`) or it has a booking whose start already fell in that window (upcoming-only books do not count). Platform sessions use a separate cookie (`inkdesk_platform`).

Scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js on port 43147 |
| `npm run db:migrate` | Create / apply Prisma migrations |
| `npm run db:seed` | Reset demo data (three shops + platform operator). Existing demo JWTs are expired on next request. Writes sample images under `storage/`. |
| `npm run build` / `npm start` | Production build |

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string. Default: `file:./dev.db` (file lives in `prisma/`) |
| `AUTH_SECRET` | Signs session cookies and encrypts parlor Stripe secrets. Use a long random value in production. |
| `APP_URL` | Optional origin if Stripe cannot read the request host. |
| `STRIPE_SECRET_KEY` | Optional local-dev fallback only. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional local-dev fallback only. |
| `STRIPE_WEBHOOK_SECRET` | Optional local-dev fallback only. |

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
app/            App Router pages, shop Admin, platform console, images API, Stripe webhooks
actions/        Server actions
components/     Shell, forms, galleries, UI primitives
lib/            Prisma, session, dates, validation, Stripe per shop, image storage
prisma/         Schema, migrations, seed, fixture JPEGs/PNGs
storage/        Local image disk (shops/ is gitignored)
```

## Suggested next milestones

1. **Stripe Connect** — onboard parlors without pasting secret keys; destination charges instead of stored `sk_live` material.
2. **Platform impersonation** — open a parlor as that shop’s owner from `/platform` (not in this release).
3. **Online booking** — public page for consults and sessions against open artist hours, writing into the same appointment table.
4. **Consent forms** — age, aftercare, and release signed on a tablet before the machine starts.
5. **SMS** — next-day reminders and “your deposit is still open” texts.
6. **Object storage** — move parlor images off the laptop disk to S3 (or similar) when more than one machine needs the files.
