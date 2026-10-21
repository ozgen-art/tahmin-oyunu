import Link from "next/link";
import { getLeaderboard, listMatches } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";
import {
  formatDayLabel,
  formatShortDayLabel,
  formatWeekLabel,
  getDayKey,
  getWeekStartKey,
  listDayKeys,
  parseDayKey,
  parsePeriod,
  pickReferenceKey,
  PERIOD_LABELS,
  type LeaderboardPeriod,
} from "@/lib/periods";

const PERIODS: LeaderboardPeriod[] = ["gunluk", "haftalik", "aralik", "toplam"];

export default async function LiderlikTablosuPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>;
}) {
  const query = await searchParams;
  const period = parsePeriod(query.donem);
  const [matches, participant] = await Promise.all([listMatches(), getCurrentParticipant()]);

  // Günlük/haftalık: şu anki gün/hafta (TSİ) içinde sonuçlanmış maç varsa o,
  // yoksa sonuçlanmış maçı olan en son gün/hafta gösterilir.
  const finished = matches.filter((m) => m.status === "finished");
  let includeMatch: ((kickoffAt: string) => boolean) | undefined;
  let periodNote: string | null = null;
  if (period === "gunluk") {
    const ref = pickReferenceKey(getDayKey(new Date()), finished.map((m) => getDayKey(m.kickoffAt)));
    includeMatch = (k) => ref !== null && getDayKey(k) === ref;
    periodNote = ref ? `${formatDayLabel(ref)} maçları` : null;
  } else if (period === "haftalik") {
    const ref = pickReferenceKey(
      getWeekStartKey(new Date()),
      finished.map((m) => getWeekStartKey(m.kickoffAt))
    );
    includeMatch = (k) => ref !== null && getWeekStartKey(k) === ref;
    periodNote = ref ? `${formatWeekLabel(ref)} haftası maçları` : null;
  }

  // Tarih aralığı: seçilebilecek günler ilk sonuçlanmış maç gününden (veya en
  // erken maçtan) bugüne / son maç gününe kadar her takvim günüdür.
  let dayOptions: string[] = [];
  let rangeFrom = "";
  let rangeTo = "";
  if (period === "aralik") {
    const allDays = matches.map((m) => getDayKey(m.kickoffAt)).sort();
    const today = getDayKey(new Date());
    const first = allDays[0] ?? today;
    const lastFinished = finished.map((m) => getDayKey(m.kickoffAt)).sort().at(-1) ?? today;
    const last = lastFinished > today ? lastFinished : today;
    dayOptions = listDayKeys(first, last);
    const clamp = (k: string) => (k < first ? first : k > last ? last : k);
    const defaultTo = lastFinished;
    const defaultFrom = clamp(listDayKeys(first, defaultTo).slice(-7)[0] ?? first);
    rangeFrom = clamp(parseDayKey(query.bas) ?? defaultFrom);
    rangeTo = clamp(parseDayKey(query.bit) ?? defaultTo);
    if (rangeFrom > rangeTo) [rangeFrom, rangeTo] = [rangeTo, rangeFrom];
    includeMatch = (k) => {
      const day = getDayKey(k);
      return day >= rangeFrom && day <= rangeTo;
    };
    periodNote =
      rangeFrom === rangeTo
        ? `${formatDayLabel(rangeFrom)} maçları`
        : `${formatShortDayLabel(rangeFrom)} - ${formatShortDayLabel(rangeTo)} arası maçlar`;
  }

  const rows = (await getLeaderboard({ includeMatch })).sort(
    (a, b) => b.totalPoints - a.totalPoints || b.matchesFinished - a.matchesFinished
  );

  return (
    <ParticipantShell activeNav="liderlik">
      <h1 className="p-greeting">Liderlik Tablosu</h1>

      <div className="p-nav" style={{ margin: "12px 0 4px" }}>
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={p === "toplam" ? "/liderlik-tablosu" : `/liderlik-tablosu?donem=${p}`}
            className={p === period ? "active" : ""}
          >
            {PERIOD_LABELS[p]}
          </Link>
        ))}
      </div>
      <p className="p-muted" style={{ fontSize: 12.5, margin: "6px 2px 0" }}>
        {period === "toplam"
          ? "Tüm sonuçlanmış maçlar"
          : periodNote ?? "Bu dönemde henüz sonuçlanmış maç yok"}
      </p>

      {period === "aralik" && (
        <form
          method="get"
          action="/liderlik-tablosu"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10, marginTop: 14 }}
        >
          <input type="hidden" name="donem" value="aralik" />
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span className="p-muted">Başlangıç</span>
            <select name="bas" defaultValue={rangeFrom} className="p-input" style={{ minWidth: 140 }}>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDayLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
            <span className="p-muted">Bitiş</span>
            <select name="bit" defaultValue={rangeTo} className="p-input" style={{ minWidth: 140 }}>
              {dayOptions.map((d) => (
                <option key={d} value={d}>
                  {formatDayLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="p-save-btn" style={{ flexBasis: "100%", width: "100%" }}>
            Göster
          </button>
        </form>
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
                  key={row.participantId}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    background: row.participantId === participant?.id ? "rgba(227,179,92,0.08)" : undefined,
                  }}
                >
                  <td style={{ padding: "10px 14px" }}>{i + 1}</td>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>
                    {row.displayName}
                    {row.participantId === participant?.id && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "var(--p-gold-soft)" }}>(sen)</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--p-gold-soft)" }}>
                    {row.totalPoints}
                  </td>
                  <td className="p-muted" style={{ padding: "10px 14px", textAlign: "right" }}>
                    {row.matchesFinished}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ParticipantShell>
  );
}
