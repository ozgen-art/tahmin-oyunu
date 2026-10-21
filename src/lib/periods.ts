import { getJokerDayKey } from "./joker";

/** Liderlik tablosu dönemleri. Gün/hafta Türkiye saatine (TSİ) göre, hafta Pazartesi başlar. */
export type LeaderboardPeriod = "gunluk" | "haftalik" | "toplam";

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  gunluk: "Günlük",
  haftalik: "Haftalık",
  toplam: "Toplam",
};

export function parsePeriod(value: string | undefined): LeaderboardPeriod {
  return value === "gunluk" || value === "haftalik" ? value : "toplam";
}

/** Bir anın TSİ gününe ait anahtar (ör. "2026-10-21"). */
export function getDayKey(dateInput: string | Date): string {
  return getJokerDayKey(dateInput);
}

/** O günün ait olduğu haftanın Pazartesi'sinin gün anahtarı (ör. "2026-10-19"). */
export function getWeekStartKey(dateInput: string | Date): string {
  const [y, m, d] = getDayKey(dateInput).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7; // Pazartesi=1 .. Pazar=7
  date.setUTCDate(date.getUTCDate() - (dow - 1));
  return date.toISOString().slice(0, 10);
}

const dayFmt = (date: Date, opts: Intl.DateTimeFormatOptions) =>
  date.toLocaleDateString("tr-TR", { timeZone: "UTC", ...opts });

/** "21 Ekim Çarşamba" */
export function formatDayLabel(dayKey: string): string {
  return dayFmt(new Date(`${dayKey}T12:00:00Z`), { day: "numeric", month: "long", weekday: "long" });
}

/** "19 - 25 Ekim" ya da "26 Ekim - 1 Kasım" */
export function formatWeekLabel(weekStartKey: string): string {
  const start = new Date(`${weekStartKey}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const startMonth = dayFmt(start, { month: "long" });
  const endMonth = dayFmt(end, { month: "long" });
  const startDay = dayFmt(start, { day: "numeric" });
  const endDay = dayFmt(end, { day: "numeric" });
  return startMonth === endMonth
    ? `${startDay} - ${endDay} ${endMonth}`
    : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

/**
 * Hangi dönemin gösterileceğini seçer: şu anki dönemde (bugün / bu hafta) en az
 * bir maç sonuçlanmışsa o, yoksa sonuçlanmış maçı olan en son dönem.
 * Hiç sonuçlanmış maç yoksa null.
 */
export function pickReferenceKey(currentKey: string, finishedKeys: string[]): string | null {
  if (finishedKeys.length === 0) return null;
  if (finishedKeys.includes(currentKey)) return currentKey;
  return [...finishedKeys].sort().at(-1) ?? null;
}
