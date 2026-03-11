import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/server/contributor-session";
import { readContributorConfig } from "@/lib/server/config";
import { appendExpenseRow, getAccessTokenFromRefreshToken } from "@/lib/server/sheets";
import { z } from "zod";

const schema = z.object({
  token: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  contributor: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body: unknown = await req.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { token, description, amount, contributor } = result.data;

  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = readContributorConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Spreadsheet not configured" },
      { status: 500 }
    );
  }

  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  try {
    const accessToken = await getAccessTokenFromRefreshToken(config.ownerRefreshToken);
    await appendExpenseRow(accessToken, config.spreadsheetId, config.sheetName, [
      date,
      description,
      amount,
      "",
      contributor ?? "",
    ]);
  } catch (e) {
    console.error("[expense] Sheet append error:", e);
    return NextResponse.json(
      { error: "Failed to save expense. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
