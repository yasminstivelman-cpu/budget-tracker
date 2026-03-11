import { auth } from "@/lib/server/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/SignOutButton";
import { SpreadsheetSetup } from "@/components/SpreadsheetSetup";

export default async function SetupPage() {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <span className="text-sm font-semibold text-gray-900">
          Budget Tracker
        </span>
        <SignOutButton />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <h1 className="text-xl font-bold text-gray-900">
            Step 1: Connect your spreadsheet
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as{" "}
            <span className="font-medium text-gray-700">
              {session.user?.email}
            </span>
          </p>

          <div className="mt-8">
            <SpreadsheetSetup />
          </div>
        </div>
      </div>
    </main>
  );
}
