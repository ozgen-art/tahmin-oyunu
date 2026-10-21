"use client";

import { useMemo, useState } from "react";
import {
  formatDayLabel,
  formatShortDayLabel,
  formatWeekLabel,
  listDayKeys,
  pickReferenceKey,
  weekStartFromDayKey,
  PERIOD_LABELS,
  type LeaderboardPeriod,
} from "@/lib/periods";

const PERIODS: LeaderboardPeriod[] = ["gunluk", "haftalik", "aralik", "toplam"];

interface Props {
  participants: Array<{ id: string; name: string }>;
  entries: Array<{ p: string; d: string; pts: number }>;
  finishedDays: string[];
  /** Tarih listesinin ilk / son günü (YYYY-MM-DD, TSİ). */
  firstDay: string;
  lastDay: string;
  todayKey: string;
  currentParticipantId: string | null;
  initialPeriod: LeaderboardPeriod;
  initialFrom: string;
  initialTo: string;
}

export default function LeaderboardTabs({
  participants,
  entries,
  finishedDays,
  firstDay,
  lastDay,
  todayKey,
  currentParticipantId,
  initialPeriod,
  initialFrom,
  initialTo,
}: Props) {
  const [period, setPeriod] = useState<LeaderboardPeriod>(initialPeriod);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const dayOptions = useMemo(() => listDayKeys(firstDay, lastDay), [firstDay, lastDay]);

  // Seçili döneme göre hangi günlerin sayılacağı + etiket.
  const { includeDay, note } = useMemo(() => {
    if (period === "gunluk") {
      const ref = pickReferenceKey(todayKey, finishedDays);
      return {
        includeDay: (d: string) => ref !== null && d === ref,
        note: ref ? `${formatDayLabel(ref)} maçları` : null,
      };
    }
    if (period === "haftalik") {
      const ref = pickReferenceKey(weekStartFromDayKey(todayKey), finishedDays.map(weekStartFromDayKey));
      return {
        includeDay: (d: string) => ref !== null && weekStartFromDayKey(d) === ref,
        note: ref ? `${formatWeekLabel(ref)} haftası maçları` : null,
      };
    }
    if (period === "aralik") {
      const [a, b] = from <= to ? [from, to] : [to, from];
      return {
        includeDay: (d: string) => d >= a && d <= b,
        note: a === b ? `${formatDayLabel(a)} maçları` : `${formatShortDayLabel(a)} - ${formatShortDayLabel(b)} arası maçlar`,
      };
    }
    return { includeDay: () => true, note: "Tüm sonuçlanmış maçlar" };
  }, [period, from, to, todayKey, finishedDays]);

  const rows = useMemo(() => {
    const byId = new Map(participants.map((p) => [p.id, { id: p.id, name: p.name, points: 0, matches: 0 }]));
    for (const e of entries) {
      if (!includeDay(e.d)) continue;
      const row = byId.get(e.p);
      if (!row) continue;
      row.points += e.pts;
      row.matches += 1;
    }
    return [...byId.values()].sort((a, b) => b.points - a.points || b.matches - a.matches);
  }, [participants, entries, includeDay]);

  // Adres çubuğunu güncelle (sayfa yenilenmeden) — link paylaşılabilsin.
  function syncUrl(nextPeriod: LeaderboardPeriod, nextFrom: string, nextTo: string) {
    const params = new URLSearchParams();
    if (nextPeriod !== "toplam") params.set("donem", nextPeriod);
    if (nextPeriod === "aralik") {
      params.set("bas", nextFrom);
      params.set("bit", nextTo);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/liderlik-tablosu?${qs}` : "/liderlik-tablosu");
  }

  function selectPeriod(next: LeaderboardPeriod) {
    setPeriod(next);
    syncUrl(next, from, to);
  }

  function changeFrom(value: string) {
    setFrom(value);
    syncUrl("aralik", value, to);
  }

  function changeTo(value: string) {
    setTo(value);
    syncUrl("aralik", from, value);
  }

  return (
    <>
      <div className="p-nav" style={{ margin: "12px 0 4px" }}>
        {PERIODS.map((p) => (
          <button key={p} type="button" className={p === period ? "active" : ""} onClick={() => selectPeriod(p)}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <p className="p-muted" style={{ fontSize: 12.5, margin: "6px 2px 0" }}>
        {note ?? "Bu dönemde henüz sonuçlanmış maç yok"}
      </p>

      {period === "aralik" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span className="p-muted">Başlangıç</span>
            <select
              value={from}
              onChange={(e) => changeFrom(e.target.value)}
              className="p-input"
              style={{ minWidth: 140 }}
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDayLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span className="p-muted">Bitiş</span>
            <select
              value={to}
              onChange={(e) => changeTo(e.target.value)}
              className="p-input"
              style={{ minWidth: 140 }}
            >
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDayLabel(d)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="p-muted" style={{ fontSize: 14 }}>
          Henüz kimse tahmin yapmadı.
        </p>
      ) : (
        <div className="p-card" style={{ padding: 0, overflow: "hidden", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>#</th>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>İsim</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Puan</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Maç</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    background: row.id === currentParticipantId ? "rgba(227,179,92,0.08)" : undefined,
                  }}
                >
                  <td style={{ padding: "10px 14px" }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                    {row.name}
                    {row.id === currentParticipantId && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "var(--p-gold-soft)" }}>(sen)</span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "var(--p-gold-soft)",
                    }}
                  >
                    {row.points}
                  </td>
                  <td className="p-muted" style={{ padding: "10px 14px", textAlign: "right" }}>
                    {row.matches}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
