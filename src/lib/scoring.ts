import type { Outcome } from "./types";

/**
 * Bahis oranını tam sayı puana çevirir: oran x 10, en yakın tam sayıya
 * yuvarlanır. Örn: 1.30 -> 13, 10.00 -> 100, 2.75 -> 28.
 */
export function oddsToPoints(odds: number): number {
  if (!Number.isFinite(odds) || odds <= 0) {
    throw new Error("Geçersiz oran");
  }
  return Math.max(1, Math.round(odds * 10));
}

/** Skordan maç sonucunu (1 / X / 2) türetir. */
export function deriveWinner(homeScore: number, awayScore: number): Outcome {
  if (homeScore > awayScore) return "home";
  if (homeScore < awayScore) return "away";
  return "draw";
}

export function formatOutcome(outcome: Outcome): string {
  switch (outcome) {
    case "home":
      return "Ev Sahibi";
    case "away":
      return "Deplasman";
    case "draw":
      return "Berabere";
  }
}

// ---------------------------------------------------------------------------
// Serbest skor tahmini puanlaması
// ---------------------------------------------------------------------------
// Kullanıcı artık sabit bir listeden değil, elle (ör. "3-2") skor giriyor.
// Girdiği skorun oranı bizde varsa (score_options — API/admin tarafından
// çekilmiş en olası ~8 skor) onu kullanırız. Yoksa, bildiğimiz skorlardan
// basit bir Poisson modeli kalibre edip "optimum" (tahmini adil) bir oran
// üretiriz. Bu sadece dahili puanlama için — kullanıcıya hiçbir oran/puan
// gösterilmez.

interface KnownScore {
  homeScore: number;
  awayScore: number;
  odds: number;
}

function poissonPmf(k: number, lambda: number): number {
  if (k < 0) return 0;
  if (k > 12) return 1e-6; // pratikte imkansıza yakın; taşmayı/aşırı puanı önler
  let factorial = 1;
  for (let i = 2; i <= k; i++) factorial *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial;
}

/** Bilinen skorlardan (oran-ağırlıklı ortalama ile) beklenen gol sayılarını
 * (λ) kestirir. Hiç bilinen skor yoksa genel lig ortalamasına düşer. */
function estimateLambdas(knownScores: KnownScore[]): { lambdaHome: number; lambdaAway: number } {
  if (knownScores.length === 0) {
    return { lambdaHome: 1.35, lambdaAway: 1.1 }; // genel ev sahibi avantajlı ortalama
  }
  let weightSum = 0;
  let homeSum = 0;
  let awaySum = 0;
  for (const s of knownScores) {
    const weight = 1 / s.odds; // düşük oran = yüksek olasılık = yüksek ağırlık
    weightSum += weight;
    homeSum += s.homeScore * weight;
    awaySum += s.awayScore * weight;
  }
  return {
    lambdaHome: Math.max(0.15, homeSum / weightSum),
    lambdaAway: Math.max(0.15, awaySum / weightSum),
  };
}

/**
 * Verilen (homeScore, awayScore) skoru bilinen skorlardan biriyse gerçek
 * oranını kullanır; değilse Poisson modeliyle "optimum" bir oran kestirip
 * ona göre puan üretir. Bilinen oranlardaki ortalama kitapçı payı
 * (implied prob / Poisson prob) kestirilen skora da uygulanarak tutarlı bir
 * ölçek sağlanır.
 */
export function estimateScorePoints(
  homeScore: number,
  awayScore: number,
  knownScores: KnownScore[]
): number {
  const exact = knownScores.find((s) => s.homeScore === homeScore && s.awayScore === awayScore);
  if (exact) return oddsToPoints(exact.odds);

  const { lambdaHome, lambdaAway } = estimateLambdas(knownScores);
  const rawProb = poissonPmf(homeScore, lambdaHome) * poissonPmf(awayScore, lambdaAway);

  let marginScale = 1;
  if (knownScores.length > 0) {
    let ratioSum = 0;
    let count = 0;
    for (const s of knownScores) {
      const poissonProb = poissonPmf(s.homeScore, lambdaHome) * poissonPmf(s.awayScore, lambdaAway);
      if (poissonProb > 0) {
        ratioSum += 1 / s.odds / poissonProb;
        count += 1;
      }
    }
    if (count > 0) marginScale = ratioSum / count;
  }

  const impliedProb = Math.min(0.99, Math.max(1e-6, rawProb * marginScale));
  const estimatedOdds = Math.max(1.01, 1 / impliedProb);
  return Math.min(300, oddsToPoints(estimatedOdds));
}

export type ScorePointsTier = "exact" | "margin" | "partial" | "none";

export interface ScorePointsResult {
  points: number;
  tier: ScorePointsTier;
}

/**
 * Skor tahmini puanlaması, dört kademeli:
 *  - "exact": skor birebir tuttu -> tam puan
 *  - "margin": skor tutmadı ama gol farkı (kim kaç farkla kazandı) tuttu ->
 *    tam puanın 1/5'i (ör. 1-0 dedin, 2-1 bitti)
 *  - "partial": ne skor ne fark tuttu ama ev veya deplasman skorundan biri
 *    birebir doğru -> tam puanın 1/10'u (ör. 3-1 dedin, 5-1 bitti)
 *  - "none": hiçbiri tutmadı -> 0
 */
export function computeScorePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number,
  knownScores: KnownScore[]
): ScorePointsResult {
  const basePoints = estimateScorePoints(predictedHome, predictedAway, knownScores);

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return { points: basePoints, tier: "exact" };
  }
  if (predictedHome - predictedAway === actualHome - actualAway) {
    return { points: Math.max(1, Math.round(basePoints / 5)), tier: "margin" };
  }
  if (predictedHome === actualHome || predictedAway === actualAway) {
    return { points: Math.max(1, Math.round(basePoints / 10)), tier: "partial" };
  }
  return { points: 0, tier: "none" };
}
