import Link from "next/link";
import { redirect } from "next/navigation";
import { getMatchPhaseSync, listMatches, listPredictionsForParticipant } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";

const COMPETITION_LABEL: Record<string, string> = {
  UCL: "Şampiyonlar Ligi",
  UEL: "Avrupa Ligi",
};

export default async function TahminlerimPage() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/giris");

  const [matches, predictions] = await Promise.all([
    listMatches(),
    listPredictionsForParticipant(participant.id),
  ]);
  const predictionByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  const totalPoints = predictions.reduce(
    (sum, p) => sum + (p.resultPointsEarned ?? 0) + (p.scorePointsEarned ?? 0) + (p.scorerPointsEarned ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Tahminlerim</h1>
        <p className="text-black/60 dark:text-white/60">
          Toplam puanın: <strong className="text-indigo-600 dark:text-indigo-400">{totalPoints}</strong>
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {matches.map((match) => {
          const pred = predictionByMatch.get(match.id);
          const phase = getMatchPhaseSync(match);
          const points = pred
            ? (pred.resultPointsEarned ?? 0) + (pred.scorePointsEarned ?? 0) + (pred.scorerPointsEarned ?? 0)
            : null;
          return (
            <li key={match.id}>
              <Link
                href={`/maclar/${match.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 p-4 hover:border-indigo-400 dark:border-white/15"
              >
                <div>
                  <span className="mr-2 rounded bg-indigo-600/10 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {COMPETITION_LABEL[match.competition]}
                  </span>
                  <span className="font-medium">
                    {match.homeTeam} vs {match.awayTeam}
                  </span>
                </div>
                <div className="text-sm">
                  {!pred && <span className="text-black/40 dark:text-white/40">Tahmin yok</span>}
                  {pred && phase !== "finished" && (
                    <span className="text-black/50 dark:text-white/50">Tahmin gönderildi</span>
                  )}
                  {pred && phase === "finished" && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {points} puan
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
