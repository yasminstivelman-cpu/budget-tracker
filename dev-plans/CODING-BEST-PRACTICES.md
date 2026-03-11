# Coding Best Practices
# Budget Tracker — Google Sheets Chat Interface

**Version:** 1.0
**Date:** 2026-03-08

---

## 1. TypeScript

### Use strict mode
`tsconfig.json` must have:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Define types centrally
All shared types live in `types/index.ts`. Do not scatter inline type definitions across components.

```typescript
// types/index.ts
export type ParsedExpense = {
  description: string;
  amount: number;
  category: string;
};

export type ChatMessage = {
  id: string;                     // crypto.randomUUID()
  raw: string;                    // original user input
  status: "pending" | "ok" | "error";
  row?: ParsedExpense & { date: string };
  error?: string;
};
```

### Avoid `any`
Use `unknown` when the type is truly unknown, then narrow it with type guards or `instanceof`.

```typescript
// BAD
} catch (e: any) {
  console.error(e.message);
}

// GOOD
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : "Unknown error";
  console.error(msg);
}
```

---

## 2. Next.js App Router Conventions

### Server vs. Client components
- Default to **Server Components**. Only add `"use client"` when you need browser APIs, event handlers, or React state/effects.
- The chat page (`app/chat/page.tsx`) is a Client Component because it uses `useState`.
- API routes (`app/api/**`) are always server-side.

### Keep sensitive logic server-side
Never call the Google Sheets API from a Client Component. Always proxy through an API route.

```
Client → POST /api/expense → (server) googleapis → Google Sheets
```

### Use `next/navigation` not `next/router`
```typescript
import { useRouter } from "next/navigation"; // App Router
```

---

## 3. API Routes

### Validate inputs before processing
Use `zod` for request body validation:
```typescript
import { z } from "zod";

const schema = z.object({
  message: z.string().min(1).max(500),
  spreadsheetId: z.string().min(1),
});

const result = schema.safeParse(await req.json());
if (!result.success) {
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
}
```

### Return consistent error shapes
```typescript
// Always return { error: string } on failure
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Always return the data directly on success (no wrapper key)
return NextResponse.json({ row: { ... } });
```

### Check authentication first
The very first thing any protected API route does is verify the session.

---

## 4. Environment Variables

### Naming convention
- Prefix server-only vars with nothing (they are not exposed by default in Next.js).
- Prefix public vars with `NEXT_PUBLIC_` only when absolutely necessary (none needed for this project).

### Never access `process.env` outside of `lib/` files
Centralize env access so it is easy to audit:
```typescript
// lib/config.ts
export const config = {
  googleClientId: process.env.AUTH_GOOGLE_ID!,
  authSecret: process.env.AUTH_SECRET!,
};
```

### Use non-null assertion sparingly
Only use `!` on env vars after verifying the variable is required at startup. For production, add a startup check:
```typescript
const required = ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}
```

---

## 5. Component Design

### Small, single-purpose components
Each component does one thing. Compose them in the page.

| Component | Responsibility |
|-----------|---------------|
| `ChatWindow` | Renders the scrollable list, auto-scrolls |
| `MessageBubble` | Renders one message + its status |
| `ExpenseInput` | Controlled input + submit handler |
| `SpreadsheetSetup` | Collects and validates the spreadsheet ID |

### Props over global state
Pass data down via props. Do not reach for a state manager (Zustand, Redux) for this project — `useState` + prop drilling is sufficient given the small component tree.

### Loading and error states are required
Every async action must have a visible loading indicator and error message.

```typescript
const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

// In the submit handler:
setStatus("loading");
const res = await fetch("/api/expense", { ... });
if (!res.ok) {
  setStatus("error");
  return;
}
setStatus("idle");
```

---

## 6. Styling (Tailwind CSS)

### Use semantic class groupings
Group Tailwind classes by concern with a consistent order:
`layout → sizing → spacing → typography → color → interactive`

```tsx
// Example
<button className="flex items-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
```

### Extract repeated patterns into components, not `@apply`
Avoid `@apply` in CSS files. If a pattern repeats, extract a React component instead.

### Dark mode
Not in scope for v1. Do not add `dark:` variants preemptively.

---

## 7. Security

### Input sanitization
The user's raw message string is parsed server-side and only the structured fields (`description`, `amount`, `category`) are written to Sheets. The raw string is never written to Sheets directly.

### OAuth token handling
- Tokens are stored in `httpOnly` cookies managed by NextAuth.
- Never `console.log` a token.
- The `accessToken` must not appear in any client-side variable.

### No secrets in code
All secrets come from environment variables. If a secret is accidentally committed:
1. Revoke it immediately in the Google Cloud Console.
2. Rotate `AUTH_SECRET`.
3. Remove it from git history (`git filter-repo` or BFG Repo Cleaner).

---

## 8. Git Workflow

### Branch naming
```
feat/<short-description>    # new feature
fix/<short-description>     # bug fix
chore/<short-description>   # tooling, deps, config
```

### Commit messages
Use the imperative mood:
```
feat: add expense API route
fix: handle missing category in parser
chore: add zod for input validation
```

### What never goes in git
```
.env.local
.env*.local
node_modules/
.next/
```
These are already covered by the default Next.js `.gitignore`.

---

## 9. Code Review Checklist

Before merging any change, verify:

- [ ] No `any` types introduced.
- [ ] All new API routes check authentication first.
- [ ] All user inputs are validated with zod before use.
- [ ] No secrets or tokens logged or exposed to the client.
- [ ] Loading and error states handled in every async UI action.
- [ ] No `console.log` statements left in production code (use `console.error` only for actual errors).
- [ ] TypeScript compiler reports zero errors (`npm run build`).
- [ ] ESLint reports zero errors (`npm run lint`).
