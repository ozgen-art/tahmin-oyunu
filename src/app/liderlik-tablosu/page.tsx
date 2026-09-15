import { getLeaderboard } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";

export default async function LiderlikTablosuPage() {
  const [rows, participant] = await Promise.all([getLeaderboard(), getCurrentParticipant()]);

  return (
    <ParticipantShell activeNav="liderlik">
      <h1 className="p-greeting">Liderlik Tablosu</h1>
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
