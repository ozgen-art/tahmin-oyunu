import type { MatchWithOptions, Prediction } from "@/lib/types";
import { formatOutcome } from "@/lib/scoring";

/** Kilitlenmiş veya sonuçlanmış bir maç için salt-okunur tahmin özeti. */
export default function PredictionSummary({
  match,
  existing,
}: {
  match: MatchWithOptions;
  existing: Prediction | null;
}) {
  const finished = match.status === "finished";

  if (!existing) {
    return (
      <p className="text-black/60 dark:text-white/60">
        Bu maç için tahmin girmemişsin{finished ? "; bu maçtan puan alamayacaksın." : "."}
      </p>
    );
  }

  const resultOpt = match.resultOptions.find((o) => o.id === existing.resultOptionId);
  const scoreOpt = match.scoreOptions.find((o) => o.id === existing.scoreOptionId);
  const scorerOpt = match.scorerOptions.find((o) => o.id === existing.scorerOptionId);

  const rows = [
    {
      label: "Maç Sonucu",
      value: resultOpt
        ? resultOpt.outcome === "home"
          ? match.homeTeam
          : resultOpt.outcome === "away"
            ? match.awayTeam
            : formatOutcome("draw")
        : "—",
      points: existing.resultPointsEarned,
      possible: resultOpt?.points,
    },
    {
      label: "Kesin Skor",
      value: scoreOpt ? `${scoreOpt.homeScore}-${scoreOpt.awayScore}` : "—",
      points: existing.scorePointsEarned,
      possible: scoreOpt?.points,
    },
    {
      label: "İlk Golü Atan",
      value: scorerOpt?.playerName ?? "—",
      points: existing.scorerPointsEarned,
      possible: scorerOpt?.points,
    },
  ];

  const total =
    (existing.resultPointsEarned ?? 0) +
    (existing.scorePointsEarned ?? 0) +
    (existing.scorerPointsEarned ?? 0);

  return (
    <div className="flex flex-col gap-3">
      {finished && (
        <p className="text-lg font-semibold">
          Bu maçtan kazandığın puan: <span className="text-indigo-600 dark:text-indigo-400">{total}</span>
        </p>
      )}
      <table className="w-full border-collapse overflow-hidden rounded-lg border border-black/10 text-sm dark:border-white/15">
        <thead>
          <tr className="bg-black/5 dark:bg-white/5">
            <th className="px-3 py-2 text-left">Kategori</th>
            <th className="px-3 py-2 text-left">Tahminin</th>
            {finished && <th className="px-3 py-2 text-right">Puan</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-black/10 dark:border-white/10">
              <td className="px-3 py-2 text-black/60 dark:text-white/60">{row.label}</td>
              <td className="px-3 py-2">{row.value}</td>
              {finished && (
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    (row.points ?? 0) > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-black/40 dark:text-white/40"
                  }`}
                >
                  {row.value === "—" ? "—" : `${row.points ?? 0}${row.possible ? ` / ${row.possible}` : ""}`}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!finished && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Maç kilitlendi, tahminler artık değiştirilemez. Sonuç girildiğinde puanların burada
          görünecek.
        </p>
      )}
    </div>
  );
}
