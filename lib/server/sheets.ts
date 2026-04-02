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

  // Find the first empty row by reading column A
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:A`,
  });
  const numRows = res.data.values?.length ?? 0;
  const nextRow = numRows + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A${nextRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

export async function getLastExpenseRowNumber(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<number | null> {
  const sheets = getSheetsClient(accessToken);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A:F`,
  });
  const rows = res.data.values ?? [];
  for (let i = rows.length - 1; i >= 0; i--) {
    const cell = rows[i]?.[2];
    if (cell === undefined || cell === "") continue;
    const normalized = String(cell).replace(",", ".");
    if (!isNaN(parseFloat(normalized))) {
      return i + 1; // 1-indexed for Sheets API
    }
  }
  return null;
}

export async function updateExpenseRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number,
  fields: Partial<{ description: string; amount: number; category: string; card: string }>
): Promise<ExpenseRow> {
  const sheets = getSheetsClient(accessToken);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A${rowNumber}:F${rowNumber}`,
  });
  const current = res.data.values?.[0] ?? [];

  const updatedRow = [
    String(current[0] ?? ""),
    fields.description ?? String(current[1] ?? ""),
    fields.amount ?? Number(current[2]),
    fields.category ?? String(current[3] ?? ""),
    fields.card ?? String(current[4] ?? ""),
    String(current[5] ?? ""),
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updatedRow] },
  });

  return {
    date: String(updatedRow[0]),
    description: String(updatedRow[1]),
    amount: Number(updatedRow[2]),
    category: String(updatedRow[3]),
    card: String(updatedRow[4]),
    contributor: String(updatedRow[5]),
  };
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
