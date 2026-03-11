import { ContributorForm } from "@/components/ContributorForm";

export default function ContributePage() {
  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <span className="text-sm font-semibold text-gray-900">
          Budget Tracker
        </span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500">
            Use the credentials shared with you to log expenses.
          </p>

          <div className="mt-8">
            <ContributorForm />
          </div>
        </div>
      </div>
    </main>
  );
}
