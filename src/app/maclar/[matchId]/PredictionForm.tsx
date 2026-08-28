"use client";

import { useActionState } from "react";
import { submitPredictionAction, type PredictionActionState } from "@/app/actions/predictions";
import type { MatchWithOptions, Prediction } from "@/lib/types";
import { formatOutcome } from "@/lib/scoring";

const initialState: PredictionActionState = {};

export default function PredictionForm({
  match,
  existing,
}: {
  match: MatchWithOptions;
  existing: Prediction | null;
}) {
  const [state, formAction, pending] = useActionState(submitPredictionAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="matchId" value={match.id} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Maç Sonucu (1 / Berabere / 2)</legend>
        {match.resultOptions.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded border border-black/10 px-3 py-2 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-600/5 dark:border-white/15"
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="resultOptionId"
                value={opt.id}
                defaultChecked={existing?.resultOptionId === opt.id}
              />
              {opt.outcome === "home" ? match.homeTeam : opt.outcome === "away" ? match.awayTeam : formatOutcome("draw")}
            </span>
            <span className="text-sm text-black/60 dark:text-white/60">
              oran {opt.odds.toFixed(2)} · <strong>{opt.points} puan</strong>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Kesin Skor</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {match.scoreOptions.map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-center justify-between gap-2 rounded border border-black/10 px-3 py-2 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-600/5 dark:border-white/15"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="scoreOptionId"
                  value={opt.id}
                  defaultChecked={existing?.scoreOptionId === opt.id}
                />
                {opt.homeScore}-{opt.awayScore}
              </span>
              <span className="text-black/60 dark:text-white/60">{opt.points}p</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">İlk Golü Atan Oyuncu</legend>
        {match.scorerOptions.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center justify-between gap-3 rounded border border-black/10 px-3 py-2 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-600/5 dark:border-white/15"
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="scorerOptionId"
                value={opt.id}
                defaultChecked={existing?.scorerOptionId === opt.id}
              />
              {opt.playerName}
              {opt.teamSide !== "none" && (
                <span className="text-xs text-black/40 dark:text-white/40">
                  ({opt.teamSide === "home" ? match.homeTeam : match.awayTeam})
                </span>
              )}
            </span>
            <span className="text-sm text-black/60 dark:text-white/60">
              oran {opt.odds.toFixed(2)} · <strong>{opt.points} puan</strong>
            </span>
          </label>
        ))}
      </fieldset>

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Tahminin kaydedildi.</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : existing ? "Tahminimi Güncelle" : "Tahminimi Kaydet"}
      </button>
    </form>
  );
}
