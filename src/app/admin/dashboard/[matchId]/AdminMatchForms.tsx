"use client";

import { useActionState } from "react";
import {
  deleteMatchAction,
  finalizeMatchAction,
  reopenMatchAction,
  setResultOddsAction,
  setScoreOddsAction,
  setScorerOddsAction,
  updateMatchAction,
  type AdminActionState,
} from "@/app/actions/admin";
import type { Match, ResultOption, ScoreOption, ScorerOption } from "@/lib/types";

const emptyState: AdminActionState = {};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditMatchForm({ match }: { match: Match }) {
  const [state, formAction, pending] = useActionState(updateMatchAction, emptyState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="matchId" value={match.id} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Kategori</label>
        <select
          name="competition"
          defaultValue={match.competition}
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        >
          <option value="UCL">UEFA Şampiyonlar Ligi</option>
          <option value="UEL">UEFA Avrupa Ligi</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Maç tarihi/saati</label>
        <input
          type="datetime-local"
          name="kickoffAt"
          defaultValue={toDatetimeLocalValue(match.kickoffAt)}
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Ev sahibi takım</label>
        <input
          name="homeTeam"
          defaultValue={match.homeTeam}
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Deplasman takımı</label>
        <input
          name="awayTeam"
          defaultValue={match.awayTeam}
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      {state.error && <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="sm:col-span-2 text-sm text-emerald-600 dark:text-emerald-400">Kaydedildi.</p>
      )}
      <div className="sm:col-span-2">
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}

export function ResultOddsForm({
  matchId,
  homeTeam,
  awayTeam,
  options,
}: {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  options: ResultOption[];
}) {
  const [state, formAction, pending] = useActionState(setResultOddsAction, emptyState);
  const byOutcome = Object.fromEntries(options.map((o) => [o.outcome, o]));
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="matchId" value={matchId} />
      <OddsField label={`${homeTeam} kazanır`} name="homeOdds" defaultValue={byOutcome.home?.odds} />
      <OddsField label="Berabere" name="drawOdds" defaultValue={byOutcome.draw?.odds} />
      <OddsField label={`${awayTeam} kazanır`} name="awayOdds" defaultValue={byOutcome.away?.odds} />
      {state.error && <p className="sm:col-span-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="sm:col-span-3 text-sm text-emerald-600 dark:text-emerald-400">Oranlar kaydedildi.</p>
      )}
      <div className="sm:col-span-3">
        <SaveButton pending={pending} />
      </div>
    </form>
  );
}

function OddsField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <input
        name={name}
        type="text"
        inputMode="decimal"
        placeholder="ör. 2.30"
        defaultValue={defaultValue ?? ""}
        className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
    </div>
  );
}

function optionsToText(options: ScoreOption[]): string {
  return options.map((o) => `${o.homeScore}-${o.awayScore},${o.odds}`).join("\n");
}

export function ScoreOddsForm({ matchId, options }: { matchId: string; options: ScoreOption[] }) {
  const [state, formAction, pending] = useActionState(setScoreOddsAction, emptyState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <p className="text-xs text-black/50 dark:text-white/50">
        Her satıra bir seçenek: <code>EvSkoru-DeplasmanSkoru,Oran</code> — örn. <code>2-1,8.5</code>.
        Kaydettiğinde bu liste öncekinin tamamen yerine geçer.
      </p>
      <textarea
        name="scoreRows"
        rows={8}
        defaultValue={optionsToText(options)}
        className="rounded border border-black/15 bg-transparent px-3 py-2 font-mono text-sm dark:border-white/20"
      />
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Skor seçenekleri kaydedildi.</p>
      )}
      <SaveButton pending={pending} />
    </form>
  );
}

function scorerOptionsToText(options: ScorerOption[]): string {
  const sideLabel = { home: "ev", away: "deplasman", none: "yok" } as const;
  return options.map((o) => `${o.playerName},${sideLabel[o.teamSide]},${o.odds}`).join("\n");
}

export function ScorerOddsForm({ matchId, options }: { matchId: string; options: ScorerOption[] }) {
  const [state, formAction, pending] = useActionState(setScorerOddsAction, emptyState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="matchId" value={matchId} />
      <p className="text-xs text-black/50 dark:text-white/50">
        Her satıra bir seçenek: <code>Oyuncu Adı,taraf,Oran</code> — taraf: ev / deplasman / yok —
        örn. <code>Kylian Mbappé,ev,3.25</code> veya <code>Gol olmaz,yok,6</code>. Kaydettiğinde bu
        liste öncekinin tamamen yerine geçer.
      </p>
      <textarea
        name="scorerRows"
        rows={8}
        defaultValue={scorerOptionsToText(options)}
        className="rounded border border-black/15 bg-transparent px-3 py-2 font-mono text-sm dark:border-white/20"
      />
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Oyuncu seçenekleri kaydedildi.</p>
      )}
      <SaveButton pending={pending} />
    </form>
  );
}

export function FinalizeForm({
  matchId,
  scorerOptions,
  match,
}: {
  matchId: string;
  scorerOptions: ScorerOption[];
  match: Match;
}) {
  const [state, formAction, pending] = useActionState(finalizeMatchAction, emptyState);
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="matchId" value={matchId} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Ev sahibi skoru</label>
        <input
          type="number"
          name="finalHomeScore"
          min={0}
          defaultValue={match.finalHomeScore}
          required
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Deplasman skoru</label>
        <input
          type="number"
          name="finalAwayScore"
          min={0}
          defaultValue={match.finalAwayScore}
          required
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">İlk golü atan</label>
        <select
          name="finalScorerOptionId"
          defaultValue={match.finalScorerOptionId ?? ""}
          className="rounded border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        >
          <option value="">— seç —</option>
          {scorerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.playerName}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="sm:col-span-3 text-sm text-red-600 dark:text-red-400">{state.error}</p>}
      {state.success && (
        <p className="sm:col-span-3 text-sm text-emerald-600 dark:text-emerald-400">
          Maç sonuçlandırıldı, puanlar hesaplandı.
        </p>
      )}
      <div className="sm:col-span-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Maçı Sonuçlandır ve Puanları Hesapla"}
        </button>
        {match.status === "finished" && (
          <form action={reopenMatchAction}>
            <input type="hidden" name="matchId" value={matchId} />
            <button type="submit" className="text-sm text-black/50 hover:underline dark:text-white/50">
              Sonucu geri al
            </button>
          </form>
        )}
      </div>
    </form>
  );
}

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-fit rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
    >
      {pending ? "Kaydediliyor…" : "Kaydet"}
    </button>
  );
}

export function DeleteMatchButton({ matchId }: { matchId: string }) {
  return (
    <form
      action={deleteMatchAction}
      onSubmit={(e) => {
        if (!confirm("Bu maçı ve tüm tahminleri silmek istediğine emin misin?")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="matchId" value={matchId} />
      <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
        Maçı Sil
      </button>
    </form>
  );
}
