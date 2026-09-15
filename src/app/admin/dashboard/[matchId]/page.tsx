import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/require-admin";
import { getMatchWithOptions } from "@/lib/db";
import {
  DeleteMatchButton,
  EditMatchForm,
  FinalizeForm,
  ResultOddsForm,
  ScoreOddsForm,
} from "./AdminMatchForms";

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  await assertAdmin();
  const { matchId } = await params;
  const match = await getMatchWithOptions(matchId);
  if (!match) notFound();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {match.homeTeam} vs {match.awayTeam}
          {match.isJokerEligible && (
            <span className="ml-2 align-middle text-base" title="Joker uygun maç (GS/FB/BJK/TS)">
              🃏
            </span>
          )}
        </h1>
        <DeleteMatchButton matchId={match.id} />
      </div>

      <Section title="Maç Bilgisi">
        <EditMatchForm match={match} />
      </Section>

      <Section title="Maç Sonucu Oranları (1 / X / 2)">
        <ResultOddsForm
          matchId={match.id}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          options={match.resultOptions}
        />
      </Section>

      <Section title="Kesin Skor Oranları (kullanıcıya gösterilmez)">
        <p className="-mt-1 text-xs text-black/50 dark:text-white/50">
          Kullanıcılar artık skoru elle giriyor; bu liste sadece dahili puan hesaplaması için
          referans/kalibrasyon verisi. Burada olmayan bir skor tahmin edilirse, sistem buradaki
          oranlardan optimum bir oran kestirip puanı ona göre hesaplar.
        </p>
        <ScoreOddsForm matchId={match.id} options={match.scoreOptions} />
      </Section>

      <Section title="Maçı Sonuçlandır">
        <FinalizeForm matchId={match.id} match={match} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-black/10 pt-6 dark:border-white/15">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
