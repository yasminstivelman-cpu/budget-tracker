import { NextResponse } from "next/server";
import { auth } from "@/lib/server/auth";
import { readContributorConfig } from "@/lib/server/config";
import { getExpenseRows, getAccessTokenFromRefreshToken } from "@/lib/server/sheets";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = readContributorConfig();
  if (!config) {
    return NextResponse.json({ error: "Spreadsheet not configured" }, { status: 404 });
  }

  try {
    const accessToken = await getAccessTokenFromRefreshToken(config.ownerRefreshToken);
    const expenses = await getExpenseRows(accessToken, config.spreadsheetId, config.sheetName);
    return NextResponse.json({ expenses });
  } catch (e) {
    console.error("[expenses] Read error:", e);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}
