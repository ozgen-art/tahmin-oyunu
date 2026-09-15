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
      <p className="p-muted" style={{ fontSize: 14 }}>
        Bu maç için tahmin girmemişsin{finished ? "; bu maçtan puan alamayacaksın." : "."}
      </p>
    );
  }

  const resultOpt = match.resultOptions.find((o) => o.id === existing.resultOptionId);
  const scorerOpt = match.scorerOptions.find((o) => o.id === existing.scorerOptionId);
  const hasScorePrediction =
    existing.predictedHomeScore !== undefined && existing.predictedAwayScore !== undefined;

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
    },
    {
      label: "Kesin Skor",
      value: hasScorePrediction
        ? `${existing.predictedHomeScore}-${existing.predictedAwayScore}`
        : "—",
      points: existing.scorePointsEarned,
    },
    // "İlk Golü Atan" kategorisi kaldırıldı — sadece bu tahmin eski bir
    // seçime sahipse (kaldırmadan önce yapılmışsa) gösteriliyor.
    ...(scorerOpt
      ? [{ label: "İlk Golü Atan", value: scorerOpt.playerName, points: existing.scorerPointsEarned }]
      : []),
  ];

  const total =
    (existing.resultPointsEarned ?? 0) +
    (existing.scorePointsEarned ?? 0) +
    (existing.scorerPointsEarned ?? 0);

  return (
    <div className="flex flex-col gap-3">
      {existing.jokerUsed && (
        <p
          style={{
            width: "fit-content",
            borderRadius: 8,
            padding: "4px 12px",
            fontSize: 13,
            fontWeight: 600,
            background: "rgba(227,179,92,0.15)",
            color: "var(--p-gold-soft)",
          }}
        >
          🃏 Bu maçta jokerini kullandın — puanların 3 katına çıktı.
        </p>
      )}
      {finished && (
        <p style={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: 18 }}>
          Bu maçtan kazandığın puan: <span style={{ color: "var(--p-gold-soft)" }}>{total}</span>
        </p>
      )}
      <div className="p-card" style={{ padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.05)" }}>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Kategori</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Tahminin</th>
              {finished && <th style={{ padding: "10px 14px", textAlign: "right" }}>Puan</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <td className="p-muted" style={{ padding: "10px 14px" }}>
                  {row.label}
                </td>
                <td style={{ padding: "10px 14px" }}>{row.value}</td>
                {finished && (
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: (row.points ?? 0) > 0 ? "var(--p-teal)" : "var(--p-text-muted)",
                    }}
                  >
                    {row.value === "—" ? "—" : (row.points ?? 0)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!finished && (
        <p className="p-muted" style={{ fontSize: 13 }}>
          Maç kilitlendi, tahminler artık değiştirilemez. Sonuç girildiğinde puanların burada
          görünecek.
        </p>
      )}
    </div>
  );
}
