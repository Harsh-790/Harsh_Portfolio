# Harsh Portfolio

A modern **Portfolio website** built with Next.js, TypeScript, Tailwind CSS, Prisma and MongoDB Atlas.

## Features

- Secure admin dashboard
- Manage projects, experience, skills, gallery and social links
- MongoDB Atlas database
- MongoDB GridFS media storage
- Light, Dark and Colour themes
- **Gullu** portfolio AI assistant
- English, Hindi and Hinglish support
- Optional voice interaction
- Contact form with MongoDB storage
- SEO metadata and responsive design

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 6
- MongoDB Atlas
- MongoDB GridFS
- bcrypt authentication

## Local Setup

```bash
git clone https://github.com/Harsh-790/Harsh_Portfolio.git
cd Harsh_Portfolio
npm install
```

Create `.env` from `.env.example` and configure:

```env
DATABASE_URL="your-mongodb-url"
AUTH_SECRET="your-secret"
ADMIN_EMAIL="your-admin-email"
ADMIN_PASSWORD="your-admin-password"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

Then run:

```bash
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

Open:

```text
http://localhost:3000
```

## Admin

Admin panel:

```text
/admin/login
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are used for **initial admin creation only**. Changing them later does not automatically change an existing MongoDB user.

## Media

Uploaded images, videos and PDFs are stored in **MongoDB Atlas GridFS** using the `portfolioMedia` bucket.

No persistent server storage is required.

##  Deployment

The application can be deployed on Render or other Node.js hosting platforms.

### Render Build

```bash
npm install && npx prisma generate && npm run build
```

### Render Start

```bash
npm run start
```

Required production environment variables:

```text
DATABASE_URL
AUTH_SECRET
ADMIN_EMAIL
ADMIN_PASSWORD
NEXT_PUBLIC_SITE_URL
```

##  Security

Never commit `.env`, database credentials, passwords, API keys or `AUTH_SECRET` to GitHub.

## 👤 Author

**Harsh Raj**

Data Science / AI-ML Enthusiast
