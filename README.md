# Harsh Portfolio

Production split of the portfolio into two Render Web Services:

```text
frontend/   Next.js 15 public site + admin UI
backend/    Express API, Prisma, MongoDB Atlas and GridFS
```

The public portfolio renders from a committed snapshot and local media mirror,
so a sleeping backend never blocks, blanks or redirects the public site. Admin
features, contact storage and Gullu talk to the backend only when used.

## Features

- Public portfolio: home, about, projects, project details, experience, skills,
  gallery and contact
- Secure admin dashboard and HTTP-only signed sessions
- Manage projects, experience, skills, gallery, social links, settings and theme
- MongoDB Atlas data and GridFS media (bucket `portfolioMedia`)
- Light, dark and colour themes
- Gullu portfolio assistant with English, Hindi and Hinglish support
- Contact form stored privately in MongoDB
- SEO metadata, sitemap, robots and Open Graph image

## Architecture

### Frontend availability

`frontend/data/public-content.json` is a public-only snapshot generated from the
database. `frontend/lib/public-content.ts` reads it during static generation.
Public pages do not call the backend while rendering:

```text
Visitor -> Render frontend -> static/ISR page from local snapshot
                                       |
                                       +-- optional admin/contact/Gullu calls
                                           only after interaction
```

Existing GridFS files referenced by the snapshot are mirrored under
`frontend/public/media/<id>`, with content types in
`frontend/data/media-manifest.json`. `/api/media/<id>` serves the local copy
first. Only a new file that has not been mirrored falls back to the backend.

### Admin and private features

The browser talks to the Next.js app. Server actions and admin pages call the
Express API with the admin's signed HTTP-only cookie. Database credentials,
`AUTH_SECRET`, admin passwords and AI keys stay in the backend environment.

If the API is asleep or the database is temporarily unavailable, admin routes
show a feature-specific "Backend temporarily unavailable" panel. Public pages
keep rendering from the committed snapshot.

### Refreshing public content

The public snapshot is intentionally separate from admin data. Regenerate it
after content changes and commit the result before deploying:

```bash
cd backend
npm run snapshot:public
```

This is a read-only job for MongoDB/GridFS. It never resets, seeds, uploads or
deletes database records. It writes:

```text
frontend/data/public-content.json
frontend/data/media-manifest.json
frontend/public/media/<id>
```

Admin actions also try to refresh the runtime snapshot and revalidate public
pages while the backend is awake. A committed snapshot is still the guaranteed
fallback after a frontend restart, so regenerate and redeploy for permanent
content changes.

## Local development

### Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

`http://localhost:5000`

Health check: `http://localhost:5000/health`

Create `backend/.env` from `backend/.env.example`:

```env
DATABASE_URL="mongodb+srv://..."
AUTH_SECRET="a-long-random-secret"
ADMIN_NAME="Portfolio Admin"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="seed-only-password"
GULLU_API_KEY=""
GULLU_API_URL="https://api.openai.com/v1/chat/completions"
GULLU_MODEL="gpt-4o-mini"
FRONTEND_URL="http://localhost:3000"
PORT=5000
```

`ADMIN_*` values only create the first admin when the User collection is empty.
Changing them later does not change an existing user.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:3000`

Create `frontend/.env.local` from `frontend/.env.example`:

```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

The frontend can build and serve public pages with the backend stopped.

## Render

Use the root `render.yaml` blueprint, or create two Web Services manually.

### Frontend service

```text
Root Directory: frontend
Build Command:  npm ci && npm run build
Start Command:  npm start
Health Check:   /
```

Environment:

```env
NEXT_PUBLIC_BACKEND_URL=https://<backend-render-domain>.onrender.com
NEXT_PUBLIC_SITE_URL=https://<frontend-render-domain>.onrender.com
```

### Backend service

```text
Root Directory: backend
Build Command:  npm ci && npm run build
Start Command:  npm start
Health Check:   /health
```

Environment:

```env
DATABASE_URL=...
AUTH_SECRET=...
ADMIN_NAME=...
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
GULLU_API_KEY=...
GULLU_API_URL=https://api.openai.com/v1/chat/completions
GULLU_MODEL=gpt-4o-mini
FRONTEND_URL=https://<frontend-render-domain>.onrender.com
PORT=5000
```

Do not use `Access-Control-Allow-Origin: *` for authenticated production APIs.
`FRONTEND_URL` accepts a comma-separated allowlist.

## Checks

```bash
cd frontend && npm run build
cd backend && npm run build
```

Public routes that must work with the backend stopped:

```text
/
/about
 /projects
 /projects/[slug]
 /experience
 /skills
 /gallery
 /contact
```

## Database and media safety

This split does not change the existing database:

- Database: `harsh_portfolio`
- GridFS bucket: `portfolioMedia`
- No reset, migration, seeding, re-upload or deletion is required
- Snapshot generation only reads MongoDB and GridFS
- Media mirroring copies bytes to the frontend; GridFS ids stay unchanged

Never commit `.env` files, database credentials, passwords, `AUTH_SECRET` or AI
keys.

## Author

**Harsh Raj**

Data Science / AI-ML
