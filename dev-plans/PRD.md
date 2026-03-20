# Product Requirements Document
# Budget Tracker — Google Sheets Chat Interface

**Version:** 1.3
**Date:** 2026-03-16
**Status:** In Progress

---

## 1. Overview

A web application that allows a team to log expenses via a chat-like interface. One designated **Owner** connects the app to their Google account and configures the target spreadsheet. The Owner then shares a link with any number of **Contributors** who can submit expenses directly — no Google account required on their end. All expenses are appended to the Owner's Google Sheets spreadsheet.

---

## 2. Problem Statement

Manually opening a spreadsheet to log small, frequent expenses (e.g., a coffee, a grocery run) creates friction and reduces consistency. A conversational input lowers that barrier — users type naturally and the app handles the data entry. Having a shared link means anyone in a household or small team can log expenses without needing access to the spreadsheet itself.

---

## 3. Goals

- Allow the Owner to connect their Google account and point the app at a specific spreadsheet.
- Generate a shareable link the Owner can send to Contributors.
- Allow Contributors to log expenses from the shared link with a minimal, focused UI.
- Persist every expense to the Owner's Google Sheets spreadsheet in real time.
- Keep the setup lightweight: no database beyond Google Sheets.

---

## 4. Non-Goals (v1)

- ~~AI/NLP parsing — expense format will follow a simple, defined pattern.~~ *(implemented via Telegram bot — see Section 12)*
- Editing or deleting past entries from the UI.
- Charts, dashboards, or analytics views.
- Mobile-native app.
- Contributor authentication (the link itself acts as access control in v1).

---

## 5. Users

### 5.1 Owner
- Has a Google account.
- Signs in with Google OAuth to grant the app write access to their spreadsheet.
- Completes a one-time setup (spreadsheet URL + sheet name).
- Gets a shareable Contributor link to distribute.
- Sees the full chat view with all submitted expenses.
- Can sign out and revoke access at any time.

### 5.2 Contributor
- Does **not** need a Google account.
- Accesses the app via the shareable link provided by the Owner.
- Sees only the expense input form — no spreadsheet details, no chat history.
- Submits expenses that are written to the Owner's spreadsheet.

---

## 6. User Stories

### Owner
| ID | As the Owner I want to... | So that... |
|----|---------------------------|------------|
| US-01 | Sign in with my Google account | The app can write to my spreadsheet |
| US-02 | Enter my spreadsheet URL and sheet name on a setup page | The app knows where to log expenses |
| US-03 | Get a shareable link after setup | I can send it to Contributors |
| US-04 | See all submitted expenses in the chat view | I have a running log of what was recorded |
| US-05 | Sign out | I can revoke access at any time |

### Contributor
| ID | As a Contributor I want to... | So that... |
|----|-------------------------------|------------|
| US-06 | Open the shared link without signing in | I can log expenses immediately |
| US-07 | Type an expense and submit it | It gets recorded in the spreadsheet without me needing access to it |
| US-08 | See a confirmation after submitting | I know the expense was saved successfully |

---

## 7. Functional Requirements

### 7.1 Owner Authentication
- FR-01: The app must support Google OAuth 2.0 sign-in via NextAuth.js.
- FR-02: After sign-in, the app stores the access/refresh token securely (server-side session).
- FR-03: The app must request the `https://www.googleapis.com/auth/spreadsheets` scope.
- FR-04: A "Sign out" button must be accessible to the Owner at all times.
- FR-05: Accessing the Owner pages without a valid session redirects to the sign-in page.

### 7.2 Owner Setup Page
- FR-06: After first sign-in, the Owner is directed to a setup page.
- FR-07: The setup page has two fields: **Spreadsheet URL** and **Sheet name** (defaults to `"Expenses"`).
- FR-08: The app validates the spreadsheet is accessible with the Owner's credentials before saving.
- FR-09: On success, the app stores the spreadsheet ID and sheet name in the Owner's session.
- FR-10: The setup page displays the generated **Contributor link** after successful configuration.
- FR-11: The Contributor link format is: `https://<domain>/contribute/<token>` where `<token>` is a short random string tied to the Owner's configuration.

### 7.3 Expense Input (Contributor form)
- FR-12: The expense form has four separate fields: **Description** (text), **Amount** (number), **Category** (dropdown), **Card** (dropdown).
- FR-13: All four fields are required. The app shows an inline error if any are missing.
- FR-14: Amount must be a valid positive number (min 0.01); currency is **R$**.
- FR-15: **Category** options: `Restaurante`, `Mercado`, `Streaming`, `Farmácia`, `Viagem`, `Outros`.
- FR-16: **Card** options: `Itau`, `Alelo`, `Caju`, `Conta Gero`, `Conta Yas`.
- FR-17: Submitting appends a new row to the connected spreadsheet with columns:
  `Date | Description | Amount | Category | Card | Contributor`
- FR-18: Date is auto-populated server-side.

### 7.4 Owner Chat View
- FR-18: Each submitted expense (by anyone) appears as a message bubble in the chat UI.
- FR-19: A success/error status indicator is shown per message after the write attempt.
- FR-20: The chat scrolls to the latest message after each submission.

### 7.5 Contributor View
- FR-21: The Contributor view is accessible at `/contribute/<token>` with no login required.
- FR-22: The Contributor view shows only: a brief header ("Log an Expense"), the expense input field, and a submit button.
- FR-23: No spreadsheet details, Owner identity, or chat history are visible to Contributors.
- FR-24: After a successful submission, the Contributor sees a confirmation message and the input clears.
- FR-25: If the token is invalid or the Owner has revoked access, the Contributor sees a friendly error page.

---

## 8. Non-Functional Requirements

- NFR-01: Page load under 2 seconds on a standard broadband connection.
- NFR-02: Expense write to Google Sheets under 3 seconds (P95).
- NFR-03: OAuth tokens must never be exposed to the client; all Sheets API calls go through a Next.js API route.
- NFR-04: The app must work on current versions of Chrome, Firefox, and Safari.
- NFR-05: The Contributor token must be unguessable (minimum 128 bits of entropy).

---

## 9. UX Sketches (Text)

### 9.1 Owner — Sign-in Page (`/`)
```
+--------------------------------------------------+
|  Budget Tracker                                  |
+--------------------------------------------------+
|                                                  |
|         Log expenses with your team.             |
|                                                  |
|         [ Sign in with Google ]                  |
|                                                  |
+--------------------------------------------------+
```

### 9.2 Owner — Setup Page (`/setup`)
```
+--------------------------------------------------+
|  Budget Tracker                     [Sign out]  |
+--------------------------------------------------+
|                                                  |
|  Step 1: Connect your spreadsheet               |
|                                                  |
|  Spreadsheet URL: [_________________________]   |
|  Sheet name:      [ Expenses              ]     |
|                                                  |
|  [ Connect ]                                    |
|                                                  |
|  -- After connecting: --                        |
|                                                  |
|  Contributor link:                              |
|  https://yourapp.com/contribute/abc123          |
|  [ Copy link ]                                  |
|                                                  |
+--------------------------------------------------+
```

### 9.3 Owner — Chat View (`/chat`)
```
+--------------------------------------------------+
|  Budget Tracker              [Sign out]          |
+--------------------------------------------------+
|  Connected to: My Budget 2026                    |
+--------------------------------------------------+
|                                                  |
|  you · 2026-03-12                                |
|  +---------------------------------------+       |
|  | Almoço                                |       |
|  | R$45.90                               |       |
|  | [Restaurante] [Itau]                  |       |
|  +---------------------------------------+       |
|                                                  |
|  ana · 2026-03-12                                |
|  +---------------------------------------+       |
|  | Uber                                  |       |
|  | R$12.00                               |       |
|  | [Viagem] [Conta Yas]                  |       |
|  +---------------------------------------+       |
|                                                  |
+--------------------------------------------------+
```

### 9.4 Contributor — Expense Form (`/contribute`)
```
+--------------------------------------------------+
|  Log an Expense                                  |
+--------------------------------------------------+
|                                                  |
|  Description                                    |
|  [ e.g. Almoço, Uber, Academia            ]     |
|                                                  |
|  Amount                                         |
|  [ R$ 0.00                                ]     |
|                                                  |
|  Category                                       |
|  [ Select a category ▾ ]                        |
|    Restaurante / Mercado / Streaming /           |
|    Farmácia / Viagem / Outros                   |
|                                                  |
|  Card                                           |
|  [ Select a card ▾ ]                            |
|    Itau / Alelo / Caju / Conta Gero /           |
|    Conta Yas                                    |
|                                                  |
|  [ Submit ]                                     |
|                                                  |
|  -- After submit: --                            |
|  ✅ Expense submitted!                          |
|  It has been added to the spreadsheet.          |
|  [ Submit another ]                             |
|                                                  |
+--------------------------------------------------+
```

---

## 10. Google Sheets Schema

| Column | A | B | C | D | E | F |
|--------|---|---|---|---|---|---|
| Header | Date | Description | Amount | Category | Card | Contributor |
| Example | 2026-03-12 | Almoço no Restaurante X | 45.90 | Restaurante | Itau | user@email.com |

---

## 11. Out of Scope

- Real-time sync / reading back rows from Sheets into the chat on load.
- Multiple spreadsheet support per Owner.
- Currency selection (assumes single currency, user-defined).
- Contributor identity / attribution (v1 does not track who submitted what).
- Revoking individual Contributor access without resetting the token.

---

## 12. Telegram Bot Integration *(added 2026-03-16)*

### 12.1 Overview

An AI-powered Telegram bot that allows the Owner (and authorized users) to log expenses and query the spreadsheet via text or voice messages — no UI required.

### 12.2 New API Route

`POST /api/telegram` — Telegram webhook receiver.

### 12.3 Functional Requirements

- **FR-T01:** The webhook accepts Telegram `Update` objects (text messages and voice notes).
- **FR-T02:** Only Telegram user IDs listed in `ALLOWED_TELEGRAM_IDS` (env var, comma-separated) are processed; all others are silently ignored.
- **FR-T03:** Only text messages are supported; voice is handled natively by Telegram before sending.
- **FR-T04:** Gemini (`gemini-1.5-flash`) classifies each message as `EXPENSE` or `QUERY`.
- **FR-T05:** For `EXPENSE` intent, Gemini extracts `description`, `amount`, `category`, and `card` from the message and appends the row to the spreadsheet (contributor field set to `"Telegram"`).
- **FR-T06:** For `QUERY` intent, all sheet rows are fetched and passed to Gemini, which answers the question in the same language (PT/EN) and replies to the chat.
- **FR-T07:** On success, the bot replies with a formatted confirmation. On error, it replies with the error message.
- **FR-T08:** The bot uses the Owner's refresh token (`OWNER_REFRESH_TOKEN`) to obtain a fresh access token for every request — no session required.

### 12.4 New Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `GEMINI_API_KEY` | For Gemini intent detection, parsing, and query answering |
| `ALLOWED_TELEGRAM_IDS` | Comma-separated list of authorized Telegram user IDs |
| `OWNER_REFRESH_TOKEN` | Owner's Google OAuth refresh token (for bot-initiated writes) |
| `OWNER_SPREADSHEET_ID` | Target spreadsheet ID |
| `OWNER_SHEET_NAME` | Target sheet name (default: `Expenses`) |

### 12.5 Dependencies Added

- `@google/generative-ai` — Gemini API client

---

## 13. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-12 | Initial draft |
| 1.1 | 2026-03-12 | Added UX sketches and Sheets schema |
| 1.2 | 2026-03-12 | Refined FR details; full app scaffolded |
| 1.3 | 2026-03-16 | Implemented Category & Card fields end-to-end; added Telegram bot with AI parsing (Section 12); localized currency to R$; added `.env.local.example` |
