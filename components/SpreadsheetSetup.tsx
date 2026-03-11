"use client";

import { useState, useEffect } from "react";

type Status = "idle" | "loading" | "error";

type SetupResult = {
  spreadsheetId: string;
  sheetName: string;
  contributorUrl: string;
  contributorEmail: string;
};

type SavedConfig = {
  configured: true;
  spreadsheetId: string;
  sheetName: string;
  email: string;
};

export function SpreadsheetSetup() {
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [sheetName, setSheetName] = useState("Expenses");
  const [contributorEmail, setContributorEmail] = useState("");
  const [contributorPassword, setContributorPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data: unknown) => {
        if (
          typeof data === "object" &&
          data !== null &&
          "configured" in data &&
          (data as { configured: boolean }).configured === true
        ) {
          const config = data as SavedConfig;
          setSpreadsheetUrl(
            `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`
          );
          setSheetName(config.sheetName);
          setContributorEmail(config.email);
          setIsAlreadyConfigured(true);
        }
      })
      .catch(() => {/* silently ignore — will just show empty form */})
      .finally(() => setLoadingConfig(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetUrl,
          sheetName,
          contributorEmail,
          contributorPassword,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : "Something went wrong. Please try again."
        );
        return;
      }

      setResult(data as SetupResult);
      setIsAlreadyConfigured(true);
      setStatus("idle");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  }

  async function handleCopy(text: string, which: "url" | "password") {
    await navigator.clipboard.writeText(text);
    if (which === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  }

  if (loadingConfig) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">
            Connected to spreadsheet
          </p>
          <p className="mt-0.5 text-xs text-green-600">
            Sheet:{" "}
            <span className="font-mono font-semibold">{result.sheetName}</span>
          </p>
        </div>
      )}

      {isAlreadyConfigured && !result && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            Setup is already configured
          </p>
          <p className="mt-0.5 text-xs text-blue-600">
            Update any fields below and save to apply changes.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="spreadsheetUrl"
            className="block text-sm font-medium text-gray-700"
          >
            Spreadsheet URL
          </label>
          <input
            id="spreadsheetUrl"
            type="url"
            required
            value={spreadsheetUrl}
            onChange={(e) => setSpreadsheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="sheetName"
            className="block text-sm font-medium text-gray-700"
          >
            Sheet name
          </label>
          <input
            id="sheetName"
            type="text"
            required
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Expenses"
            className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            The tab name in your spreadsheet where rows will be appended.
          </p>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700">
            Contributor credentials
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            The contributor will use these to log in at{" "}
            <span className="font-mono">/contribute</span>.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="contributorEmail"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="contributorEmail"
                type="email"
                required
                value={contributorEmail}
                onChange={(e) => setContributorEmail(e.target.value)}
                placeholder="contributor@example.com"
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="contributorPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="contributorPassword"
                type="password"
                required={!isAlreadyConfigured}
                minLength={isAlreadyConfigured ? undefined : 6}
                value={contributorPassword}
                onChange={(e) => setContributorPassword(e.target.value)}
                placeholder={
                  isAlreadyConfigured
                    ? "Leave blank to keep current password"
                    : "At least 6 characters"
                }
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {isAlreadyConfigured && (
                <p className="mt-1 text-xs text-gray-400">
                  Leave blank to keep the current password.
                </p>
              )}
            </div>
          </div>
        </div>

        {status === "error" && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center justify-center w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {status === "loading"
            ? "Saving…"
            : isAlreadyConfigured
            ? "Save changes"
            : "Connect"}
        </button>
      </form>

      {(result || isAlreadyConfigured) && (
        <div>
          <p className="text-sm font-medium text-gray-700">
            Share with your contributor
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Send them the link and credentials below — no Google account
            required.
          </p>

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">Link</p>
                <code className="block truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  {result?.contributorUrl ?? `${window.location.origin}/contribute`}
                </code>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    result?.contributorUrl ?? `${window.location.origin}/contribute`,
                    "url"
                  )
                }
                className="shrink-0 mt-5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {copiedUrl ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-1">Email</p>
                <code className="block truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  {result?.contributorEmail ?? contributorEmail}
                </code>
              </div>
            </div>

            {(result || contributorPassword) && (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">Password</p>
                  <code className="block truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {contributorPassword || "••••••"}
                  </code>
                </div>
                {contributorPassword && (
                  <button
                    onClick={() => handleCopy(contributorPassword, "password")}
                    className="shrink-0 mt-5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {copiedPassword ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            )}
          </div>

          <a
            href="/chat"
            className="mt-4 flex items-center justify-center w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Go to chat →
          </a>
        </div>
      )}
    </div>
  );
}
