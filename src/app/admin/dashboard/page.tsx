import Link from "next/link";
import { assertAdmin } from "@/lib/require-admin";
import { getLeaderboard, listMatches } from "@/lib/db";
import { adminLogoutAction } from "@/app/actions/admin";
import NewMatchForm from "./NewMatchForm";
import ImportMatchesButton from "./ImportMatchesButton";

const COMPETITION_LABEL: Record<string, string> = {
  UCL: "Şampiyonlar Ligi",
  UEL: "Avrupa Ligi",
};

export default async function AdminDashboardPage() {
  await assertAdmin();
  const [matches, leaderboard] = await Promise.all([listMatches(), getLeaderboard()]);
  const participants = [...leaderboard].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Paneli</h1>
        <form action={adminLogoutAction}>
          <button type="submit" className="text-sm hover:underline cursor-pointer">
            Çıkış
          </button>
        </form>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">API&apos;den Maç İçe Aktar</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          API-Football&apos;un ücretsiz planı sadece bugün/yarın için veri verdiğinden, yeni bir
          UCL/UEL maçını yakalamak için bu butona her gün basmanız gerekir.
        </p>
        <ImportMatchesButton />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Yeni Maç Ekle (Manuel)</h2>
        <NewMatchForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Katılımcılar ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Henüz kimse kayıt olmadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse overflow-hidden rounded-lg border border-black/10 text-sm dark:border-white/15">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5">
                  <th className="px-3 py-2 text-left">İsim</th>
                  <th className="px-3 py-2 text-left">Kayıt Tarihi</th>
                  <th className="px-3 py-2 text-right">Tahmin</th>
                  <th className="px-3 py-2 text-right">Puan</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.participantId} className="border-t border-black/10 dark:border-white/10">
                    <td className="px-3 py-2 font-medium">{p.displayName}</td>
                    <td className="px-3 py-2 text-black/60 dark:text-white/60">
                      {new Date(p.createdAt).toLocaleString("tr-TR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">{p.matchesPredicted}</td>
                    <td className="px-3 py-2 text-right font-semibold">{p.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Maçlar</h2>
        <ul className="flex flex-col gap-2">
          {matches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/admin/dashboard/${match.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-black/10 px-4 py-3 hover:border-indigo-400 dark:border-white/15"
              >
                <span>
                  <span className="mr-2 rounded bg-indigo-600/10 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    {COMPETITION_LABEL[match.competition]}
                  </span>
                  {match.homeTeam} vs {match.awayTeam}
                </span>
                <span className="text-sm text-black/50 dark:text-white/50">
                  {new Date(match.kickoffAt).toLocaleString("tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" · "}
                  {match.status === "finished" ? "Sonuçlandı" : "Bekliyor"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
