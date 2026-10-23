# Harsh Raj Portfolio — Frontend + Backend

An editorial data-science / AI-ML portfolio with a database-backed admin panel and the Gullu portfolio assistant. The original Next.js application has been split into two independently deployable applications:

- **`frontend/`** — Next.js 15 App Router UI, themes, animations, admin screens and small server-side proxies.
- **`backend/`** — Express API that owns Prisma, MongoDB, GridFS, authentication, CRUD, settings, messages, media and Gullu.

The public site, admin panel, content, themes, media references and Gullu behaviour are preserved. The existing MongoDB database and the existing GridFS bucket **`portfolioMedia`** are used as-is. No database reset, data migration, media re-upload or destructive schema change is part of this split.

---

## Repository layout

```text
.
├── frontend/
│   ├── app/
│   │   ├── (site)/                 # public pages
│   │   ├── admin/                  # login + admin panel
│   │   ├── actions/contact.ts      # contact server action
│   │   └── api/
│   │       ├── media/              # authenticated media BFF + public media proxy
│   │       └── gullu/              # Gullu BFF proxy
│   ├── components/                 # public + admin UI
│   ├── lib/                        # API client, view types, auth, forms
│   ├── public/
│   │   ├── gullu/                  # Gullu artwork
│   │   └── uploads/seed/           # bundled demo assets (31 files)
│   ├── middleware.ts               # cookie-presence gate for /admin
│   ├── next.config.mjs
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express app, CORS, error handling
│   │   ├── server.ts               # process entry point
│   │   ├── routes/                 # auth, public, admin, media, Gullu
│   │   ├── services/               # content, admin CRUD, contact, Gullu
│   │   ├── lib/                    # Prisma, auth, GridFS, settings, media
│   │   └── middleware/auth.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── content.json
│   │   └── seed.mjs
│   ├── scripts/make-assets.mjs
│   └── .env.example
├── README.md
└── .gitignore
```

The old root-level Next.js files were moved into `frontend/`; the Prisma schema, seed content and asset generator were moved into `backend/`. The old root package files are gone, so the two applications have separate dependency and lock files.

---

## How the split works

```text
Browser
  │
  ├── HTML / CSS / JS / images ───────────────► frontend (Next.js)
  │                                      │
  │                                      ├── server components / server actions
  │                                      │        │
  │                                      │        └── BACKEND_URL + Bearer token
  │                                      │                 │
  │                                      │                 ▼
  │                                      │          backend (Express)
  │                                      │                 │
  │                                      │                 ├── Prisma ──► MongoDB Atlas
  │                                      │                 ├── GridFS bucket `portfolioMedia`
  │                                      │                 └── Gullu answer engine
  │                                      │
  │                                      └── /api/media/:id proxy (GridFS stream)
  │
  └── /api/gullu proxy ─────────────────────────────────────► backend Gullu endpoint
```

- The browser never receives `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_PASSWORD`, `GULLU_API_KEY`, Prisma, MongoDB or bcrypt code.
- Frontend pages, admin actions and contact submission call the backend over HTTP.
- Admin login calls `POST /api/auth/login`; the backend returns the existing HMAC-signed token format. The frontend stores it in the HTTP-only `portfolio_session` cookie and sends it as `Authorization: Bearer <token>` on server-to-server requests.
- The backend remains the authoritative authentication gate through `requireAdmin`. The Next.js middleware only checks that a cookie exists before rendering the admin shell; it does not trust or verify the token.
- Existing media URLs such as `/api/media/<id>` still work: the frontend route proxies the backend GridFS stream, including `Range` requests. The GridFS bucket and all existing file IDs are unchanged.
- The 31 demo files in `frontend/public/uploads/seed/` remain static frontend assets. The admin media library merges them with backend GridFS files; they are read-only and are not migrated into GridFS.
- Gullu's browser endpoint is proxied through the frontend. The answer engine, rate limiting and optional external AI provider stay on the backend.

---

## Requirements

- Node.js 20.9 or newer
- npm
- A MongoDB Atlas connection string for the existing portfolio database
- The existing GridFS bucket name: **`portfolioMedia`**

Do not point a fresh/reset database at production. `db:reset` is destructive and must not be run against live data.

---

## Local setup

### 1. Backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit backend/.env and fill DATABASE_URL, AUTH_SECRET and the optional values.
npx prisma generate
npm run dev
```

The API starts on `http://localhost:5000` by default. Check it with:

```powershell
Invoke-WebRequest http://localhost:5000/api/health
# {"ok":true}
```

Use `npm run build` + `npm start` to run the compiled backend from `backend/dist`.

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
# BACKEND_URL must point at the running backend.
npm run dev
```

The site is available at `http://localhost:3000`. The default local frontend config is:

```dotenv
BACKEND_URL="http://localhost:5000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

For a production-style local run:

```powershell
cd frontend
npm run build
npm start
```

Both applications can run on the same machine, but they must be started as separate processes.

### Seed and demo assets

`backend/prisma/seed.mjs` seeds the first admin only when the `User` collection is empty and fills demo content/settings. It is intended for initial setup or a new environment; it is not a reset command. `npm run db:reset` in the backend is **destructive** and should never be used against the live portfolio.

`npm run assets` in the backend regenerates the demo SVG/PDF files into `frontend/public/uploads/seed/`. Do not run it over a production deployment unless you intend to replace those static demo assets.

---

## Environment variables

### `backend/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | MongoDB Atlas connection string for the existing database. |
| `AUTH_SECRET` | Yes | HMAC secret used to sign the 7-day admin session token. At least 16 characters. Keep the existing secret to preserve existing sessions. |
| `PORT` | No | Express port. Default `5000`. |
| `FRONTEND_URL` | No | Comma-separated browser origins allowed by CORS, e.g. `https://portfolio.example.com,https://www.portfolio.example.com`. Default `http://localhost:3000`. Never use `*` for authenticated APIs. |
| `NODE_ENV` | No | Set to `production` on the deployed backend. |
| `ADMIN_NAME` | Seed only | Display name for the first admin. |
| `ADMIN_EMAIL` | Seed only | Email for the first admin. Existing users are never overwritten. |
| `ADMIN_PASSWORD` | Seed only | Initial password for the first admin. The live password is stored as a bcrypt hash in MongoDB. |
| `GULLU_API_KEY` | No | Optional external AI provider key. Without it, Gullu uses local portfolio answers. |
| `GULLU_API_URL` | No | Provider chat-completions URL. |
| `GULLU_MODEL` | No | Provider model name. |

### `frontend/.env.local` (or deployment environment)

| Variable | Required | Purpose |
| --- | --- | --- |
| `BACKEND_URL` | Yes | Server-only base URL of the Express API. Do not prefix this with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public canonical frontend URL used in metadata, sitemap and Open Graph URLs. |

Never put secrets in `NEXT_PUBLIC_*` variables. `NEXT_PUBLIC_SITE_URL` is intentionally public; `BACKEND_URL` and all credentials are server-only.

---

## API reference

### Health and authentication

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/health` | No | Liveness check, returns `{ "ok": true }`. |
| `POST` | `/api/auth/login` | No | Body: `{ email, password }`. Returns `{ token, user }`. |
| `GET` | `/api/auth/me` | Bearer | Returns the current admin user. |
| `POST` | `/api/auth/logout` | No | Stateless logout; returns `204`. The frontend clears its cookie. |
| `POST` | `/api/auth/change-password` | Bearer | Body: `{ currentPassword, newPassword }`. |
| `POST` | `/api/public/contact` | No | Validates and stores a contact message; returns a user-facing result object. |

### Public content

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/public/profile` | Profile view model. |
| `GET` | `/api/public/projects` | Optional `featured=true`, `category=...`, `limit=...`; published only. |
| `GET` | `/api/public/projects/:slug` | Single published project, or `404`. |
| `GET` | `/api/public/experience` | Optional `limit=...`. |
| `GET` | `/api/public/skills` | Grouped published skills. |
| `GET` | `/api/public/gallery` | Optional `featured=true`, `category=...`, `limit=...`. |
| `GET` | `/api/public/gallery-categories` | Distinct gallery categories. |
| `GET` | `/api/public/categories` | Project categories with counts. |
| `GET` | `/api/public/social-links` | Enabled social links. |
| `GET` | `/api/public/settings` | Resolved site settings. |
| `POST` | `/api/gullu` | Body: `{ question }`. Returns `{ answer, ... }`; supports English, Hindi and Hinglish. |

### Media

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/media/:id` | No | GridFS stream. Supports `Range`; returns `206` for partial content. |
| `HEAD` | `/api/media/:id` | No | Same headers without a body. |
| `GET` | `/api/admin/media` | Bearer | Lists GridFS files. |
| `POST` | `/api/admin/media` | Bearer | `multipart/form-data` with a `file` field; optional `category`. Max 24 MB. |
| `DELETE` | `/api/admin/media/:id` | Bearer | Refuses (`409`) if any content still references the file. |

The frontend exposes:

- `GET/POST/DELETE /api/media` — authenticated admin media library BFF (list, upload, delete) plus read-only seed-file listing.
- `GET/HEAD /api/media/:id` — public proxy that keeps existing media URLs working.
- `POST /api/gullu` — Gullu browser proxy.

### Admin content

All `/api/admin/*` routes require `Authorization: Bearer <token>`.

| Method | Path | Notes |
| --- | --- | --- |
| `GET`, `PUT` | `/api/admin/profile` | Read/save the single profile document. |
| `GET`, `POST` | `/api/admin/projects` | List all projects / create. |
| `PUT`, `DELETE` | `/api/admin/projects/:id` | Update/delete a project. |
| `POST` | `/api/admin/projects/:id/duplicate` | Duplicate a project. |
| `GET`, `POST` | `/api/admin/experience` | List/create experience. |
| `PUT`, `DELETE` | `/api/admin/experience/:id` | Update/delete experience. |
| `GET`, `POST` | `/api/admin/skills` | List/create skills. |
| `PUT`, `DELETE` | `/api/admin/skills/:id` | Update/delete a skill. |
| `GET`, `POST` | `/api/admin/gallery` | List/create gallery items. |
| `PUT`, `DELETE` | `/api/admin/gallery/:id` | Update/delete a gallery item. |
| `GET`, `POST` | `/api/admin/social-links` | List/create social links. |
| `PUT`, `DELETE` | `/api/admin/social-links/:id` | Update/delete a social link. |
| `GET`, `PUT` | `/api/admin/settings` | Read/save settings. |
| `POST` | `/api/admin/settings/reset` | **Destructive settings reset.** Do not call against live data. |
| `PUT` | `/api/admin/theme` | Save default theme mode and accent. |
| `GET` | `/api/admin/messages?filter=all\|unread\|read` | Inbox. |
| `GET` | `/api/admin/recent-messages?take=4` | Recent messages for the dashboard. |
| `PATCH` | `/api/admin/messages/:id/read` | Body: `{ read: boolean }`. |
| `DELETE` | `/api/admin/messages/:id` | Delete a message. |
| `GET` | `/api/admin/counts` | Dashboard counts. |
| `DELETE` | `/api/admin/records/:resource/:id` | Generic delete for `projects`, `experience`, `skills`, `gallery`, `social`. |
| `PATCH` | `/api/admin/records/:resource/:id/toggle` | Body: `{ field }`. Toggle publish/featured/read flags. |
| `POST` | `/api/admin/records/:resource/:id/move` | Body: `{ direction, scopeField?, scopeValue? }`. Reorder within a resource/scope. |

Errors use JSON `{ "error": "message" }` and appropriate HTTP statuses (`400`, `401`, `404`, `409`, `413`, `415`, `500`).

---

## Commands

### Frontend

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js development server. |
| `npm run build` | Production build. |
| `npm start` | Serve the production build. |
| `npm run typecheck` | TypeScript check without emitting. |

The frontend has no Prisma, MongoDB, GridFS, bcrypt or `DATABASE_URL` dependency.

### Backend

| Command | Purpose |
| --- | --- |
| `npm run dev` | Express development server with `tsx watch`. |
| `npm run build` | Compile TypeScript to `backend/dist`. |
| `npm start` | Run `backend/dist/server.js`. |
| `npm run typecheck` | TypeScript check without emitting. |
| `npm run prisma:generate` | Generate the Prisma client. |
| `npm run db:push` | Apply the Prisma schema/indexes to MongoDB (initial setup only). |
| `npm run db:seed` | Seed first admin and demo content non-destructively for a new database. |
| `npm run db:reset` | **Destructive:** force-reset the database and seed. Never run against live data. |
| `npm run assets` | Regenerate static demo assets into `frontend/public/uploads/seed/`. |

---

## Deployment

### Backend (Render, Railway, Fly.io, VPS, etc.)

- Root directory: `backend`
- Install: `npm ci`
- Generate client: `npm run prisma:generate`
- Build: `npm run build`
- Start: `npm start`
- Health check: `GET /api/health`
- Set `DATABASE_URL`, `AUTH_SECRET`, `NODE_ENV=production`, `PORT` (if the platform supplies one), and `FRONTEND_URL`.
- `FRONTEND_URL` must list the production frontend origin(s), comma-separated. Authenticated API CORS is allow-listed, not `*`.
- Keep the existing `AUTH_SECRET` if you want current admin sessions to remain valid.
- Allow the deployment host in MongoDB Atlas network access.
- The GridFS bucket remains `portfolioMedia`; do not create a new bucket or re-upload existing media.

### Frontend (Vercel, Netlify, Node host, etc.)

- Root directory: `frontend`
- Install: `npm ci`
- Build: `npm run build`
- Start: `npm start`
- Set `BACKEND_URL` to the deployed backend HTTPS URL.
- Set `NEXT_PUBLIC_SITE_URL` to the deployed frontend HTTPS URL.
- Keep `BACKEND_URL` server-only. It must not be exposed as `NEXT_PUBLIC_BACKEND_URL`.
- Production admin cookies are `Secure`; the frontend must be served over HTTPS.

### Cross-deployment checklist

- Backend `FRONTEND_URL` = exact frontend origin(s), including `https://` and no trailing slash (the app also normalizes a trailing slash).
- Frontend `BACKEND_URL` = backend origin, no trailing slash required.
- Both services use the same MongoDB database and the same `AUTH_SECRET`.
- Existing media URLs continue to resolve through the frontend `/api/media/:id` proxy.
- Do not run `db:reset`, do not drop collections, and do not change the GridFS bucket name.

---

## Data and media preservation

The split was performed without resetting or destructively migrating MongoDB:

- Existing users, profile, projects, experience, skills, gallery records, social links, settings, messages and media references remain in the same database.
- The GridFS bucket remains **`portfolioMedia`**.
- Existing GridFS IDs remain unchanged:
  - avatar `6ad8ec3fc498d952445bcb12` (107,254 bytes)
  - resume `6ad8ec3fc498d952445bcb14` (121,718 bytes)
  - about image `6ad8e807b6c1a169d1977038` (1,207,026 bytes)
- Existing media URLs of the form `/api/media/<id>` are still used. The frontend proxies them to the backend.
- The 31 static seed files stay in `frontend/public/uploads/seed/` and are not moved into GridFS.

Current verified collection counts (after the split and test cleanup): User 1, Profile 1, Project 10 (9 demo + 1 published Netflix project), Experience 5, Skill 29, Gallery 13, SocialLink 10, Setting 64, Message 2.

---

## Verification performed

- Backend `prisma validate`, `prisma generate`, `npm run typecheck`, `npm run build`: passed.
- Frontend `npm run typecheck`, `npm run build`: passed.
- 83 automated integration checks against the running backend and frontend: **83/83 passed**, covering:
  - health, CORS allow/deny, auth token validation, wrong-password login, change-password rejection for a wrong current password, logout
  - every public read endpoint, settings, contact validation and storage
  - admin profile/settings/theme saves with identical values
  - project create/update/toggle/duplicate/delete and a no-op end-of-list move
  - experience, skill, gallery and social-link create/update/toggle/delete
  - message read/delete and inbox filtering
  - media list, full GET, `Range` GET, `HEAD`, referenced-delete protection, missing-delete `404`, upload/delete, and GridFS invariants
  - frontend media BFF list/upload/delete, 34-file merge (3 GridFS + 31 seed), media proxy full/range, and `/api/gullu`
  - frontend admin unauthenticated redirect, authenticated render, and login-page redirect when already signed in
  - final collection counts, record ordering, GridFS IDs/sizes, admin password hash, profile and settings unchanged
- Frontend contact form submitted through a real browser; the server action stored the message and the temporary message was deleted.
- Admin profile, login-failure and logout server actions were exercised through the frontend HTTP surface. The profile action left the document unchanged after newline normalization.
- Public and admin page HTML was compared with the pre-split baseline. All pages returned `200`; visible text matched. The only differences were relative timestamps ("4d ago" → "5d ago") and Next.js's streaming position of the `<title>` tag. UI, content, layout, themes and media were preserved.

### Not performed (deliberately)

- Logging in with the live admin's real password. The seed email/password in the backend env do not match the live admin record, and changing/resetting the password was forbidden. Wrong-password, token, cookie, route-gating and server-action flows were tested instead.
- `POST /api/admin/settings/reset` against live settings.
- A real password change.
- A reorder operation that would change the order of existing live records (only a no-op end-of-list move was tested).
- `db:reset`, database drops, media re-uploads or GridFS bucket changes.

If the live admin password is lost, a deliberate server-side reset is required; this split does not add a self-service reset flow.

---

## Remaining notes

- The admin middleware is intentionally a cookie-presence gate only. It avoids rendering the admin shell for anonymous visitors; the Express API and `requireAdmin` remain the security boundary. A forged cookie can reach an admin page but cannot fetch private data or perform writes.
- The backend's `FRONTEND_URL` CORS allow-list should be updated whenever the frontend domain changes. Do not fall back to `*` for authenticated APIs.
- Keep `AUTH_SECRET` out of the frontend and out of `NEXT_PUBLIC_*`.
- The frontend production build uses the existing static seed assets. Deploy `frontend/public/uploads/seed/` together with the frontend.
- If any `.env` file was ever committed or shared, rotate `AUTH_SECRET`, the MongoDB password and any Gullu provider key after deployment.
