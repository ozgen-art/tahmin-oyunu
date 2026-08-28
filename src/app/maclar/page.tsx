import Link from "next/link";
import { redirect } from "next/navigation";
import { listMatches, getMatchPhaseSync } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";

const COMPETITION_LABEL: Record<string, string> = {
  UCL: "Şampiyonlar Ligi",
  UEL: "Avrupa Ligi",
};

const PHASE_LABEL: Record<string, string> = {
  open: "Tahmine açık",
  locked: "Kilitli (oynanıyor/oynandı)",
  finished: "Sonuçlandı",
};

export default async function MaclarPage() {
  const participant = await getCurrentParticipant();
  if (!participant) redirect("/giris");

  const matches = await listMatches();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Maçlar</h1>
      {matches.length === 0 && (
        <p className="text-black/60 dark:text-white/60">Henüz eklenmiş bir maç yok.</p>
      )}
      <ul className="flex flex-col gap-3">
        {matches.map((match) => {
          const phase = getMatchPhaseSync(match);
          return (
            <li key={match.id}>
              <Link
                href={`/maclar/${match.id}`}
                className="flex flex-col gap-1 rounded-lg border border-black/10 p-4 transition hover:border-indigo-400 dark:border-white/15"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded bg-indigo-600/10 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
                    {COMPETITION_LABEL[match.competition]}
                  </span>
                  <span
                    className={
                      phase === "open"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-black/50 dark:text-white/50"
                    }
                  >
                    {PHASE_LABEL[phase]}
                  </span>
                </div>
                <div className="font-medium">
                  {match.homeTeam} <span className="text-black/40 dark:text-white/40">vs</span>{" "}
                  {match.awayTeam}
                </div>
                <div className="text-sm text-black/60 dark:text-white/60">
                  {new Date(match.kickoffAt).toLocaleString("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {match.status === "finished" && (
                    <span className="ml-2 font-medium text-black dark:text-white">
                      Sonuç: {match.finalHomeScore}-{match.finalAwayScore}
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
