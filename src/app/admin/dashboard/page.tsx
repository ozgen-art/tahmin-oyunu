import Link from "next/link";
import { assertAdmin } from "@/lib/require-admin";
import { listMatches } from "@/lib/db";
import { adminLogoutAction } from "@/app/actions/admin";
import NewMatchForm from "./NewMatchForm";

const COMPETITION_LABEL: Record<string, string> = {
  UCL: "Şampiyonlar Ligi",
  UEL: "Avrupa Ligi",
};

export default async function AdminDashboardPage() {
  await assertAdmin();
  const matches = await listMatches();

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
        <h2 className="font-semibold">Yeni Maç Ekle</h2>
        <NewMatchForm />
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
