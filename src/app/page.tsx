import Link from "next/link";
import { getCurrentParticipant } from "@/lib/participant-session";

export default async function HomePage() {
  const participant = await getCurrentParticipant();

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <span className="w-fit rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          UEFA Şampiyonlar Ligi &amp; UEFA Avrupa Ligi
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Maçları tahmin et, puan topla, liderlik tablosunda zirveye oyna.
        </h1>
        <p className="max-w-2xl text-black/70 dark:text-white/70">
          Her maç için üç kategoride tahmin yapıyorsun: <strong>maç sonucu</strong> (1 / Berabere / 2),{" "}
          <strong>kesin skor</strong> ve <strong>ilk golü atan oyuncu</strong>. Her seçeneğin puanı,
          o seçeneğin bahis oranından türetilir — riskli tahmin, yüksek puan getirir.
        </p>
        <div className="flex flex-wrap gap-3">
          {participant ? (
            <Link
              href="/maclar"
              className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Maçlara git
            </Link>
          ) : (
            <Link
              href="/giris"
              className="rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              İsim ve PIN ile başla
            </Link>
          )}
          <Link
            href="/liderlik-tablosu"
            className="rounded border border-black/15 px-4 py-2 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Liderlik tablosuna bak
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <RuleCard
          title="Puanlama"
          body="Puan = oran × 10, tam sayıya yuvarlanır. Örn. oran 1.30 → 13 puan, oran 10.00 → 100 puan."
        />
        <RuleCard
          title="Kilitlenme"
          body="Bir maça ilk düdükten (başlama saatinden) sonra tahmin girilemez veya değiştirilemez."
        />
        <RuleCard
          title="Puan hesaplama"
          body="Maç bittiğinde her kategori ayrı ayrı değerlendirilir; doğru tahminin puanı, seçtiğin seçeneğin puanıdır."
        />
      </section>
    </div>
  );
}

function RuleCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="text-sm text-black/70 dark:text-white/70">{body}</p>
    </div>
  );
}
