import { getLeaderboard } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";

export default async function LiderlikTablosuPage() {
  const [rows, participant] = await Promise.all([getLeaderboard(), getCurrentParticipant()]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Liderlik Tablosu</h1>
      {rows.length === 0 ? (
        <p className="text-black/60 dark:text-white/60">Henüz kimse tahmin yapmadı.</p>
      ) : (
        <table className="w-full border-collapse overflow-hidden rounded-lg border border-black/10 text-sm dark:border-white/15">
          <thead>
            <tr className="bg-black/5 dark:bg-white/5">
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">İsim</th>
              <th className="px-3 py-2 text-right">Puan</th>
              <th className="px-3 py-2 text-right">Sonuçlanan Maç</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.participantId}
                className={`border-t border-black/10 dark:border-white/10 ${
                  row.participantId === participant?.id ? "bg-indigo-600/5" : ""
                }`}
              >
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-medium">
                  {row.displayName}
                  {row.participantId === participant?.id && (
                    <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">(sen)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-semibold">{row.totalPoints}</td>
                <td className="px-3 py-2 text-right text-black/50 dark:text-white/50">
                  {row.matchesFinished}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
