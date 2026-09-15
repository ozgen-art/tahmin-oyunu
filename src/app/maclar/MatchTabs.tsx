"use client";

import { useState } from "react";
import Link from "next/link";
import type { Match, MatchPhase } from "@/lib/types";

const COMPETITION_LABEL: Record<string, string> = {
  UCL: "Şampiyonlar Ligi",
  UEL: "Avrupa Ligi",
};

const PHASE_LABEL: Record<MatchPhase, string> = {
  open: "Tahmine açık",
  locked: "Kilitli (oynanıyor/oynandı)",
  finished: "Sonuçlandı",
};

interface MatchWithPhase extends Match {
  phase: MatchPhase;
}

function MatchRow({ match }: { match: MatchWithPhase }) {
  return (
    <li>
      <Link
        href={`/maclar/${match.id}`}
        className="flex flex-col gap-1 rounded-lg border border-black/10 p-4 transition hover:border-indigo-400 dark:border-white/15"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-indigo-600/10 px-2 py-0.5 font-semibold text-indigo-700 dark:text-indigo-300">
            {COMPETITION_LABEL[match.competition]}
          </span>
          {match.isJokerEligible && <span title="Joker uygun maç">🃏</span>}
          <span
            className={
              match.phase === "open"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-black/50 dark:text-white/50"
            }
          >
            {PHASE_LABEL[match.phase]}
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
}

export default function MatchTabs({
  upcoming,
  results,
}: {
  upcoming: MatchWithPhase[];
  results: MatchWithPhase[];
}) {
  const [tab, setTab] = useState<"upcoming" | "results">("upcoming");
  const active = tab === "upcoming" ? upcoming : results;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 border-b border-black/10 dark:border-white/15">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "upcoming"
              ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          }`}
        >
          Maçlar ({upcoming.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("results")}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "results"
              ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
              : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          }`}
        >
          Sonuçlar ({results.length})
        </button>
      </div>

      {active.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">
          {tab === "upcoming" ? "Şu an bekleyen bir maç yok." : "Henüz sonuçlanan maç yok."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {active.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </ul>
      )}
    </div>
  );
}
