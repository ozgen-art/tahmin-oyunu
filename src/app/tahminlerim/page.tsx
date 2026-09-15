import Link from "next/link";
import { redirect } from "next/navigation";
import { getMatchPhaseSync, listMatches, listPredictionsForParticipant } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";

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
    <ParticipantShell activeNav="tahminlerim">
      <h1 className="p-greeting">Tahminlerim</h1>
      <p className="p-subtitle">
        Toplam puanın: <span style={{ color: "var(--p-gold-soft)", fontWeight: 700 }}>{totalPoints}</span>
      </p>

      <div className="p-match-list">
        {matches.map((match) => {
          const pred = predictionByMatch.get(match.id);
          const phase = getMatchPhaseSync(match);
          const points = pred
            ? (pred.resultPointsEarned ?? 0) + (pred.scorePointsEarned ?? 0) + (pred.scorerPointsEarned ?? 0)
            : null;
          return (
            <Link key={match.id} href={`/maclar/${match.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="p-card done">
                <div className="p-done-row">
                  <div>
                    <div className="p-done-teams">
                      <span>{match.homeTeam}</span>
                      <span className="p-muted">vs</span>
                      <span>{match.awayTeam}</span>
                    </div>
                    <div className="p-done-scorer">
                      {COMPETITION_LABEL[match.competition]}
                    </div>
                  </div>
                  <div>
                    {!pred && (
                      <span className="p-muted" style={{ fontSize: 12 }}>
                        Tahmin yok
                      </span>
                    )}
                    {pred && phase !== "finished" && (
                      <span className="p-muted" style={{ fontSize: 12 }}>
                        Tahmin gönderildi
                      </span>
                    )}
                    {pred && phase === "finished" && (
                      <span className="p-done-score">
                        {pred.jokerUsed && "🃏 "}
                        {points} puan
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </ParticipantShell>
  );
}
