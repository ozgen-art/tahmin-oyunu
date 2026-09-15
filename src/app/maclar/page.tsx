import { redirect } from "next/navigation";
import { listMatches, getMatchPhaseSync } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import MatchTabs from "./MatchTabs";

export default async function MaclarPage() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/giris");

  const matches = await listMatches();
  const withPhase = matches.map((match) => ({ ...match, phase: getMatchPhaseSync(match) }));

  // Tahmine açık maçlar en üstte (kickoff'a en yakın olan önce), sonra
  // kilitli (oynanıyor/sonuç bekleyen) maçlar.
  const upcoming = withPhase
    .filter((m) => m.phase !== "finished")
    .sort((a, b) => {
      if (a.phase !== b.phase) return a.phase === "open" ? -1 : 1;
      return new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();
    });

  // Sonuçlanan maçlar: en yeni sonuç en üstte.
  const results = withPhase
    .filter((m) => m.phase === "finished")
    .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Maçlar</h1>
      {matches.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">Henüz eklenmiş bir maç yok.</p>
      ) : (
        <MatchTabs upcoming={upcoming} results={results} />
      )}
    </div>
  );
}
