import { getJokerDayKey } from "./joker";

/** Liderlik tablosu dönemleri. Gün/hafta Türkiye saatine (TSİ) göre, hafta Pazartesi başlar. */
export type LeaderboardPeriod = "gunluk" | "haftalik" | "aralik" | "toplam";

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  gunluk: "Günlük",
  haftalik: "Haftalık",
  aralik: "Tarih Aralığı",
  toplam: "Toplam",
};

export function parsePeriod(value: string | undefined): LeaderboardPeriod {
  return value === "gunluk" || value === "haftalik" || value === "aralik" ? value : "toplam";
}

/** Bir anın TSİ gününe ait anahtar (ör. "2026-10-21"). */
export function getDayKey(dateInput: string | Date): string {
  return getJokerDayKey(dateInput);
}

/** Bir gün anahtarının (YYYY-MM-DD) ait olduğu haftanın Pazartesi'sinin gün anahtarı. */
export function weekStartFromDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay() || 7; // Pazartesi=1 .. Pazar=7
  date.setUTCDate(date.getUTCDate() - (dow - 1));
  return date.toISOString().slice(0, 10);
}

/** O anın ait olduğu haftanın Pazartesi'sinin gün anahtarı (ör. "2026-10-19"). */
export function getWeekStartKey(dateInput: string | Date): string {
  return weekStartFromDayKey(getDayKey(dateInput));
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

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Geçerli bir gün anahtarı (YYYY-MM-DD) ise döner, değilse null. */
export function parseDayKey(value: string | undefined): string | null {
  if (!value || !DAY_KEY_RE.test(value)) return null;
  return Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) ? null : value;
}

/** `fromKey`..`toKey` (dahil) arasındaki tüm günlerin anahtarları. */
export function listDayKeys(fromKey: string, toKey: string): string[] {
  const keys: string[] = [];
  const cur = new Date(`${fromKey}T12:00:00Z`);
  const end = new Date(`${toKey}T12:00:00Z`);
  while (cur <= end && keys.length < 400) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
}

/** "15 Eylül" */
export function formatShortDayLabel(dayKey: string): string {
  return dayFmt(new Date(`${dayKey}T12:00:00Z`), { day: "numeric", month: "long" });
}
