"use client";

import { useActionState } from "react";
import { syncResultsFromApiAction, type AdminActionState } from "@/app/actions/admin";

const initialState: AdminActionState = {};

export default function SyncResultsButton() {
  const [state, formAction, pending] = useActionState(syncResultsFromApiAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-600/10 disabled:opacity-60 dark:text-emerald-400"
      >
        {pending ? "Kontrol ediliyor…" : "Biten Maçların Sonucunu API'den Çek"}
      </button>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-black/60 dark:text-white/60">{state.message}</p>
      )}
    </form>
  );
}
