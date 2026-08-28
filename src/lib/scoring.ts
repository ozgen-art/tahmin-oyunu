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
