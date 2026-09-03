"use client";

import { useActionState } from "react";
import { importMatchesFromApiAction, type AdminActionState } from "@/app/actions/admin";

const initialState: AdminActionState = {};

export default function ImportMatchesButton() {
  const [state, formAction, pending] = useActionState(importMatchesFromApiAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-600/10 disabled:opacity-60 dark:text-indigo-400"
      >
        {pending ? "Çekiliyor…" : "Bugün/Yarının UCL-UEL Maçlarını API'den Çek"}
      </button>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.message && (
        <p className="text-sm text-black/60 dark:text-white/60">{state.message}</p>
      )}
    </form>
  );
}
