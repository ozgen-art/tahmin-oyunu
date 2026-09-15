/**
 * Haftalık "joker": bir katılımcı hafta başına en fazla bir tahminini
 * jokerli oynayabilir — sadece Galatasaray / Fenerbahçe / Beşiktaş /
 * Trabzonspor'un oynadığı bir maçta. Jokerli tahminin kazandığı toplam
 * puan (maç sonucu + skor + ilk gol) 3 katına çıkar.
 */

export const JOKER_MULTIPLIER = 3;

const JOKER_TEAM_KEYWORDS = ["galatasaray", "fenerbahce", "besiktas", "trabzonspor"];

function normalizeTeamName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Takım ismi büyük dörtlüden (GS/FB/BJK/TS) biri mi — aksan/yazım farkına toleranslı. */
export function isJokerEligibleTeam(teamName: string): boolean {
  const normalized = normalizeTeamName(teamName);
  return JOKER_TEAM_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export function isJokerEligibleMatch(homeTeam: string, awayTeam: string): boolean {
  return isJokerEligibleTeam(homeTeam) || isJokerEligibleTeam(awayTeam);
}

/**
 * ISO 8601 hafta anahtarı (ör. "2026-W37"). Pazartesi hafta başlangıcı,
 * UTC üzerinden hesaplanır — bir maçın hangi "haftaya" ait sayılacağını
 * kickoff_at'ten belirlemek için kullanılır.
 */
export function getIsoWeekKey(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Pazartesi=1 .. Pazar=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // o haftanın Perşembe'si
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
