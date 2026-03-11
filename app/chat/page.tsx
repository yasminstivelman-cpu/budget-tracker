import { auth } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { readContributorConfig } from "@/lib/server/config";
import { getExpenseRows, getAccessTokenFromRefreshToken } from "@/lib/server/sheets";
import type { ExpenseRow } from "@/lib/server/sheets";
import { ChatWindow } from "@/components/ChatWindow";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ChatPage() {
  const session = await auth();
  if (!session) redirect("/");

  const config = readContributorConfig();
  if (!config) redirect("/setup");

  let expenses: ExpenseRow[] = [];
  try {
    const accessToken = await getAccessTokenFromRefreshToken(config.ownerRefreshToken);
    expenses = await getExpenseRows(accessToken, config.spreadsheetId, config.sheetName);
  } catch (e) {
    console.error("[chat] Failed to load expenses:", e);
  }

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <span className="text-sm font-semibold text-gray-900">Budget Tracker</span>
          <span className="ml-2 text-xs text-gray-400">{config.sheetName}</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/setup" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            Settings
          </a>
          <SignOutButton />
        </div>
      </header>

      <ChatWindow initialExpenses={expenses} />
    </main>
  );
}
