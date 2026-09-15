"use client";

import { useActionState } from "react";
import { submitPredictionAction, type PredictionActionState } from "@/app/actions/predictions";
import type { MatchWithOptions, Prediction } from "@/lib/types";
import { formatOutcome } from "@/lib/scoring";

const initialState: PredictionActionState = {};

export default function PredictionForm({
  match,
  existing,
  jokerAvailableThisWeek,
}: {
  match: MatchWithOptions;
  existing: Prediction | null;
  /** Joker bu maçta kullanılabilir mi (maç uygun VE bu hafta başka bir
   * maçta joker kullanılmamış, ya da zaten bu maçta kullanılmışsa). */
  jokerAvailableThisWeek: boolean;
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
            className="flex cursor-pointer items-center gap-3 rounded border border-black/10 px-3 py-2 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-600/5 dark:border-white/15"
          >
            <input
              type="radio"
              name="resultOptionId"
              value={opt.id}
              defaultChecked={existing?.resultOptionId === opt.id}
            />
            {opt.outcome === "home" ? match.homeTeam : opt.outcome === "away" ? match.awayTeam : formatOutcome("draw")}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Kesin Skor</legend>
        <p className="text-xs text-black/50 dark:text-white/50">Tahmin ettiğin skoru elle gir.</p>
        <div className="flex items-center gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {match.homeTeam}
            <input
              type="number"
              name="predictedHomeScore"
              min={0}
              max={20}
              defaultValue={existing?.predictedHomeScore}
              className="w-20 rounded border border-black/15 bg-transparent px-3 py-2 text-center dark:border-white/20"
            />
          </label>
          <span className="mt-5 text-black/40 dark:text-white/40">-</span>
          <label className="flex flex-col gap-1 text-sm">
            {match.awayTeam}
            <input
              type="number"
              name="predictedAwayScore"
              min={0}
              max={20}
              defaultValue={existing?.predictedAwayScore}
              className="w-20 rounded border border-black/15 bg-transparent px-3 py-2 text-center dark:border-white/20"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">İlk Golü Atan Oyuncu</legend>
        {match.scorerOptions.map((opt) => (
          <label
            key={opt.id}
            className="flex cursor-pointer items-center gap-3 rounded border border-black/10 px-3 py-2 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-600/5 dark:border-white/15"
          >
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
          </label>
        ))}
      </fieldset>

      {match.isJokerEligible && (
        <label
          className={`flex items-start gap-3 rounded border px-3 py-3 text-sm ${
            jokerAvailableThisWeek
              ? "cursor-pointer border-amber-400 bg-amber-400/10 has-[:checked]:border-amber-500 has-[:checked]:bg-amber-400/20"
              : "cursor-not-allowed border-black/10 opacity-60 dark:border-white/15"
          }`}
        >
          <input
            type="checkbox"
            name="jokerUsed"
            disabled={!jokerAvailableThisWeek}
            defaultChecked={existing?.jokerUsed}
            className="mt-0.5"
          />
          <span>
            <strong>🃏 Jokerimi bu maçta kullan</strong> — bu tahminden kazandığın puan 3 katına
            çıkar. Haftada sadece bir maçta kullanabilirsin.
            {!jokerAvailableThisWeek && !existing?.jokerUsed && (
              <span className="mt-1 block text-black/50 dark:text-white/50">
                Bu haftaki jokerini zaten başka bir maçta kullandın.
              </span>
            )}
          </span>
        </label>
      )}

      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}

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
