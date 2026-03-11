# Budget Tracker — Google Sheets Chat Interface

A Next.js app that lets an **Owner** log expenses into a Google Sheet via a chat interface, and share a contributor link so teammates can submit expenses without needing a Google account.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 20 LTS |
| npm | >= 10 |

> Node.js is managed via **nvm**. After cloning, run:
> ```bash
> nvm install 20
> nvm use 20
> ```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Google Cloud setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project.
2. Enable the **Google Sheets API**: APIs & Services → Library → "Google Sheets API" → Enable.
3. Create OAuth credentials: APIs & Services → Credentials → Create Credentials → OAuth Client ID.
   - Application type: **Web application**
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy the **Client ID** and **Client Secret**.

### 3. Configure environment variables

Edit `.env.local` (already created — never committed to git):

```env
AUTH_SECRET=             # openssl rand -hex 32
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=          # from Google Cloud Console
AUTH_GOOGLE_SECRET=      # from Google Cloud Console
CONTRIBUTOR_TOKEN=       # openssl rand -hex 32
OWNER_SPREADSHEET_ID=    # fill in after completing /setup
OWNER_SHEET_NAME=Expenses
```

Generate secrets:

```bash
openssl rand -hex 32   # run twice: once for AUTH_SECRET, once for CONTRIBUTOR_TOKEN
```

### 4. Prepare your Google Sheet

Create a Google Sheet with a tab named **Expenses** (or your chosen sheet name) with this header row:

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Description | Amount | Category | Card |

---

## Running locally

```bash
npm run dev
```

App is available at [http://localhost:3000](http://localhost:3000).

---

## User flows

### Owner

1. Visit `http://localhost:3000` → redirected to `/login`
2. Click **Sign in with Google** → Google OAuth consent screen
3. After sign-in → redirected to `/setup`
4. Paste your Google Sheet URL and sheet name → submit
5. Copy the **Contributor link** shown on screen
6. Start logging expenses at `/chat` using the format:
   ```
   Coffee at Blue Bottle, 5.50, Food, Visa
   ```

### Contributor

1. Open the shared link `/contribute/<token>`
2. Type an expense in the same format and submit — no login required

---

## Project structure

```
hello-world/
├── app/                        # Next.js App Router pages + API routes
│   ├── layout.tsx
│   ├── page.tsx                # Root redirect
│   ├── login/page.tsx          # Google sign-in
│   ├── setup/page.tsx          # Spreadsheet configuration
│   ├── chat/page.tsx           # Owner expense chat
│   ├── contribute/[token]/     # Contributor form (token-gated)
│   └── api/                   # Backend route handlers
│       ├── auth/[...nextauth]/
│       ├── setup/
│       └── expense/
├── components/                 # Reusable UI components
├── lib/
│   ├── server/                 # Server-only: auth, sheets, token validation
│   └── parseExpense.ts         # Shared expense parser
├── types/index.ts              # Shared TypeScript types
├── middleware.ts               # Route protection
└── .env.local                  # Secrets (never committed)
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Auth | NextAuth.js v5 (beta) |
| Google API | googleapis |
| Validation | zod |
| Styling | Tailwind CSS 3 |
| Runtime | Node.js 20 LTS |

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add all env vars from `.env.local` in Vercel project settings.
4. Update `AUTH_URL` to your production domain.
5. Add the production redirect URI to your Google OAuth client:
   `https://<your-domain>/api/auth/callback/google`
6. After first Owner login on production, set `OWNER_SPREADSHEET_ID` in Vercel and redeploy.
