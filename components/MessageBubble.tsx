import type { ExpenseRow } from "@/lib/server/sheets";

export function MessageBubble({ expense }: { expense: ExpenseRow }) {
  const { date, description, amount, category, card, contributor } = expense;

  return (
    <div className="flex flex-col items-start max-w-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500">
          {contributor || "Unknown"}
        </span>
        <span className="text-xs text-gray-400">{date}</span>
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-2.5 shadow-sm">
        <p className="text-sm text-gray-900">{description}</p>
        <p className="mt-1 text-sm font-semibold text-blue-600">
          R${amount.toFixed(2)}
        </p>
        <div className="mt-1.5 flex gap-1.5">
          {category && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 border border-gray-200">
              {category}
            </span>
          )}
          {card && (
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500 border border-gray-200">
              {card}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
