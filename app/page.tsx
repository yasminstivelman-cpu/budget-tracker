import { auth, signIn } from "@/lib/server/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/setup");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 p-10 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900">Budget Tracker</h1>
        <p className="mt-2 text-sm text-gray-500">
          Log expenses with your team.
        </p>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/setup" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
