import { notFound, redirect } from "next/navigation";
import { getMatchPhaseSync, getMatchWithOptions, getPrediction } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";
import PredictionSummary from "./PredictionSummary";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/giris");

  const match = await getMatchWithOptions(matchId);
  if (!match) notFound();

  const phase = getMatchPhaseSync(match);
  // Tahmin girişi/güncellemesi /maclar'daki sihirbazda yapılıyor — bu maçı
  // düzenleme modunda açması için ?edit= ile yönlendiriyoruz.
  if (phase === "open") redirect(`/maclar?edit=${matchId}`);

  const existing = await getPrediction(participant.id, matchId);

  return (
    <ParticipantShell activeNav="maclar">
      <div style={{ marginBottom: 20 }}>
        <span className="p-scorer-label">
          {match.competition === "UCL" ? "UEFA Şampiyonlar Ligi" : "UEFA Avrupa Ligi"}
        </span>
        <h1 className="p-greeting" style={{ marginTop: 4 }}>
          {match.homeTeam} <span className="p-muted">vs</span> {match.awayTeam}
        </h1>
        <p className="p-subtitle" style={{ marginBottom: 4 }}>
          {new Date(match.kickoffAt).toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" })}
        </p>
        {match.status === "finished" && (
          <p style={{ fontFamily: "var(--font-sora)", fontWeight: 700, fontSize: 18 }}>
            Maç Sonucu: {match.homeTeam} {match.finalHomeScore}-{match.finalAwayScore}{" "}
            {match.awayTeam}
          </p>
        )}
      </div>
      <PredictionSummary match={match} existing={existing} />
    </ParticipantShell>
  );
}
