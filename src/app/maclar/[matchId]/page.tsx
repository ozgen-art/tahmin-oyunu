import { notFound, redirect } from "next/navigation";
import { getMatchPhaseSync, getMatchWithOptions, getPrediction } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import PredictionForm from "./PredictionForm";
import PredictionSummary from "./PredictionSummary";

const COMPETITION_LABEL: Record<string, string> = {
  UCL: "UEFA Şampiyonlar Ligi",
  UEL: "UEFA Avrupa Ligi",
};

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

  const existing = await getPrediction(participant.id, matchId);
  const phase = getMatchPhaseSync(match);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          {COMPETITION_LABEL[match.competition]}
        </span>
        <h1 className="text-2xl font-bold">
          {match.homeTeam} <span className="text-black/40 dark:text-white/40">vs</span>{" "}
          {match.awayTeam}
        </h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          {new Date(match.kickoffAt).toLocaleString("tr-TR", { dateStyle: "full", timeStyle: "short" })}
        </p>
        {match.status === "finished" && (
          <p className="mt-2 text-lg font-semibold">
            Maç Sonucu: {match.homeTeam} {match.finalHomeScore}-{match.finalAwayScore}{" "}
            {match.awayTeam}
          </p>
        )}
      </div>

      {phase === "open" ? (
        <PredictionForm match={match} existing={existing} />
      ) : (
        <PredictionSummary match={match} existing={existing} />
      )}
    </div>
  );
}
