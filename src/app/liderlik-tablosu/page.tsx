import { getLeaderboardData } from "@/lib/db";
import { getCurrentParticipant } from "@/lib/participant-session";
import ParticipantShell from "@/components/ParticipantShell";
import LeaderboardTabs from "./LeaderboardTabs";
import { getDayKey, listDayKeys, parseDayKey, parsePeriod } from "@/lib/periods";

export default async function LiderlikTablosuPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string; bas?: string; bit?: string }>;
}) {
  const query = await searchParams;
  const [data, participant] = await Promise.all([getLeaderboardData(), getCurrentParticipant()]);

  // Tarih listesi: ilk maç gününden bugüne (veya son sonuçlanmış güne) kadar.
  const todayKey = getDayKey(new Date());
  const firstDay = data.firstMatchDay ?? todayKey;
  const lastFinished = data.finishedDays.at(-1) ?? todayKey;
  const lastDay = lastFinished > todayKey ? lastFinished : todayKey;

  // Varsayılan aralık: son 7 maç günü. URL'deki ?bas/?bit geçerliyse o kullanılır.
  const clamp = (k: string) => (k < firstDay ? firstDay : k > lastDay ? lastDay : k);
  const defaultFrom = listDayKeys(firstDay, lastFinished).slice(-7)[0] ?? firstDay;
  const initialFrom = clamp(parseDayKey(query.bas) ?? defaultFrom);
  const initialTo = clamp(parseDayKey(query.bit) ?? lastFinished);

  return (
    <ParticipantShell activeNav="liderlik">
      <h1 className="p-greeting">Liderlik Tablosu</h1>
      <LeaderboardTabs
        participants={data.participants}
        entries={data.entries}
        finishedDays={data.finishedDays}
        firstDay={firstDay}
        lastDay={lastDay}
        todayKey={todayKey}
        currentParticipantId={participant?.id ?? null}
        initialPeriod={parsePeriod(query.donem)}
        initialFrom={initialFrom}
        initialTo={initialTo}
      />
    </ParticipantShell>
  );
}
