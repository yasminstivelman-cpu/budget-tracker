"use client";

import { useState } from "react";

type Screen = "login" | "expense" | "success";

export function ContributorForm() {
  const [screen, setScreen] = useState<Screen>("login");
  const [sessionToken, setSessionToken] = useState("");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Expense state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [contributor, setContributor] = useState("");
  const [expenseError, setExpenseError] = useState("");
  const [expenseLoading, setExpenseLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/contribute/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        setLoginError(
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : "Login failed. Please try again."
        );
        return;
      }

      const token = (data as { token: string }).token;
      setSessionToken(token);
      setContributor(email);
      setScreen("expense");
    } catch {
      setLoginError("Network error. Check your connection and try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setExpenseLoading(true);
    setExpenseError("");

    try {
      const res = await fetch("/api/expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sessionToken,
          description,
          amount: parseFloat(amount),
          contributor,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        setExpenseError(
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : "Something went wrong. Please try again."
        );
        return;
      }

      setScreen("success");
    } catch {
      setExpenseError("Network error. Check your connection and try again.");
    } finally {
      setExpenseLoading(false);
    }
  }

  function handleReset() {
    setDescription("");
    setAmount("");
    setExpenseError("");
    setScreen("expense");
  }

  if (screen === "login") {
    return (
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {loginError && <p className="text-sm text-red-600">{loginError}</p>}

        <button
          type="submit"
          disabled={loginLoading}
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loginLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    );
  }

  if (screen === "success") {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-2 text-sm font-medium text-green-800">
            Expense submitted!
          </p>
          <p className="mt-0.5 text-xs text-green-600">
            It has been added to the spreadsheet.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Submit another
        </button>
      </div>
    );
  }

  // Expense screen
  return (
    <form onSubmit={handleExpenseSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <input
          id="description"
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Team lunch, Taxi to client"
          className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Amount
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
            $
          </span>
          <input
            id="amount"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="block w-full rounded-lg border border-gray-300 py-2 pl-7 pr-3 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {expenseError && (
        <p className="text-sm text-red-600">{expenseError}</p>
      )}

      <button
        type="submit"
        disabled={expenseLoading}
        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {expenseLoading ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
