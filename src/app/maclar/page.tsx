import { redirect } from "next/navigation";
import {
  getMatchPhaseSync,
  listMatches,
  listPredictionsForParticipant,
} from "@/lib/db";
import { getJokerDayKey } from "@/lib/joker";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";
import PushToggle from "@/components/PushToggle";
import PredictionWizard, {
  type FinishedMatchData,
  type LockedMatchData,
  type OpenMatchData,
} from "./PredictionWizard";

export default async function MaclarPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/giris");
  const { edit: editMatchId } = await searchParams;

  const [matches, predictions] = await Promise.all([
    listMatches(),
    listPredictionsForParticipant(participant.id),
  ]);
  const predictionByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  const withPhase = matches.map((m) => ({ ...m, phase: getMatchPhaseSync(m) }));
  const openMatchesRaw = withPhase
    .filter((m) => m.phase === "open")
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
  const lockedMatchesRaw = withPhase
    .filter((m) => m.phase === "locked")
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
  const finishedMatchesRaw = withPhase
    .filter((m) => m.phase === "finished")
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());

  // Günlük joker: hangi gün (TSİ) hangi maçta joker kullanılmış.
  const kickoffByMatch = new Map(matches.map((m) => [m.id, m.kickoffAt]));
  const jokerMatchByDay = new Map<string, string>();
  for (const p of predictions) {
    const kickoff = kickoffByMatch.get(p.matchId);
    if (p.jokerUsed && kickoff) jokerMatchByDay.set(getJokerDayKey(kickoff), p.matchId);
  }

  const openMatches: OpenMatchData[] = await Promise.all(
    openMatchesRaw.map(async (m) => {
      const existing = predictionByMatch.get(m.id) ?? null;
      const jokerMatchId = jokerMatchByDay.get(getJokerDayKey(m.kickoffAt));
      // O gün jokerini başka bir maçta kullandıysa bu maçta kapalı.
      const jokerAvailableToday = !jokerMatchId || jokerMatchId === m.id;
      return {
        id: m.id,
        competition: m.competition,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeLogoUrl: m.homeLogoUrl,
        awayLogoUrl: m.awayLogoUrl,
        kickoffAt: m.kickoffAt,
        jokerAvailableToday,
        existing: existing
          ? {
              predictedHomeScore: existing.predictedHomeScore ?? null,
              predictedAwayScore: existing.predictedAwayScore ?? null,
              jokerUsed: existing.jokerUsed,
            }
          : null,
      };
    })
  );

  const lockedMatches: LockedMatchData[] = lockedMatchesRaw.map((m) => ({
    id: m.id,
    competition: m.competition,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeLogoUrl: m.homeLogoUrl,
    awayLogoUrl: m.awayLogoUrl,
    kickoffAt: m.kickoffAt,
    hasPrediction: predictionByMatch.has(m.id),
  }));

  const finishedMatches: FinishedMatchData[] = finishedMatchesRaw.map((m) => {
    const pred = predictionByMatch.get(m.id);
    const points = pred
      ? (pred.resultPointsEarned ?? 0) + (pred.scorePointsEarned ?? 0) + (pred.scorerPointsEarned ?? 0)
      : null;
    return {
      id: m.id,
      competition: m.competition,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeLogoUrl: m.homeLogoUrl,
      awayLogoUrl: m.awayLogoUrl,
      kickoffAt: m.kickoffAt,
      finalHomeScore: m.finalHomeScore ?? null,
      finalAwayScore: m.finalAwayScore ?? null,
      hasPrediction: !!pred,
      points,
      jokerUsed: pred?.jokerUsed ?? false,
    };
  });

  return (
    <ParticipantShell activeNav="maclar">
      <h1 className="p-greeting">
        Hoş geldin, <span>{participant.displayName}</span>
      </h1>
      <p className="p-subtitle">Bu haftanın maçlarını sırayla tahmin et</p>
      <PushToggle />
      <PredictionWizard
        openMatches={openMatches}
        lockedMatches={lockedMatches}
        finishedMatches={finishedMatches}
        initialEditId={editMatchId}
      />
    </ParticipantShell>
  );
}
