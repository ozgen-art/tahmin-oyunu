/**
 * Günlük "joker": bir katılımcı, maçın Türkiye saatiyle oynandığı gün başına
 * en fazla bir tahminini jokerli oynayabilir — herhangi bir maçta, istediği
 * maçı kendisi seçer. Jokerli tahminin kazandığı toplam puan (maç sonucu +
 * skor) 3 katına çıkar.
 */

export const JOKER_MULTIPLIER = 3;

const JOKER_TIME_ZONE = "Europe/Istanbul";

/**
 * Maçın hangi "joker gününe" ait olduğunu belirleyen anahtar (ör. "2026-10-15").
 * kickoff_at'in Türkiye saatindeki takvim gününe göre hesaplanır.
 */
export function getJokerDayKey(dateInput: string | Date): string {
  // "en-CA" yerel ayarı YYYY-MM-DD biçimi verir.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JOKER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateInput));
}
