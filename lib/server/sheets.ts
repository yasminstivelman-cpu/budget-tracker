import { google } from "googleapis";

export function getSheetsClient(accessToken: string) {
  const oauthClient = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauthClient.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauthClient });
}

export async function validateSpreadsheetAccess(
  accessToken: string,
  spreadsheetId: string
): Promise<string> {
  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.get({ spreadsheetId });
  return res.data.properties?.title ?? spreadsheetId;
}

export type ExpenseRow = {
  date: string;
  description: string;
  amount: number;
  category: string;
  card: string;
  contributor: string;
};

export async function getExpenseRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<ExpenseRow[]> {
  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:F`,
  });
  const rows = res.data.values ?? [];
  return rows
    .filter((row) => row[2] !== undefined && !isNaN(Number(row[2])))
    .map((row) => ({
      date: String(row[0] ?? ""),
      description: String(row[1] ?? ""),
      amount: Number(row[2]),
      category: String(row[3] ?? ""),
      card: String(row[4] ?? ""),
      contributor: String(row[5] ?? ""),
    }));
}

export async function appendExpenseRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  row: [string, string, number, string, string, string]
) {
  const sheets = getSheetsClient(accessToken);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName}'!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "OVERWRITE",
    requestBody: { values: [row] },
  });
}

export async function readSheetRows(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:F`,
  });
  return res.data.values ?? [];
}

export async function getAccessTokenFromRefreshToken(
  refreshToken: string
): Promise<string> {
  const oauthClient = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauthClient.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauthClient.refreshAccessToken();
  if (!credentials.access_token) throw new Error("Failed to refresh access token");
  return credentials.access_token;
}
