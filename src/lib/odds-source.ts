/**
 * ---------------------------------------------------------------------------
 * CANLI VERİ ENTEGRASYON NOKTASI
 * ---------------------------------------------------------------------------
 * Şu an bu proje maçları ve oranları admin panelinden manuel girilen /
 * `src/lib/db.ts` içindeki örnek (mock) verilerden alıyor.
 *
 * Gerçek bir maç takvimi + bahis oranı API'sine (ör. API-Football, Odds API,
 * Opta vb.) bağlanmak istendiğinde, aşağıdaki tipleri dolduran bir fetch
 * fonksiyonu yazıp `src/app/actions/admin.ts` içindeki "Maçları API'den
 * içe aktar" adımına bağlamak yeterli olacak şekilde tasarlandı.
 *
 * Sadece Şampiyonlar Ligi (UCL) ve UEFA Avrupa Ligi (UEL) maçları
 * kullanılmalı — API'den gelen competition/league id'sini buna göre
 * filtreleyin.
 * ---------------------------------------------------------------------------
 */
import type { Competition, TeamSide } from "./types";

export interface ExternalMatch {
  externalId: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string; // ISO datetime
  result1x2Odds: { home: number; draw: number; away: number };
  correctScoreOdds: Array<{ homeScore: number; awayScore: number; odds: number }>;
  firstScorerOdds: Array<{ playerName: string; teamSide: TeamSide; odds: number }>;
}

/**
 * TODO: Gerçek API bağlandığında bu fonksiyonu implemente edin.
 * Şimdilik entegrasyon henüz kurulmadığı için boş dizi döner; sistem
 * admin panelinden manuel girilen / seed edilen örnek verilerle çalışmaya
 * devam eder.
 */
export async function fetchUpcomingMatchesFromLiveApi(): Promise<ExternalMatch[]> {
  return [];
}
