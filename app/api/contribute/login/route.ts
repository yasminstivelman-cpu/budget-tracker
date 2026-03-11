import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readContributorConfig, hashPassword } from "@/lib/server/config";
import { createSessionToken } from "@/lib/server/contributor-session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = result.data;
  const config = readContributorConfig();

  if (
    !config ||
    config.email !== email ||
    config.passwordHash !== hashPassword(password)
  ) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
  }

  const token = createSessionToken(email);
  return NextResponse.json({ token });
}
