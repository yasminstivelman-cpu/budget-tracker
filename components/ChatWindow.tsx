"use client";

import { useState, useCallback } from "react";
import type { ExpenseRow } from "@/lib/server/sheets";
import { MessageBubble } from "./MessageBubble";

type Props = {
  initialExpenses: ExpenseRow[];
};

export function ChatWindow({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as { expenses: ExpenseRow[] };
      setExpenses(data.expenses);
    } catch {
      setError("Could not refresh. Check your connection.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
        <span className="text-sm text-gray-500">
          {expenses.length === 0
            ? "No expenses yet"
            : `${expenses.length} expense${expenses.length === 1 ? "" : "s"}`}
        </span>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <p className="px-6 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-12">
            Expenses submitted by your contributor will appear here.
          </p>
        ) : (
          expenses.map((expense, i) => (
            <MessageBubble key={i} expense={expense} />
          ))
        )}
      </div>
    </div>
  );
}
