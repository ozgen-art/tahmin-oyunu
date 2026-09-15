/**
 * Takım logosu yoksa (ör. admin panelinden elle eklenen maçlar) gösterilecek
 * baş harf rozeti için deterministik yardımcılar. Aynı takım ismi her zaman
 * aynı kısaltma + aynı renk çiftini üretir.
 */

const GRADIENT_PAIRS: Array<[string, string]> = [
  ["#c8912e", "#0a2a4a"],
  ["#5a2a1a", "#3a2a1a"],
  ["#1a3a5a", "#4a3a1a"],
  ["#5a1a1a", "#3a3a3a"],
  ["#5a1a1a", "#4a1a4a"],
  ["#3a1a4a", "#1a4a2a"],
  ["#2a4a3a", "#1a2a4a"],
  ["#4a2a5a", "#2a1a3a"],
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** "Real Madrid" -> "RM", "Galatasaray" -> "GA" gibi 2-3 harfli bir kısaltma. */
export function teamInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

export function teamGradient(name: string): [string, string] {
  const pair = GRADIENT_PAIRS[hashString(name) % GRADIENT_PAIRS.length];
  return pair;
}
