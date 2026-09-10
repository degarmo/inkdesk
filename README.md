# Inkdesk

Shop-floor CRM for tattoo parlors. One shop per account, with owner / admin / staff logins. Each parlor connects **its own Stripe account** in Admin → Settings. There is no shared Tally Two (or other platform) Stripe account.

## Product scope

**In this trial**

- Email/password sign-up and login. Multi-tenant by shop (one shop per account).
- **Parlor onboarding (`/onboarding`):** after signup (or first login while the shop is incomplete), owner and admin must finish or explicitly skip the setup guide before the dashboard. Steps: shop profile, first artist, optional team invite, optional payments, optional first client, done. Staff skip the gate. Re-open from Settings → Setup guide.
- Roles: `owner`, `admin`, `staff`. Existing accounts migrate to `owner`. `/admin` is owner+admin only.
- Clients: create, list, search, tags, notes, last visit.
- Artists: name, specialty, active / inactive.
- Appointments: day list with a week strip; consult / tattoo session / touch-up; scheduled, completed, cancelled, no-show; deposit amount and paid/unpaid.
- Session notes on a booking or a client card: design, placement, ink/colors, aftercare given.
- **References / prep art:** JPEG, PNG, or WebP attachments on a client card or a booking. Flag `prepForVisit` to badge today’s chairs. Soft-delete hides them from galleries.
- Dashboard: today’s chairs, unpaid deposits, recent clients, prep-ready badge, revenue / deposit / upcoming-week cards (owner/admin). Staff see their own day / week / month / year earnings, not shop GMV.
- **Analytics (`/analytics`):** parlor-scoped revenue (all / 7 / 30d), unpaid deposits, per-artist bookings and collected vs estimated (deposit book), booking mix, new clients, deposit collection rate, upcoming week, top services — **owner and admin**. Staff get their own chair’s succeeded Checkout for calendar day / week / month / year only. Never includes another parlor.
- Settings: shop name, timezone, business hours reminder. **Owner/admin only** (nav hidden and `requireAdmin` on the page and `updateSettings`). Owner/admin can re-open the setup guide.
- **Admin (`/admin`):** parlor owners and admins — users, parlor settings, appointment oversight, payment history for **that shop**.
- **Platform (`/platform`):** Inkdesk operators over **all shops**. Separate `PlatformUser` table and cookie. Shop logins cannot open it. Metrics include shops, active shops, signups, conversion (shops with ≥1 booking), churn proxy (no login 30d), GMV, bookings, clients, and first-party visits (7/30d, rough sessions, top paths).
- **First-party visits:** layout beacon `POST /api/visits` writes `PageView` rows (path, optional shopId, visitor cookie, surface). No Google Analytics.
- **Stripe (per parlor):** save `stripePublishableKey`, `stripeSecretKey`, and `stripeWebhookSecret` on the shop. Checkout and API calls use **that shop’s secret key**. Pay deposit / pay balance open Checkout. `checkout.session.completed` marks the payment succeeded and, for deposits, sets `appointment.depositPaid`.
- **Django API (Phase 1):** `backend/` is a Django 5 + DRF service on the same PostgreSQL database. Next.js remains the UI and still reads/writes through Prisma. The API exposes health, parlor token auth, and shop-scoped client / appointment reads. It does **not** replace server actions in this PR.

## Platform billing — next

Not in this release. Inkdesk does **not** take a platform cut, does **not** onboard parlors through Stripe Connect, and does **not** charge a SaaS subscription from this app.

Each parlor pastes its own Stripe keys for client deposits (or skips and takes cash). Platform subscription billing, Connect destination charges, and application fees are the next billing milestone — do not treat per-shop key paste as Connect.

**Out of scope for v1**

- Stripe Connect (platform charges / destination charges). Next step if parlors should onboard without pasting keys. See **Platform billing — next**.
- **Acting as a parlor from `/platform` (impersonation).** Operators get a read-only snapshot.
- SMS reminders.
- **Public booking page.** Landing / login / signup are tracked as page views, but there is still no client-facing booker.
- Remaining session price (beyond deposit) is not a field. Artist “estimated” revenue is the deposit book on that artist’s appointments; collected is succeeded payments linked to those appointments. Unlinked payments count in shop GMV only.
- Visit tracking does not filter bots and does not identify people — unique counts are `inkdesk_vid` cookies.
- Inventory, retail, or payroll.
- Client self-upload, HEIC conversion, image editing, or S3.
- **Invite email.** Onboarding can create a staff/admin login and shows a temporary password on screen. Nothing is emailed.
- **Django does not own writes yet.** Creates, updates, Stripe, images, and onboarding still go through Next + Prisma. Platform operator auth is not on the Django API.

## Roles

| Role | Shop floor | Analytics (`/analytics`) | Shop Admin (`/admin`) | Platform (`/platform`) |
| --- | --- | --- | --- | --- |
| Owner | Yes | Yes — this parlor’s shop haul | Yes — users, parlor Stripe keys, appointments, payments, settings, add artists | No |
| Admin | Yes | Yes — this parlor’s shop haul | Same Admin tools; cannot deactivate the last owner | No |
| Staff | Yes (no Settings, cannot add artists) | Yes — **own chair only** (day / week / month / year). Not shop GMV | No. `/admin` and `/settings` redirect to the dashboard | No |
| Platform operator | No | No | No | Yes — instance metrics, traffic, every shop, bookings and payments pulse |

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
- PostgreSQL is the app database in production (Render Postgres) and locally (Docker or a Render External Database URL). SQLite is not a supported deploy path.
- Auth is a signed, httpOnly session cookie (JWT via `jose` + `bcryptjs` passwords). No third-party auth provider. Live role and `active` come from the database on each request.
- Re-seeding recreates the shop, which invalidates existing session cookies. Inkdesk expires those cookies and sends you to `/login` instead of looping.
- `Shop.onboardingCompletedAt` is null until an owner/admin finishes or skip-to-end on `/onboarding`. The migration backfills existing shops as already complete so live parlors are not locked into the wizard. `onboardingStep` (1–6) is the resume point.
- Session notes require at least one of: design notes, placement, or ink/colors.
- Creates (client, appointment, session note) send an idempotency key so a double-submit does not insert two rows.
- Images live on local disk under `storage/shops/{shopId}/clients/{clientId}/` (gitignored). Serve them only through authenticated `GET /api/images/[id]`. Soft-deleted rows stay in the database with `deletedAt` set and are hidden from galleries. HEIC is rejected with an error; export JPEG/PNG/WebP instead. Caps: 10 MB per file, about 50 images per client and 20 per booking.
- Successful form updates `redirect()` so a no-JS POST does not hang.

## Run locally

Requires Node.js 20+ and **PostgreSQL**. Docker Compose is the default local path ([`docker-compose.yml`](./docker-compose.yml)).

```bash
npm install
cp .env.example .env
# Optionally replace AUTH_SECRET:
#   openssl rand -base64 32
docker compose up -d          # postgres:16 on localhost:5432 (user/pass/db: inkdesk)
npx prisma migrate dev
npm run db:seed               # destructive demo data — never against a live parlor
npm run dev
```

If you already have Postgres (no Docker), point `DATABASE_URL` at it, for example:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/inkdesk?schema=public"
```

To develop against a **Render** database from your laptop, copy **External Database URL** from the Postgres dashboard and append `sslmode=require`:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/inkdesk?sslmode=require"
```

Do not use a `file:` SQLite URL. The app refuses to start if `DATABASE_URL` is a SQLite path.

Open [http://localhost:43147](http://localhost:43147). The Django API is optional for UI work; see **Run the Django API locally** below.

**Demo shop — Blackbird Ink** (America/Los_Angeles)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `demo@blackbird.ink` | `parlor-demo` |
| Admin | `admin@blackbird.ink` | `parlor-admin` |
| Staff | `artist@blackbird.ink` | `parlor-staff` |

Seed includes two artists, eight clients, a week of bookings (including a cancelled consult and a no-show so analytics rates are not all zeros), extra succeeded payments so per-artist collected is populated, and Priya Nair’s sample reference JPEG + design PNG (prep-for-visit). Stripe keys are **not** seeded; connect them in Admin → Settings.

**Second demo parlor — Harbor Needle** (America/New_York)

| Role | Email | Password |
| --- | --- | --- |
| Owner | `owner@harborneedle.ink` | `parlor-harbor` |

**Quiet parlor — Ash & Ivy** exists so platform metrics can show a shop with no login or booking in 30 days (`ivy@ashandivy.ink` / `parlor-quiet`).

**Onboarding test parlor — Draft Parlor** is seeded *incomplete* (`onboardingCompletedAt` is null) so you can walk the wizard without signing up. Staff on this shop skip the gate and land on the empty dashboard.

| Role | Email | Password |
| --- | --- | --- |
| Owner | `setup@draft.ink` | `parlor-setup` |
| Staff | `staff@draft.ink` | `parlor-setup-staff` |

**Platform operator** (all shops, not a parlor login)

| | Email | Password |
| --- | --- | --- |
| Operator | `platform@inkdesk.app` | `platform-admin` |

Open [http://localhost:43147/platform/login](http://localhost:43147/platform/login). Routes: `/platform` overview, `/platform/shops`, `/platform/shops/[id]`, `/platform/bookings`, `/platform/payments`. Shop JWTs cannot open these pages.

Parlor analytics: `/analytics` (and cards on `/dashboard`). Tenant-scoped. Owner/admin see shop GMV; staff see their linked chair only.

**Staff “own money” attribution:** `Artist` is a roster row, not a login. Payments hang off `Appointment.artistId`. Staff earnings are succeeded Checkout on that chair in this `shopId`. Resolution order: (1) `Artist.userId` = the logged-in `User.id` (seeded for Blackbird Diego / Maya); (2) temporary fallback — exactly one unlinked artist in the shop whose name matches the login (case-insensitive). Zero or duplicate names are not attributed. Unlinked payments (no appointment) stay shop GMV and never appear on a staff view.

A shop is counted **active** if a parlor user signed in in the last 30 days (`User.lastSeenAt`) or it has a booking whose start already fell in that window (upcoming-only books do not count). **Churn proxy** is shops with no parlor login in 30 days. **Conversion** is shops with at least one appointment. Platform sessions use a separate cookie (`inkdesk_platform`).

Visits: `PageView` rows. Seed writes ~220 demo views over the last 28 days (`/`, `/login`, `/signup`, `/platform`, parlor dashboard/appointments). The running app also records navigations via `VisitBeacon` → `POST /api/visits`. Re-seed to reset the demo series. There is no separate traffic seed script — `npm run db:seed` is that script.

Scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js on port 43147 |
| `npm run db:up` / `db:down` | Start / stop local Postgres (`docker compose`) |
| `npm run db:migrate` | Create / apply Prisma migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations without prompting (`prisma migrate deploy`) — this is what Render runs on start |
| `npm run db:seed` | Reset demo data (four shops + platform operator + page views). Blackbird, Harbor, and Ash & Ivy are already onboarded. Draft Parlor is left incomplete for the setup wizard. Existing demo JWTs are expired on next request. Writes sample images under `storage/` (or `STORAGE_ROOT`). **Destructive — do not run against a live parlor. Do not add this to the Render start command.** |
| `npm run build` / `npm start` | Production build. `start` binds `0.0.0.0` and uses `PORT` (default 43147). |

## Run the Django API locally

Requires Python 3.12+ and the **same PostgreSQL** as Prisma (`DATABASE_URL`). Do not point Django at SQLite.

```bash
# Postgres + Prisma tables + demo rows (once)
docker compose up -d
cp .env.example .env
npx prisma migrate deploy
npm run db:seed                 # destructive — never against a live parlor

cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # or export DJANGO_SECRET_KEY and DJANGO_DEBUG
# DATABASE_URL is picked up from the repo-root .env if backend/.env omits it
python manage.py migrate        # Django system tables + django_shop_auth_token only
python manage.py runserver 8000
```

Open [http://127.0.0.1:8000/api/health/](http://127.0.0.1:8000/api/health/) — expect `{"status":"ok"}`.

**Seed bridge:** parlor shops, users, clients, and appointments are created by `npm run db:seed`, not by Django. Login against those bcrypt hashes:

```bash
curl -s -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@blackbird.ink","password":"parlor-demo"}'
# then:
# curl -s http://127.0.0.1:8000/api/clients/ -H "Authorization: Token <token>"
```

Production-style start (what Render runs): `bash start.sh` (`migrate` then gunicorn on `PORT`, default 8000).

### Schema ownership (Phase 1)

Prisma **owns** domain tables: `Shop`, `User`, `PlatformUser`, `Artist`, `Client`, `Appointment`, `SessionNote`, `ClientImage`, `Payment`, `IdempotencyKey`, `PageView` (including `Shop.onboardingCompletedAt` / `onboardingStep`). Django maps them with `managed = False` and inspectdb-style `db_table` / `db_column` names (PascalCase tables, camelCase columns). `python manage.py migrate` will not CREATE or ALTER those tables.

Django **owns** `django_*` system tables and `django_shop_auth_token` (API tokens for parlor users). Those live in the PostgreSQL schema `django`, not `public`, so a first-time `prisma migrate deploy` still sees an empty public schema if the API boots first (Prisma P3005). Token rows have no database-level FK to `User`. Unmanaged models still read `public."Shop"` via `search_path=django,public`.

Phase 2 takes ownership of the domain tables (`managed = True`, stop `prisma migrate deploy`). Do not run two competing migrate tools against the same parlor tables.

### Endpoints (Phase 1)

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health/` | No | Postgres `SELECT 1`. Render health check. |
| POST | `/api/auth/login/` | No | `{email, password}` against Prisma `User` + bcrypt. Returns `{token, user}`. |
| POST | `/api/auth/logout/` | Token | Deletes the current token. |
| GET | `/api/auth/me/` | Token | Current parlor user + public shop fields (no Stripe secrets). |
| GET | `/api/clients/` | Token | Shop-scoped list. `?q=` searches name / phone / email. |
| GET | `/api/clients/<id>/` | Token | Shop-scoped detail. Other shops 404. |
| GET | `/api/appointments/` | Token | Shop-scoped list with client + artist. Filters: `artistId`, `status`, `day`, `from`, `to`. |
| GET | `/api/appointments/<id>/` | Token | Shop-scoped detail. |

Send `Authorization: Token <key>`. JSON field names match Prisma (camelCase). `tags` is a parsed array. Django `/admin/` is a local inspect tool for Django superusers (domain models are read-only); platform operator admin is Phase 2.

### How Next will call Django next

Not wired in this PR. Next keeps using Prisma and server actions. When a route moves:

1. Set `DJANGO_API_URL` (server) to the Django origin — local `http://127.0.0.1:8000`, Render `https://<inkdesk-api>.onrender.com`.
2. Prefer **server-side** fetches from Next (no CORS). If the browser talks to Django directly, set `CORS_ALLOWED_ORIGINS` on the API to `NEXT_PUBLIC_APP_URL`.
3. Exchange parlor credentials (or a server-held token) with `POST /api/auth/login/` and send `Authorization: Token …` on reads.
4. Move writes only after Django owns the table. Do not dual-write.

### Django env vars

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Same PostgreSQL URL as Prisma. Required. `file:` / sqlite rejected. Prisma’s `?schema=public` is stripped. |
| `DJANGO_SECRET_KEY` or `SECRET_KEY` | Django signing key. Render Blueprint generates `SECRET_KEY`. Not the same as Next `AUTH_SECRET`. |
| `DJANGO_DEBUG` | `true` locally. Blueprint sets `false`. |
| `ALLOWED_HOSTS` | Comma list. Render adds `.onrender.com` and `RENDER_EXTERNAL_HOSTNAME`. |
| `CORS_ALLOWED_ORIGINS` | Browser origins. Local default is the Next ports. Unset on Render until Next calls the API. |
| `PORT` | Gunicorn bind. Render sets this. Local `runserver` default is 8000. |

`python manage.py test parlor` creates a disposable `test_inkdesk` database (needs CREATEDB, which the Docker `inkdesk` role has) and builds unmanaged tables in that test DB only.

## Deploy on Render

Blueprint file: [`render.yaml`](./render.yaml). This is the path for real-user testing.

**Blueprint services**

| Resource | Name | What it is |
| --- | --- | --- |
| Web | `inkdesk` | Node 20, Starter plan, health check `/login`. Prisma migrate + Next.js. |
| Web | `inkdesk-api` | Python 3.12, Starter plan, `rootDir: backend`. `bash start.sh` = `migrate` then gunicorn. Health `/api/health/`. |
| Postgres | `inkdesk-db` | PostgreSQL 16, `basic-256mb`, database/user `inkdesk`, 1 GB disk. **Shared** by Next and Django. |
| Disk (Next) | `inkdesk-data` | 1 GB at `/var/data` for **image uploads only** (`STORAGE_ROOT=/var/data/storage`) |

`DATABASE_URL` is **not** a secret you paste. The Blueprint sets it from `inkdesk-db` (`fromDatabase` → `connectionString` = Internal Database URL). Do not set it to `file:/var/data/inkdesk.db` or any other SQLite path.

**Env vars CD / Dashboard must set** (Blueprint `sync: false` — prompted on first apply):

| Variable | Who sets it | Value |
| --- | --- | --- |
| `DATABASE_URL` | Blueprint (from `inkdesk-db`) | Internal Postgres URL. Do not override with a `file:` path. |
| `AUTH_SECRET` | You, once | `openssl rand -base64 32` (save it; do not rotate casually) |
| `NEXT_PUBLIC_APP_URL` | You, once | `https://<service-name>.onrender.com` (no trailing slash; update if you add a custom domain) |
| `STORAGE_ROOT` | Blueprint | `/var/data/storage` |
| `NODE_VERSION` | Blueprint | `20` |
| `SECRET_KEY` | Blueprint (`inkdesk-api`) | Generated. Django signing key. |
| `DJANGO_DEBUG` | Blueprint (`inkdesk-api`) | `false` |
| `PYTHON_VERSION` | Blueprint (`inkdesk-api`) | `3.12.3` |

Next start (every boot): `mkdir -p /var/data/storage && npx prisma migrate deploy && npm start`. That applies pending Prisma migrations to Postgres, then runs Next.js. **Do not** append `npm run db:seed` — seed deletes every shop, user, and `storage/shops`.

Django start (every boot): `bash start.sh` → `python manage.py migrate --noinput` then `gunicorn --bind 0.0.0.0:$PORT inkdesk.wsgi:application`. That migrate does **not** create parlor tables.

### Five steps (GitHub → Render)

1. Push this repo to GitHub (full `main`, including `app/`, `prisma/`, `render.yaml`).
2. In [Render](https://dashboard.render.com) → **New** → **Blueprint**. Connect the GitHub repo and select `main`.
3. Confirm the Blueprint will create **both** web services (`inkdesk`, `inkdesk-api`) and the `inkdesk-db` Postgres instance. When Render prompts for `sync: false` env vars, paste `AUTH_SECRET` and `NEXT_PUBLIC_APP_URL` only. Leave `DATABASE_URL` to the linked database on both services. Django `SECRET_KEY` is generated.
4. Apply. Next build: `npm ci --include=dev && npx prisma generate && npm run build`. Next start: `mkdir -p /var/data/storage && npx prisma migrate deploy && npm start` (health `/login`). API build: `pip install -r requirements.txt`. API start: `bash start.sh` (health `/api/health/`).
5. Open `https://<inkdesk>.onrender.com/login`. Optionally seed **once** from the Next service **Shell** (`npm run db:seed`) if you want the demo parlors. Never put seed in either start command. Then `https://<inkdesk-api>.onrender.com/api/health/` should return 200. After seed, `POST /api/auth/login/` with a demo parlor user works against the same rows.

**Already deployed with SQLite on disk?** Re-syncing this Blueprint adds Postgres and points `DATABASE_URL` at it. Rows in `/var/data/inkdesk.db` (if that file still exists) are **not** copied. There is no automated SQLite → Postgres data migration in this repo. Cut over on an empty Postgres instance, or dump/restore yourself, then ignore or delete the old SQLite file. Image files already under `/var/data/storage` stay on the web disk.

**Linking Postgres without a Blueprint re-apply:** Dashboard → web service → **Environment** → add `DATABASE_URL` from the Postgres instance’s **Internal Database URL**. Migrations still run via `prisma migrate deploy` on start.

### Troubleshooting

If parlor `/login` says the email or password is incorrect after you created a user in **Render Shell**, compare that Shell’s `DATABASE_URL` host / database name (pathname) / port (strip user and password) with the live Next process: `GET /api/health` and `GET /api/health?email=that@user`. A fingerprint mismatch, or `probe.exists: false`, means those users are not in the database the web process reads. (Django `GET /api/health/` on `inkdesk-api` only returns `{status:"ok"}`.)

Stripe webhook (per shop, after you save that parlor’s keys):

- Preferred: `https://<host>/api/stripe/webhook/<shopId>`
- Fallback: `https://<host>/api/stripe/webhook` (shop comes from Checkout `metadata.shopId`)

Admin → Parlor settings shows the preferred URL for the logged-in shop.

**Demo logins** (only after a one-time seed — empty prod has none):

| | Email | Password |
| --- | --- | --- |
| Blackbird owner | `demo@blackbird.ink` | `parlor-demo` |
| Blackbird admin | `admin@blackbird.ink` | `parlor-admin` |
| Blackbird staff | `artist@blackbird.ink` | `parlor-staff` |
| Harbor owner | `owner@harborneedle.ink` | `parlor-harbor` |
| Draft parlor (wizard) | `setup@draft.ink` | `parlor-setup` |
| Platform | `platform@inkdesk.app` | `platform-admin` |

Web instance: **Starter**. Free Render web services cannot attach a disk; do not use Free if you need parlor photos to survive deploys. Postgres uses **basic-256mb** (paid). The Blueprint does not enable Render connection pooling (PgBouncer); Prisma talks to Postgres directly. If you turn pooling on later, you will need a `DIRECT_URL` for `prisma migrate deploy` — that is **not** wired today.

**Not done**

- **No SQLite → Postgres data migration.** Existing parlor rows on a leftover SQLite disk file are not imported.
- Images are still local files (`STORAGE_ROOT` on the 1 GB web disk), not S3. Without that disk, deploys wipe parlor photos (the database itself is now Render Postgres and survives deploys).
- Django is an API sibling, not a replacement. Next + Prisma still serve the UI and writes. See **Phase 2** below.
- There is **no shared platform Stripe key**. Each parlor pastes its own keys in Admin → Settings. Platform billing is still later (see **Platform billing — next**).
- The Blueprint does **not** run `db:seed` on boot. Seed deletes shops and `storage/shops`.
- Persistent disks pin the web service to one instance: no autoscaling, brief downtime on deploy.
- Changing `AUTH_SECRET` later invalidates every session cookie **and** cannot decrypt parlor Stripe secrets already stored.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string for Prisma **and** Django. Local Docker default: `postgresql://inkdesk:inkdesk@localhost:5432/inkdesk?schema=public`. Render: Internal URL from `inkdesk-db` on both web services. External (laptop → Render): same URL + `sslmode=require`. `file:` SQLite URLs are rejected. |
| `AUTH_SECRET` | Signs session cookies and encrypts parlor Stripe secrets. Use a long random value in production. Set this in the Dashboard (not in git). |
| `NEXT_PUBLIC_APP_URL` | Public HTTPS origin (no trailing slash). Used for Stripe fallback URLs and server-action allowed origins. Render also sets `RENDER_EXTERNAL_URL`. Set this in the Dashboard. |
| `APP_URL` | Optional server-only alias for the same origin. |
| `STORAGE_ROOT` | Directory for parlor image files. Local default: `./storage`. Render: `/var/data/storage` (web disk, not Postgres). |
| `STRIPE_SECRET_KEY` | Optional local-dev fallback only. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Optional local-dev fallback only. |
| `STRIPE_WEBHOOK_SECRET` | Optional local-dev fallback only. |

`.env` is gitignored. Commit `.env.example` only.

Uploaded files are not secrets, but they are shop-private. Do not commit `storage/shops/`. Session cookies are `Secure` when `NODE_ENV=production` (Render HTTPS). Client `tags` stay a JSON **string** column (not Postgres `json`) so the Prisma schema stays simple.

## Project layout

```
app/            App Router pages, shop Admin, platform console, images API, Stripe webhooks, visit beacon
actions/        Server actions (still Prisma)
components/     Shell, forms, galleries, UI primitives (Lucide on Next only)
lib/            Prisma, session, dates, shop/platform metrics, visit recording, Stripe per shop, image storage
prisma/         Schema, PostgreSQL migrations, seed, fixture JPEGs/PNGs
backend/       Django 5 + DRF API (Phase 1). Same Postgres. See parlor/models.py
storage/        Local image disk (shops/ is gitignored)
docker-compose.yml  Local Postgres 16
render.yaml     Next + Django + Render Postgres + upload disk
```

## Phase 2 (explicit — not this PR)

Do not treat missing items as silent TODOs in the Phase 1 code. This is the follow-up list:

1. **Move writes off Prisma** — clients, appointments, artists, session notes, users, onboarding, idempotency, payments, images. Next server actions become HTTP clients of Django (or are deleted).
2. **Take schema ownership** — refresh inspectdb, set `managed = True`, ship Django migrations that match the live tables, stop `prisma migrate deploy` on the Next start command.
3. **Retire Prisma** — remove `prisma/`, `@prisma/client`, and Next database access once every read/write path uses Django.
4. **Django admin for platform** — operators manage `PlatformUser` and cross-shop inspect from Django admin (or a DRF platform API). Shop JWTs stay out.
5. **Platform billing** — still later: SaaS invoices and Stripe Connect (destination charges / application fees). Per-shop key paste is not Connect. See **Platform billing — next**.
6. **Wire Next to Django** — `DJANGO_API_URL` / CORS as described above. No UI rewrite required to start.

## Suggested next milestones

1. **Platform billing — next** — SaaS invoices plus Stripe Connect (destination charges / application fees) so parlors do not paste `sk_live` material. Not started. Not part of the Django Phase 1 API.
2. **Invite email** — send the temporary staff/admin password instead of showing it on screen.
3. **Platform impersonation** — open a parlor as that shop’s owner from `/platform` (not in this release).
4. **Online booking** — public page for consults and sessions against open artist hours, writing into the same appointment table.
5. **Consent forms** — age, aftercare, and release signed on a tablet before the machine starts.
6. **SMS** — next-day reminders and “your deposit is still open” texts.
7. **Object storage** — move parlor images off the laptop disk to S3 (or similar) when more than one machine needs the files.
