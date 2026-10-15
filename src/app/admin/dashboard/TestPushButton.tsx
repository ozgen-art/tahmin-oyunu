"use client";

import { useState, useTransition } from "react";
import { sendTestPushAction } from "@/app/actions/push";

export default function TestPushButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            setError(null);
            const result = await sendTestPushAction();
            if (result.ok) setMessage(result.message ?? "Gönderildi.");
            else setError(result.error ?? "Gönderilemedi.");
          })
        }
        className="rounded border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-60 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        {pending ? "Gönderiliyor…" : "Test bildirimi gönder"}
      </button>
      {message && <span className="text-sm text-emerald-600 dark:text-emerald-400">{message}</span>}
      {error && <span className="text-sm text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
