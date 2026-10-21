# Data Science Portfolio — Next.js + MongoDB with a built-in admin panel

An editorial, content-driven portfolio for a data scientist / ML engineer. Everything a visitor
reads — headings, paragraphs, buttons, projects, experience, skills, gallery, social links, footer,
metadata — is stored in MongoDB and edited from `/admin`. No text is hardcoded in the components.

- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6 · MongoDB Atlas
- **Themes:** light, dark and colour (deep terracotta) modes, remembered per visitor
- **Admin:** authentication, CRUD + reorder + publish for every content type, media library, inbox
- **Gullu:** a floating portfolio assistant that answers from the site's own content, in English, Hindi or Hinglish, with optional browser-native voice
- **Content:** 9 sample projects, 5 roles, 30 skills, 13 gallery items — realistic placeholders, no lorem ipsum

---

## 1. Quick start

```bash
npm install                 # install dependencies
cp .env.example .env        # Windows: copy .env.example .env
#   → then edit .env: set DATABASE_URL (MongoDB Atlas), ADMIN_PASSWORD and a long random AUTH_SECRET
npm run setup               # prisma generate + db push + seed demo content
npm run dev                 # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

Requirements: Node.js 20+, npm and a MongoDB Atlas connection string. The demo images are
generated locally (no network access needed at build time).

### Admin access

| Field    | Value                                                                 |
| -------- | --------------------------------------------------------------------- |
| URL      | `/admin/login`                                                         |
| Email    | The stored MongoDB `User.email` (`admin@portfolio.local`)              |
| Password | The bcrypt hash stored on that `User` record                           |

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are **seed-time only**. `db:seed` creates the first admin only
when the `User` collection is empty, and it never overwrites an existing admin's email or password.
Changing either variable later does not change an existing login.

Change the password after signing in from **Settings → Change password**; it is hashed with bcrypt
and stored in MongoDB, and the current password is required. There is no self-service "forgot
password" flow. If the current password is lost, a deliberate server-side reset is required.

The session cookie is signed with `AUTH_SECRET` and is `httpOnly`. Nothing secret is shipped to the
browser, and every admin page and server action re-checks the session.

Admin routes are also gated by `middleware.ts`, which verifies the cookie signature before any
page renders. That second gate exists because Next renders a route's page and layout in parallel:
without it, an unauthenticated request would still ship the rendered dashboard (including message
bodies) in the body of the redirect. The middleware short-circuits before anything is rendered, so
`/admin/…` returns a plain `307` to `/admin/login`. If `AUTH_SECRET` is missing the middleware
fails open and the per-page `requireAdmin()` checks take over — a misconfiguration should never
lock you out of your own panel.

## 2. Commands

| Command            | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `npm run dev`      | Development server with hot reload                                  |
| `npm run build`    | `prisma generate` + production build                                 |
| `npm run start`    | Serve the production build                                           |
| `npm run setup`    | First-time setup: generate client, push schema, seed content         |
| `npm run db:push`  | Apply `database/schema.prisma` to MongoDB (indexes; collections are created automatically) |
| `npm run db:seed`  | Restore missing demo content in place — non-destructive: existing records are updated, never deleted; then check that every `/uploads/seed/…` path in `content.json` exists |
| `npm run db:reset` | **Destructive:** drop the database, recreate it and seed — do not run against live data |
| `npm run assets`   | Regenerate the placeholder SVG figures and `resume.pdf`              |

## 3. Editing content

All public text lives in the database and is read on every request — edits appear immediately, no
rebuild and no redeploy.

| Admin page              | Controls                                                                          |
| ----------------------- | --------------------------------------------------------------------------------- |
| `/admin`                | Dashboard: counts, recent messages, quick actions                                  |
| `/admin/homepage`       | Every homepage heading/paragraph/button (including the About-preview secondary image), plus each section page's intro line |
| `/admin/about`          | Name, role, biography, approach steps, education, portrait, résumé PDF              |
| `/admin/projects`       | Case studies: summary, six narrative blocks, metrics, tech, screenshots, links      |
| `/admin/experience`     | Roles, dates, highlights, reorder                                                   |
| `/admin/skills`         | Skills grouped by category (tags — deliberately no percentage bars)                 |
| `/admin/gallery`        | Photos and videos, categories, featured flag, lightbox/player content               |
| `/admin/social`         | GitHub, LinkedIn, Instagram, X, YouTube, LeetCode, HackerRank, email, website … — an empty URL hides the link everywhere |
| `/admin/messages`       | Contact-form submissions (stored in MongoDB), read/unread, delete                   |
| `/admin/media`          | Upload, preview, copy URL, delete; reuse library                                            |
| `/admin/theme`          | Default mode (light/dark/colour) and the colour-mode accent                          |
| `/admin/settings`       | SEO metadata, footer text, the Gullu assistant, reset-to-defaults, password change   |

Rows have buttons for **edit · publish/unpublish · feature · move up/down · duplicate (projects) ·
delete**. Ordering in the admin list is the order used on the public site; skill reordering is
scoped to its category. Newly created items start as **drafts** — nothing goes live until you switch
on *Published*, so a half-written case study can't appear on the public site by accident.

### Media

Uploads are stored in MongoDB Atlas GridFS, in the dedicated `portfolioMedia` bucket, and served by
`/api/media/<gridfs-object-id>`. The route streams files directly from GridFS, returns the stored
`Content-Type` and `Content-Length`, and supports range requests so PDFs and `<video>` elements can
seek. New files are available immediately, without a server restart, and every form picks from the
same library. JPG, PNG, WEBP, AVIF, GIF, SVG, MP4, WEBM, MOV and PDF are accepted up to 24 MB.

The sample assets in `public/uploads/seed/` are static bundled files, not uploaded copies. They are
listed in the library as read-only and are kept in `public/` so a fresh install still has a complete
demo site. The admin library only deletes GridFS files that are no longer referenced by a profile,
project, gallery item or setting; replacing a reference cleans up the old GridFS file after the
database update succeeds.

Video gallery items take a YouTube or Vimeo URL, or a local uploaded video. An embed URL is not an
image, so those cards render a play-button placeholder panel instead of a broken `<img>` (a GridFS
video is shown as a muted `<video>` preview). The same rule applies inside the admin: a media picker
previews images inline and shows a small labelled tile (`PDF`, `VIDEO`) for anything else, so a PDF
résumé never renders as a broken image. `npm run db:seed` verifies that every static
`/uploads/seed/…` path referenced by `content.json` exists and prints a warning for anything missing
— a broken image should never ship silently.

## 4. Themes

Three modes are built into the design system (`app/globals.css`, tokens on `data-theme`):

- **light** — paper white, near-black ink
- **dark** — near-black background, warm off-white ink
- **colour** - warm sand background with a deep terracotta accent (`#6F2D18` by default) used for labels and highlights

The visitor's choice is saved in `localStorage` and applied by a tiny inline script before the first
paint, so reloading never flashes the wrong theme. `/admin/theme` sets which mode visitors land on
and the accent hex used in colour mode. Transitions are skipped automatically for
`prefers-reduced-motion` visitors.

The display type scale is `.type-1 … .type-4`, paired with `.display` (see `app/globals.css`). These
are named `type-N` rather than `h-N` on purpose: `h-1 … h-4` are Tailwind **height** utilities
(0.25–1rem), so using them as heading sizes collapsed every heading box and made the text overlap
the element below it. `h-1 … h-4` remain in use for icon sizes and 4px accent dots — do not rename
those.

## 5. Gullu — the portfolio assistant

The floating button in the bottom-right corner opens Gullu, a compact chat panel that answers
questions about Harsh: projects, skills, experience, education, gallery, résumé, links and how to
get in touch.

- **Knowledge = the site itself.** Every answer is composed on the server from the same public data
  the pages render (published projects, published experience and skills, the profile, visible social
  links, gallery metadata and the editable site copy). Edit a project in `/admin` and the next
  question already answers from the new text — there is no second copy to maintain.
- **No invention.** If something is not in the portfolio (say, a project that is not listed), Gullu
  says so instead of guessing. The assistant never reads the message inbox, users, credentials or
  environment variables, and it refuses questions about them.
- **Languages.** Questions in English, Hindi (Devanagari) and Hinglish (Roman) are detected
  automatically and answered in the same language.
- **Voice (optional).** Where the browser supports it, Gullu can listen through the microphone
  (`EN` / `HI` input toggle) and read answers aloud with the device's own speech voices. No
  autoplay: a spoken question gets a spoken answer, typed questions get a *Speak* button, and
  *Mute*, *Stop speaking* and closing the panel stop the voice immediately. English prefers an
  `en-IN` voice when the device provides one; if there is no Hindi voice on the device, Gullu says
  so rather than mispronouncing the text. Voice can be switched off entirely from `/admin/settings`.
- **Optional AI provider.** The built-in answers need no key and no network. Set `GULLU_API_KEY`
  (plus the optional `GULLU_API_URL` and `GULLU_MODEL`) to have answers rephrased by an external
  model: the key stays server-side, only the same public digest is sent, and any provider error
  silently falls back to the built-in answer. Do not claim the assistant is local-only if you
  enable this.
- **Controls.** `/admin/settings` → *Gullu — portfolio assistant*: show or hide Gullu, edit the
  greeting and the short description, and enable or hide the voice controls.

## 6. Project structure

```
middleware.ts          verifies the admin session before any admin page renders
app/
  (site)/              public pages — home, about, projects, experience, skills, gallery, contact
  admin/               login + the guarded panel (one page per content type)
  api/media/           upload / list / delete endpoint (session-guarded, GridFS-backed)
  api/media/[id]/      streams a GridFS file with Content-Length and range support
  api/gullu/           portfolio assistant answers (public, rate-limited)
  globals.css          design tokens + component classes
components/            site components (including the Gullu panel and brand icons), and components/admin/* for the panel
lib/                   db client, auth, GridFS storage, content queries, settings schema, the Gullu answer engine, helpers
database/              schema.prisma · seed.mjs · content.json · make-assets.mjs
public/uploads/seed/   static bundled sample images and the placeholder résumé PDF
```

To change the copy shipped with a fresh install, edit `database/content.json` and
`lib/default-settings.json`, then run `npm run db:seed`.

Two conventions in `content.json` are easy to get wrong:

- **JSON-array columns are stored as JSON *strings*** (`"technologies": "[\"Python\",…]"`), not as
  JSON arrays. `seed.mjs` therefore stores them verbatim — `JSON.stringify` is applied only to
  values that are not already strings. Double-encoding a column makes `jsonArray()` in
  `lib/types.ts` parse a string instead of an array, and it silently falls back to `[]`, which
  empties every project's technologies, metrics and gallery on the site.
- **`achievements` is plain newline-separated text**, not JSON — it is split by `lines()`.

## 7. Contact form

Submissions are validated, stored in the `Message` table and listed in `/admin/messages`. No email
is sent — if you want real delivery, add a provider (Resend, Postmark, SES…) in
`app/actions/contact.ts`; the storage step can stay as a backup.

## 8. Deploying

**Any Node host (Railway, Fly.io, Render, a VPS):** set `DATABASE_URL` (MongoDB Atlas), `AUTH_SECRET`
and `NEXT_PUBLIC_SITE_URL` in the environment. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` only for the
initial seed — they create the first admin when the `User` collection is empty. Run
`npx prisma generate && npm run db:seed` once, then `npm run build && npm run start`. Uploaded media
lives in MongoDB Atlas GridFS, so no persistent disk or writable volume is required. The database and
the uploaded files both survive redeploys.

**Vercel:** the App Router build works as-is with MongoDB Atlas. Uploads are written to GridFS through
the authenticated `/api/media` route, so serverless filesystems are not used for persistent media.
Everything else — pages, server actions, auth — is portable.

## 9. Notes

- Pages are rendered per request so admin edits are visible instantly (`force-dynamic`).
- Accessible by default: skip link, focus states, `aria` labels on icon buttons, keyboard-navigable
  lightbox and filters, reduced-motion support.
- SEO: metadata per page, Open Graph/Twitter cards, `sitemap.xml` and `robots.txt` generated from
  the database.
- The placeholder figures are generated SVG "plates" (`npm run assets`) and the résumé is a real
  one-page PDF built by the same script — replace both from the admin panel.
