# Architecture Document
# Budget Tracker — Google Sheets Chat Interface

**Version:** 1.2
**Date:** 2026-03-08

---

## 1. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Auth | NextAuth.js (Auth.js v5) | 5.x |
| Google API client | googleapis (Node.js) | 144.x |
| Styling | Tailwind CSS | 3.x |
| Package manager | npm | — |
| Node.js | Node.js | 20 LTS |

No database. State lives in:
- **Server:** NextAuth.js encrypted JWT session (stores Google OAuth tokens + spreadsheet config).
- **Server:** `CONTRIBUTOR_TOKEN` env var — a single random token that authorizes the Contributor route.
- **Client:** React `useState` (in-memory chat messages for the current session).

---

## 2. Frontend vs Backend Boundary

This project uses a **single Next.js application** that handles both frontend and backend concerns — the standard pattern for Next.js.

| Concern | Where it lives | Rule |
|---------|---------------|------|
| UI pages and components | `app/` pages + `components/` | Client or Server Components; no secrets |
| Backend API logic | `app/api/` route handlers | Server-only; TypeScript; no client imports |
| Backend utilities | `lib/server/` | Server-only; never imported by client components |
| Shared utilities | `lib/` root | No Node.js/server-only APIs; safe for both sides |
| Shared types | `types/` | Pure TypeScript types; importable anywhere |

**Rule:** Anything in `lib/server/` or `app/api/` must never be imported by a client component (`"use client"`). OAuth tokens and secrets only ever exist inside these server-side boundaries.

---

## 3. Folder Structure

```
hello-world/
├── app/                                    # Next.js App Router
│   ├── layout.tsx                          # Root layout — SessionProvider wrapper
│   ├── page.tsx                            # Home: redirect to /chat if authed, else /login
│   ├── login/
│   │   └── page.tsx                        # Owner sign-in page (Google button)
│   ├── setup/
│   │   └── page.tsx                        # Owner setup: spreadsheet URL + sheet name + contributor link
│   ├── chat/
│   │   └── page.tsx                        # Owner chat view (protected, Google session required)
│   ├── contribute/
│   │   └── [token]/
│   │       └── page.tsx                    # Contributor expense form (no auth, token-gated)
│   └── api/                                # ── BACKEND: API Route Handlers (TypeScript) ──
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts                # NextAuth route handler
│       ├── setup/
│       │   └── route.ts                    # POST — validate & save spreadsheet config to session
│       └── expense/
│           └── route.ts                    # POST — parse message, write row to Sheets
│
├── components/                             # ── FRONTEND: Reusable UI Components ──
│   ├── ChatWindow.tsx                      # Owner: scrollable list of message bubbles
│   ├── MessageBubble.tsx                   # Owner: single expense entry + status
│   ├── ExpenseInput.tsx                    # Shared: controlled input + Send button
│   └── ContributorForm.tsx                 # Contributor: minimal form wrapper with confirmation state
│
├── lib/
│   ├── server/                             # ── BACKEND ONLY — never import in client components ──
│   │   ├── auth.ts                         # NextAuth config (Google provider, JWT callbacks)
│   │   ├── sheets.ts                       # Wrapper around googleapis Sheets client
│   │   └── token.ts                        # Validate contributor token
│   └── parseExpense.ts                     # Shared: parse "desc, amount, category, card" → typed object
│
├── types/
│   └── index.ts                            # ParsedExpense, ChatMessage, SessionData types
│
├── middleware.ts                           # Route protection: redirects unauthenticated Owner requests
├── .env.local                              # Secrets (never committed)
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. User Roles & Route Access

| Route | Who can access | Auth mechanism |
|-------|---------------|----------------|
| `/` | Anyone | Redirects based on session |
| `/login` | Unauthenticated Owner | Public |
| `/setup` | Authenticated Owner | NextAuth session (enforced by middleware) |
| `/chat` | Authenticated Owner | NextAuth session (enforced by middleware) |
| `/contribute/[token]` | Anyone with the link | Token in URL path |
| `/api/auth/**` | NextAuth internals | — |
| `/api/setup` | Authenticated Owner | NextAuth session |
| `/api/expense` | Owner (session) or Contributor (token in body) | Dual-path check |

---

## 5. Data Flow

### 5.1 Owner submits an expense

```
Owner Browser              Next.js Server                  Google APIs
  |                              |                               |
  |-- POST /api/expense -------->|                               |
  |   { message, token: null }   | (reads spreadsheetId          |
  |                              |  from Owner's JWT session)    |
  |                              |-- googleapis.sheets.append -->|
  |                              |<-- 200 OK --------------------|
  |<-- { row } -----------------|                               |
```

### 5.2 Contributor submits an expense

```
Contributor Browser        Next.js Server                  Google APIs
  |                              |                               |
  |-- POST /api/expense -------->|                               |
  |   { message,                 | (validates token,             |
  |     token: "abc123" }        |  reads Owner's spreadsheetId  |
  |                              |  from server config)          |
  |                              |-- googleapis.sheets.append -->|
  |                              |<-- 200 OK --------------------|
  |<-- { row } -----------------|                               |
```

### 5.3 Owner Authentication Flow

1. Owner clicks "Sign in with Google" → NextAuth redirects to Google consent screen.
2. Google returns auth code → NextAuth exchanges it for `access_token` + `refresh_token`.
3. Tokens stored in **encrypted server-side JWT** cookie — never sent to the browser in plain text.
4. Owner completes `/setup` → spreadsheet ID and sheet name are saved into the JWT session.
5. All Sheets API calls happen server-side inside `/api/expense`, pulling tokens from the session.
6. NextAuth handles token refresh automatically via the `jwt` callback.

### 5.4 Contributor Token Flow

1. Owner completes setup → app displays `https://<domain>/contribute/<CONTRIBUTOR_TOKEN>`.
2. Owner copies and shares that link manually (Slack, WhatsApp, email, etc.).
3. Contributor opens the link — no login prompt.
4. Contributor submits an expense → `POST /api/expense` with `{ message, token }`.
5. Server validates `token === process.env.CONTRIBUTOR_TOKEN`.
6. Server reads the Owner's spreadsheet config from `process.env` (set once at deploy time).
7. Server uses the Owner's stored `accessToken` (from a server-side config) to write the row.

> **Note on token storage (v1 simplification):** Because there is no database, the Owner's `accessToken` for Contributor writes is stored in environment variables at deploy time (or in a server-side file). A production v2 would use a KV store or database to map the contributor token to the Owner's refreshable credentials.

---

## 6. API Routes

### `POST /api/setup`

Called by the Owner after sign-in to save spreadsheet configuration.

**Request body:**
```json
{
  "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA.../edit",
  "sheetName": "Expenses"
}
```

**Success response `200`:**
```json
{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  "contributorLink": "http://localhost:3000/contribute/abc123xyz"
}
```

**Error responses:**
- `400` — URL could not be parsed or spreadsheet not found.
- `401` — Owner not authenticated.
- `403` — Spreadsheet not accessible with the Owner's credentials.

---

### `POST /api/expense`

Accepts submissions from both Owner (session-authenticated) and Contributor (token-authenticated).

**Request body — Owner:**
```json
{
  "message": "Coffee at Blue Bottle, 5.50, Food, Visa"
}
```

**Request body — Contributor:**
```json
{
  "message": "Uber, 12.00, Transport, Amex",
  "token": "abc123xyz"
}
```

**Success response `200`:**
```json
{
  "row": {
    "date": "2026-03-08",
    "description": "Coffee at Blue Bottle",
    "amount": 5.50,
    "category": "Food",
    "card": "Visa"
  }
}
```

**Error responses:**
- `400` — message could not be parsed, missing fields, or amount is not a number.
- `401` — neither a valid session nor a valid contributor token.
- `403` — spreadsheet not accessible.
- `500` — Google API error.

---

## 7. Google Sheets Schema

The app expects a sheet with the name configured during setup (default: **"Expenses"**) and this header row:

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Description | Amount | Category | Card |

Rows are appended starting at row 2. The app uses `values.append` with `valueInputOption: USER_ENTERED`.

---

## 8. Environment Variables

```
# .env.local

# NextAuth
AUTH_SECRET=<random 32-byte hex string>
AUTH_URL=http://localhost:3000

# Google OAuth (from Google Cloud Console)
AUTH_GOOGLE_ID=<your-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your-client-secret>

# Contributor access token (generated once by the Owner)
CONTRIBUTOR_TOKEN=<random 32-byte hex string>

# Owner's spreadsheet config (set after Owner completes setup)
OWNER_SPREADSHEET_ID=<spreadsheet-id>
OWNER_SHEET_NAME=Expenses
```

---

## 9. Step-by-Step: Create the Project from Scratch

### Step 1 — Prerequisites

```bash
node -v   # must be >= 20.0.0
npm -v    # must be >= 10.0.0
```

### Step 2 — Scaffold Next.js Project

```bash
npx create-next-app@14 hello-world \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd hello-world
```

### Step 3 — Install Dependencies

```bash
# Auth
npm install next-auth@beta

# Google APIs
npm install googleapis

# Input validation
npm install zod
```

### Step 4 — Google Cloud Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create a new project (e.g., `budget-tracker`).
3. Enable the **Google Sheets API**: APIs & Services → Library → search "Google Sheets API" → Enable.
4. Create OAuth credentials: APIs & Services → Credentials → Create Credentials → OAuth Client ID.
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**.

### Step 5 — Configure Environment Variables

```bash
touch .env.local
```

Add to `.env.local`:
```
AUTH_SECRET=             # openssl rand -hex 32
AUTH_URL=http://localhost:3000
AUTH_GOOGLE_ID=          # from Google Cloud Console
AUTH_GOOGLE_SECRET=      # from Google Cloud Console
CONTRIBUTOR_TOKEN=       # openssl rand -hex 32
OWNER_SPREADSHEET_ID=    # fill in after Owner completes setup
OWNER_SHEET_NAME=Expenses
```

### Step 6 — Wire Up NextAuth

Create `lib/server/auth.ts`:
```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/spreadsheets",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
```

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/server/auth";
export const { GET, POST } = handlers;
```

### Step 7 — Add Middleware for Route Protection

Create `middleware.ts` (project root):
```typescript
import { auth } from "@/lib/server/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const protectedPaths = ["/setup", "/chat"];
  const isProtected = protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/setup", "/chat"],
};
```

### Step 8 — Create the Token Validator

Create `lib/server/token.ts`:
```typescript
export function isValidContributorToken(token: string | undefined): boolean {
  if (!token || !process.env.CONTRIBUTOR_TOKEN) return false;
  return token === process.env.CONTRIBUTOR_TOKEN;
}
```

### Step 9 — Create the Sheets Helper

Create `lib/server/sheets.ts`:
```typescript
import { google } from "googleapis";

export function getSheetsClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth });
}

export async function appendExpenseRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  row: [string, string, number, string, string]  // date, desc, amount, category, card
) {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}
```

### Step 10 — Create the Expense Parser (Shared)

Create `lib/parseExpense.ts`:
```typescript
export type ParsedExpense = {
  description: string;
  amount: number;
  category: string;
  card: string;
};

export function parseExpense(message: string): ParsedExpense {
  const parts = message.split(",").map((p) => p.trim());
  if (parts.length < 4) {
    throw new Error("Format: description, amount, category, card");
  }

  const [description, rawAmount, category, card] = parts;
  const amount = parseFloat(rawAmount);
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  return { description, amount, category, card };
}
```

### Step 11 — Create the Setup API Route

Create `app/api/setup/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import { z } from "zod";
import { getSheetsClient } from "@/lib/server/sheets";

const schema = z.object({
  spreadsheetUrl: z.string().url(),
  sheetName: z.string().min(1).default("Expenses"),
});

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = schema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const spreadsheetId = extractSpreadsheetId(result.data.spreadsheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json({ error: "Could not parse spreadsheet ID from URL" }, { status: 400 });
  }

  try {
    const sheets = getSheetsClient(session.accessToken);
    await sheets.spreadsheets.get({ spreadsheetId });
  } catch {
    return NextResponse.json({ error: "Spreadsheet not accessible" }, { status: 403 });
  }

  const contributorLink = `${process.env.AUTH_URL}/contribute/${process.env.CONTRIBUTOR_TOKEN}`;

  return NextResponse.json({ spreadsheetId, contributorLink });
}
```

### Step 12 — Create the Expense API Route

Create `app/api/expense/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import { isValidContributorToken } from "@/lib/server/token";
import { parseExpense } from "@/lib/parseExpense";
import { appendExpenseRow } from "@/lib/server/sheets";
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1).max(500),
  token: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const result = schema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { message, token } = result.data;

  const session = await auth();
  const isOwner = !!session?.accessToken;
  const isContributor = !isOwner && isValidContributorToken(token);

  if (!isOwner && !isContributor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spreadsheetId = isOwner
    ? (session as any).spreadsheetId ?? process.env.OWNER_SPREADSHEET_ID!
    : process.env.OWNER_SPREADSHEET_ID!;
  const sheetName = process.env.OWNER_SHEET_NAME ?? "Expenses";
  const accessToken = session?.accessToken ?? process.env.OWNER_ACCESS_TOKEN!;

  let parsed;
  try {
    parsed = parseExpense(message);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const date = new Date().toISOString().split("T")[0];

  try {
    await appendExpenseRow(accessToken, spreadsheetId, sheetName, [
      date,
      parsed.description,
      parsed.amount,
      parsed.category,
      parsed.card,
    ]);
  } catch {
    return NextResponse.json({ error: "Failed to write to spreadsheet" }, { status: 500 });
  }

  return NextResponse.json({ row: { date, ...parsed } });
}
```

### Step 13 — Build the Pages

**`app/login/page.tsx`** — Public. Shows a "Sign in with Google" button using NextAuth's `signIn()`.

**`app/setup/page.tsx`** — Protected by middleware. Form with two fields: Spreadsheet URL and Sheet name. On submit, calls `POST /api/setup`. On success, displays the Contributor link with a copy button.

**`app/chat/page.tsx`** — Protected by middleware. Client component. Renders `<ChatWindow />` + `<ExpenseInput />`. Calls `POST /api/expense` without a token.

**`app/contribute/[token]/page.tsx`** — Public. Client component. Renders `<ContributorForm />`. Passes the `token` param to `POST /api/expense`. Shows a success confirmation after submit.

### Step 14 — Run Locally

```bash
npm run dev
# App available at http://localhost:3000
```

Owner flow:
1. Visit `http://localhost:3000` → redirected to `/login`
2. Sign in with Google → redirected to `/setup`
3. Paste spreadsheet URL → copy the Contributor link
4. Start logging expenses at `/chat`

Contributor flow:
1. Open the shared link `/contribute/<token>`
2. Type an expense and submit

---

## 10. Security Checklist

- [ ] `AUTH_SECRET` and `CONTRIBUTOR_TOKEN` are random 32-byte values, never committed to git.
- [ ] `.env.local` is in `.gitignore` (Next.js default).
- [ ] Google OAuth tokens live only in the server-side JWT cookie (`httpOnly`, `secure` in production).
- [ ] All Sheets API calls go through `/api/expense` (server) — `accessToken` never reaches the browser.
- [ ] `isValidContributorToken` uses strict equality; the token has >= 128 bits of entropy.
- [ ] Contributor view exposes zero Owner details (no spreadsheet ID, no email, no token value in the HTML).
- [ ] Input is validated with zod before any parsing or API call.
- [ ] `lib/server/` modules are never imported by `"use client"` components.
- [ ] Route protection is handled centrally in `middleware.ts`, not per-page.

---

## 11. Deployment Notes (post-v1)

- Deploy to **Vercel** (zero-config for Next.js).
- Set all env vars in Vercel project settings (not committed to git).
- Update `AUTH_URL` to the production domain.
- Add the production redirect URI to the Google Cloud OAuth client.
- After first Owner login on production, update `OWNER_SPREADSHEET_ID` and `OWNER_ACCESS_TOKEN` in Vercel env and redeploy (v1 limitation — no live DB).
