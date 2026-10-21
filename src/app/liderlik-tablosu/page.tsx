import Link from "next/link";
import { getLeaderboard, listMatches } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";
import {
  formatDayLabel,
  formatWeekLabel,
  getDayKey,
  getWeekStartKey,
  parsePeriod,
  pickReferenceKey,
  PERIOD_LABELS,
  type LeaderboardPeriod,
} from "@/lib/periods";

const PERIODS: LeaderboardPeriod[] = ["gunluk", "haftalik", "toplam"];

export default async function LiderlikTablosuPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string }>;
}) {
  const period = parsePeriod((await searchParams).donem);
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
