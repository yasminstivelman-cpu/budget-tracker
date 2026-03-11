# Product Requirements Document
# Budget Tracker — Google Sheets Chat Interface

**Version:** 1.1
**Date:** 2026-03-08
**Status:** Draft

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

- AI/NLP parsing — expense format will follow a simple, defined pattern.
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

### 7.3 Expense Input (shared by Owner and Contributor)
- FR-12: A text input field accepts expense messages.
- FR-13: Expected message format: `<description>, <amount>, <category>, <card>`
  Example: `Coffee at Blue Bottle, 5.50, Food, Visa`
- FR-14: All four fields are required. The app shows an inline error if any are missing.
- FR-15: Amount must be a valid positive number; the app shows an inline error if not.
- FR-16: Submitting appends a new row to the connected spreadsheet with columns:
  `Date | Description | Amount | Category | Card`
- FR-17: Date is auto-populated server-side (ISO 8601, UTC).

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
|  +-----------------------------------------+    |
|  | You: Coffee, 5.50, Food, Visa           |    |
|  | Logged: 2026-03-08 | $5.50 | Food [OK] |    |
|  +-----------------------------------------+    |
|                                                  |
|  +-----------------------------------------+    |
|  | Ana: Uber, 12.00, Transport, Amex       |    |
|  | Logged: 2026-03-08 | $12 | Transport   |    |
|  +-----------------------------------------+    |
|                                                  |
+--------------------------------------------------+
|  [ description, amount, category, card   Send ] |
+--------------------------------------------------+
```

### 9.4 Contributor — Expense Form (`/contribute/<token>`)
```
+--------------------------------------------------+
|  Log an Expense                                  |
+--------------------------------------------------+
|                                                  |
|  Type your expense:                             |
|  [ description, amount, category, card    ]     |
|                                                  |
|  Example: Coffee, 5.50, Food, Visa              |
|                                                  |
|  [ Submit ]                                     |
|                                                  |
|  -- After submit: --                            |
|  Expense logged successfully!                   |
|                                                  |
+--------------------------------------------------+
```

---

## 10. Google Sheets Schema

| Column | A | B | C | D | E |
|--------|---|---|---|---|---|
| Header | Date | Description | Amount | Category | Card |
| Example | 2026-03-08 | Coffee at Blue Bottle | 5.50 | Food | Visa |

---

## 11. Out of Scope

- Real-time sync / reading back rows from Sheets into the chat on load.
- Multiple spreadsheet support per Owner.
- Currency selection (assumes single currency, user-defined).
- Contributor identity / attribution (v1 does not track who submitted what).
- Revoking individual Contributor access without resetting the token.
