"use client";

import { useActionState } from "react";
import { createMatchAction, type AdminActionState } from "@/app/actions/admin";

const initialState: AdminActionState = {};

export default function NewMatchForm() {
  const [state, formAction, pending] = useActionState(createMatchAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Kategori</label>
        <select
          name="competition"
          required
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        >
          <option value="UCL">UEFA Şampiyonlar Ligi</option>
          <option value="UEL">UEFA Avrupa Ligi</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Maç tarihi/saati</label>
        <input
          type="datetime-local"
          name="kickoffAt"
          required
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Ev sahibi takım</label>
        <input
          name="homeTeam"
          required
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Deplasman takımı</label>
        <input
          name="awayTeam"
          required
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      {state.error && (
        <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {pending ? "Ekleniyor…" : "Maç Ekle"}
        </button>
      </div>
    </form>
  );
}
