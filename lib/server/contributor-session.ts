import { createHmac } from "crypto";

type Payload = { email: string; iat: number };

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSessionToken(email: string): string {
  const payload = JSON.stringify({ email, iat: Date.now() } satisfies Payload);
  const encoded = Buffer.from(payload).toString("base64url");
  const secret = process.env.AUTH_SECRET ?? "";
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): { email: string } | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;

  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const secret = process.env.AUTH_SECRET ?? "";
  const expected = createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  if (expected !== sig) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    ) as Payload;
    if (Date.now() - payload.iat > SESSION_TTL_MS) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}
