import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import { z } from "zod";
import { validateSpreadsheetAccess } from "@/lib/server/sheets";
import { readContributorConfig, writeContributorConfig, hashPassword } from "@/lib/server/config";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = readContributorConfig();
  if (!config) {
    return NextResponse.json({ configured: false });
  }

  return NextResponse.json({
    configured: true,
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    email: config.email,
  });
}

const schema = z.object({
  spreadsheetUrl: z.string().url(),
  sheetName: z.string().min(1),
  contributorEmail: z.string().email(),
  contributorPassword: z.string(),
}).refine(
  (data) => data.contributorPassword === "" || data.contributorPassword.length >= 6,
  { message: "Password must be at least 6 characters", path: ["contributorPassword"] }
);

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  console.log("[setup POST] session:", JSON.stringify({
    hasSession: !!session,
    hasAccessToken: !!session?.accessToken,
    hasRefreshToken: !!session?.refreshToken,
    email: session?.user?.email,
  }));
  if (!session?.accessToken || !session.refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json();
  const result = schema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { spreadsheetUrl, sheetName, contributorEmail, contributorPassword } =
    result.data;

  const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: "Could not parse spreadsheet ID from URL" },
      { status: 400 }
    );
  }

  try {
    await validateSpreadsheetAccess(session.accessToken, spreadsheetId);
  } catch (e: unknown) {
    console.error("[setup] Sheets access error:", e);
    return NextResponse.json(
      {
        error:
          "Spreadsheet not accessible. Make sure the URL is correct and your account has edit access.",
      },
      { status: 403 }
    );
  }

  const existingConfig = readContributorConfig();
  const passwordHash =
    contributorPassword !== ""
      ? hashPassword(contributorPassword)
      : existingConfig?.passwordHash ?? hashPassword(contributorPassword);

  writeContributorConfig({
    spreadsheetId,
    sheetName,
    email: contributorEmail,
    passwordHash,
    ownerRefreshToken: session.refreshToken,
  });

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const contributorUrl = `${baseUrl}/contribute`;

  return NextResponse.json({
    spreadsheetId,
    sheetName,
    contributorUrl,
    contributorEmail,
  });
}
