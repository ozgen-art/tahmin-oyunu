"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { submitPredictionAction } from "@/app/actions/predictions";
import { teamGradient, teamInitials } from "@/lib/team-visuals";
import type { Competition } from "@/lib/types";

export interface OpenMatchData {
  id: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  kickoffAt: string;
  isJokerEligible: boolean;
  jokerAvailableThisWeek: boolean;
  existing: {
    predictedHomeScore: number | null;
    predictedAwayScore: number | null;
    jokerUsed: boolean;
  } | null;
}

export interface LockedMatchData {
  id: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  kickoffAt: string;
  hasPrediction: boolean;
}

export interface FinishedMatchData {
  id: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  kickoffAt: string;
  finalHomeScore: number | null;
  finalAwayScore: number | null;
  hasPrediction: boolean;
  points: number | null;
  jokerUsed: boolean;
}

const COMPETITION_LABEL: Record<Competition, string> = {
  UCL: "Şampiyonlar Ligi",
  UEL: "Avrupa Ligi",
};

function Crest({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string;
}) {
  if (logoUrl) {
    return (
      <div className="p-crest" style={{ background: "rgba(255,255,255,0.9)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} />
      </div>
    );
  }
  const [c1, c2] = teamGradient(name);
  return (
    <div className="p-crest" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      {teamInitials(name)}
    </div>
  );
}

function formatKickoff(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DraftState {
  home: string;
  away: string;
  joker: boolean;
}

export default function PredictionWizard({
  openMatches,
  lockedMatches,
  finishedMatches,
  initialEditId,
}: {
  openMatches: OpenMatchData[];
  lockedMatches: LockedMatchData[];
  finishedMatches: FinishedMatchData[];
  initialEditId?: string;
}) {
  const [tab, setTab] = useState<"maclar" | "sonuclar">("maclar");
  const [doneIds, setDoneIds] = useState<Set<string>>(
    () => new Set(openMatches.filter((m) => m.existing).map((m) => m.id))
  );
  const emptyDraft: DraftState = { home: "", away: "", joker: false };
  const [savedDrafts, setSavedDrafts] = useState<Record<string, DraftState>>(() => {
    const initial: Record<string, DraftState> = {};
    for (const m of openMatches) {
      if (m.existing) {
        initial[m.id] = {
          home: String(m.existing.predictedHomeScore ?? ""),
          away: String(m.existing.predictedAwayScore ?? ""),
          joker: m.existing.jokerUsed,
        };
      }
    }
    return initial;
  });

  // Aktif (düzenlenen) maç: ?edit= ile belirli bir maç açılmak istenmişse o,
  // yoksa sırayla ilk tamamlanmamış maç. Kart tıklanarak da değiştirilebilir
  // — böylece kaydedilmiş bir tahmin geri açılıp güncellenebilir.
  const firstUndoneId = useMemo(
    () => openMatches.find((m) => !doneIds.has(m.id))?.id ?? null,
    [openMatches, doneIds]
  );
  const [activeIdOverride, setActiveIdOverride] = useState<string | null>(
    () => (initialEditId && openMatches.some((m) => m.id === initialEditId) ? initialEditId : null)
  );
  const activeId = activeIdOverride ?? firstUndoneId;
  const currentMatch = useMemo(
    () => openMatches.find((m) => m.id === activeId) ?? null,
    [openMatches, activeId]
  );

  const [draft, setDraft] = useState<DraftState>(
    () => (currentMatch && savedDrafts[currentMatch.id]) ?? emptyDraft
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const doneCount = doneIds.size;
  const total = openMatches.length;

  const [successId, setSuccessId] = useState<string | null>(null);

  function selectMatch(match: OpenMatchData) {
    setError(null);
    setSuccessId(null);
    setActiveIdOverride(match.id);
    setDraft(savedDrafts[match.id] ?? emptyDraft);
  }

  function handleSave(match: OpenMatchData) {
    setError(null);
    setSuccessId(null);
    const wasAlreadyDone = doneIds.has(match.id);
    const fd = new FormData();
    fd.set("matchId", match.id);
    if (draft.home !== "" || draft.away !== "") {
      fd.set("predictedHomeScore", draft.home);
      fd.set("predictedAwayScore", draft.away);
    }
    if (draft.joker) fd.set("jokerUsed", "on");

    startTransition(async () => {
      const result = await submitPredictionAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedDrafts((prev) => ({ ...prev, [match.id]: draft }));
      setDoneIds((prev) => new Set(prev).add(match.id));

      if (wasAlreadyDone) {
        // Var olan bir tahmin güncellendi — kullanıcıyı başka bir maça
        // savurmadan burada bırak, güncellendiğini göster.
        setSuccessId(match.id);
        return;
      }
      // İlk kez giriliyordu: sıradaki tamamlanmamış maça geç; hepsi tamamsa
      // bu kartta kal.
      const nextUndone = openMatches.find((m) => m.id !== match.id && !doneIds.has(m.id));
      if (nextUndone) {
        setActiveIdOverride(nextUndone.id);
        setDraft(savedDrafts[nextUndone.id] ?? emptyDraft);
      } else {
        setActiveIdOverride(match.id);
        setDraft(draft);
      }
    });
  }

  return (
    <>
      <div className="p-progress-row">
        <div className="p-progress-track">
          <div
            className="p-progress-fill"
            style={{ width: total > 0 ? `${(doneCount / total) * 100}%` : "0%" }}
          />
        </div>
        <div className="p-progress-label">
          {doneCount} / {total} tamamlandı
        </div>
      </div>

      <div className="p-nav" style={{ marginBottom: 16 }}>
        <button type="button" onClick={() => setTab("maclar")} className={tab === "maclar" ? "active" : ""}>
          Maçlar
        </button>
        <button
          type="button"
          onClick={() => setTab("sonuclar")}
          className={tab === "sonuclar" ? "active" : ""}
        >
          Sonuçlar ({finishedMatches.length})
        </button>
      </div>

      {tab === "maclar" ? (
        <>
          {total === 0 && (
            <p className="p-muted" style={{ fontSize: 14 }}>
              Şu an tahmine açık bir maç yok.
            </p>
          )}
          <div className="p-match-list">
            {openMatches.map((m, i) => {
              const isDone = doneIds.has(m.id);
              const isActive = currentMatch?.id === m.id;
              const isNext = !isActive && !isDone && openMatches.findIndex((x) => !doneIds.has(x.id)) + 1 === i;

              if (isActive) {
                const isEditing = isDone;
                return (
                  <div key={m.id} className="p-card active">
                    <div className="p-match-meta">
                      <span>{COMPETITION_LABEL[m.competition]}</span>
                      <span className="p-kickoff">{formatKickoff(m.kickoffAt)}</span>
                    </div>
                    {isEditing && (
                      <p className="p-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 4 }}>
                        Bu maç için tahminini düzenliyorsun.
                      </p>
                    )}
                    <div className="p-teams-row">
                      <div className="p-team">
                        <Crest name={m.homeTeam} logoUrl={m.homeLogoUrl} />
                        <div className="p-team-name">{m.homeTeam}</div>
                      </div>
                      <div className="p-score-inputs">
                        <input
                          type="number"
                          min={0}
                          max={20}
                          inputMode="numeric"
                          placeholder="0"
                          value={draft.home}
                          onChange={(e) => setDraft((d) => ({ ...d, home: e.target.value }))}
                        />
                        <span className="p-score-sep">:</span>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          inputMode="numeric"
                          placeholder="0"
                          value={draft.away}
                          onChange={(e) => setDraft((d) => ({ ...d, away: e.target.value }))}
                        />
                      </div>
                      <div className="p-team">
                        <Crest name={m.awayTeam} logoUrl={m.awayLogoUrl} />
                        <div className="p-team-name">{m.awayTeam}</div>
                      </div>
                    </div>

                    {m.isJokerEligible && (
                      <label
                        className={`p-joker-toggle${!m.jokerAvailableThisWeek ? " disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={draft.joker}
                          disabled={!m.jokerAvailableThisWeek}
                          onChange={(e) => setDraft((d) => ({ ...d, joker: e.target.checked }))}
                        />
                        <span>
                          <strong>🃏 Jokerimi bu maçta kullan</strong> — kazandığın puan 3 katına
                          çıkar.
                          {!m.jokerAvailableThisWeek && (
                            <span className="p-muted" style={{ display: "block", marginTop: 2 }}>
                              Bu haftaki jokerini zaten başka bir maçta kullandın.
                            </span>
                          )}
                        </span>
                      </label>
                    )}

                    {error && <p className="p-error" style={{ marginTop: 10 }}>{error}</p>}
                    {successId === m.id && (
                      <p style={{ marginTop: 10, fontSize: 13, color: "var(--p-teal)" }}>
                        Tahminin güncellendi ✓
                      </p>
                    )}

                    <button
                      type="button"
                      className="p-save-btn"
                      disabled={pending}
                      onClick={() => handleSave(m)}
                    >
                      {pending ? "Kaydediliyor…" : isEditing ? "Güncelle" : "Tahmini Kaydet"}
                    </button>
                  </div>
                );
              }

              if (isDone) {
                const saved = savedDrafts[m.id];
                return (
                  <div
                    key={m.id}
                    className="p-card done"
                    role="button"
                    tabIndex={0}
                    onClick={() => selectMatch(m)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") selectMatch(m);
                    }}
                    style={{ cursor: "pointer" }}
                    title="Tahminini güncellemek için dokun"
                  >
                    <div className="p-done-row">
                      <div>
                        <div className="p-done-teams">
                          <span>{m.homeTeam}</span>
                          <span className="p-muted">vs</span>
                          <span>{m.awayTeam}</span>
                          {saved?.joker && <span title="Joker kullanıldı">🃏</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {saved && (saved.home !== "" || saved.away !== "") && (
                          <span className="p-done-score">
                            {saved.home || 0} : {saved.away || 0}
                          </span>
                        )}
                        <span className="p-done-check">✓</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className="p-card locked"
                  role="button"
                  tabIndex={0}
                  onClick={() => selectMatch(m)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") selectMatch(m);
                  }}
                  style={{ cursor: "pointer" }}
                  title="Bu maç için tahmin girmek üzere dokun"
                >
                  {isNext && <span className="p-up-next-tag">Sırada</span>}
                  <div className="p-lock-row">
                    <span>
                      {m.homeTeam} vs {m.awayTeam}
                    </span>
                    <span className="p-muted" style={{ fontSize: 12 }}>
                      Tahmin et →
                    </span>
                  </div>
                </div>
              );
            })}

            {lockedMatches.length > 0 && (
              <>
                <div className="p-section-title">Kilitlendi (sonuç bekleniyor)</div>
                {lockedMatches.map((m) => (
                  <Link key={m.id} href={`/maclar/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    <div className="p-card locked">
                      <div className="p-lock-row">
                        <span>
                          {m.homeTeam} vs {m.awayTeam}
                          {!m.hasPrediction && " · tahmin girilmedi"}
                        </span>
                        <span className="p-lock-icon">🔒</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>

          {total > 0 && doneCount === total && (
            <div className="p-finished-banner show">
              <h3>Tüm tahminlerin kaydedildi</h3>
              <p>Maç sonuçları geldikçe puanların Sonuçlar sekmesinde güncellenecek.</p>
            </div>
          )}
        </>
      ) : (
        <div className="p-match-list">
          {finishedMatches.length === 0 && (
            <p className="p-muted" style={{ fontSize: 14 }}>
              Henüz sonuçlanan maç yok.
            </p>
          )}
          {finishedMatches.map((m) => (
            <Link key={m.id} href={`/maclar/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div className="p-card done">
                <div className="p-done-row">
                  <div>
                    <div className="p-done-teams">
                      <span>{m.homeTeam}</span>
                      <span className="p-muted">vs</span>
                      <span>{m.awayTeam}</span>
                      {m.jokerUsed && <span title="Joker kullanıldı">🃏</span>}
                    </div>
                    <div className="p-done-scorer">
                      {COMPETITION_LABEL[m.competition]} · {formatKickoff(m.kickoffAt)}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="p-done-score">
                      {m.finalHomeScore} : {m.finalAwayScore}
                    </span>
                    {m.hasPrediction ? (
                      <span className="p-done-score" style={{ color: "var(--p-teal)" }}>
                        +{m.points}
                      </span>
                    ) : (
                      <span className="p-muted" style={{ fontSize: 11.5 }}>
                        tahmin yok
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
