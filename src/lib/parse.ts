import type { TeamSide } from "./types";

function parseOdds(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 1) return null;
  return value;
}

export interface ParsedScoreRow {
  homeScore: number;
  awayScore: number;
  odds: number;
}

/**
 * Her satır: "EvSkoru-DeplasmanSkoru,Oran" — örn: "2-1,8.5"
 */
export function parseScoreOptionsText(text: string): { rows: ParsedScoreRow[]; errors: string[] } {
  const rows: ParsedScoreRow[] = [];
  const errors: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

  for (const [i, line] of lines.entries()) {
    const lineNo = i + 1;
    const [scorePart, oddsPart] = line.split(",").map((p) => p?.trim());
    const scoreMatch = scorePart?.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!scoreMatch) {
      errors.push(`Satır ${lineNo}: skor "EvSkoru-DeplasmanSkoru" biçiminde olmalı (ör. 2-1).`);
      continue;
    }
    const odds = oddsPart ? parseOdds(oddsPart) : null;
    if (odds === null) {
      errors.push(`Satır ${lineNo}: oran geçersiz (1'den büyük bir sayı olmalı).`);
      continue;
    }
    rows.push({ homeScore: Number(scoreMatch[1]), awayScore: Number(scoreMatch[2]), odds });
  }
  return { rows, errors };
}

export interface ParsedScorerRow {
  playerName: string;
  teamSide: TeamSide;
  odds: number;
}

const SIDE_ALIASES: Record<string, TeamSide> = {
  home: "home",
  ev: "home",
  "ev sahibi": "home",
  away: "away",
  deplasman: "away",
  none: "none",
  yok: "none",
  diger: "none",
  diğer: "none",
};

/**
 * Her satır: "Oyuncu Adı,taraf,Oran" — taraf: ev/deplasman/yok — örn:
 * "Kylian Mbappé,ev,3.25" veya "Gol olmaz,yok,6"
 */
export function parseScorerOptionsText(text: string): { rows: ParsedScorerRow[]; errors: string[] } {
  const rows: ParsedScorerRow[] = [];
  const errors: string[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));

  for (const [i, line] of lines.entries()) {
    const lineNo = i + 1;
    const parts = line.split(",").map((p) => p?.trim());
    const [playerName, sideRaw, oddsPart] = parts;
    if (!playerName) {
      errors.push(`Satır ${lineNo}: oyuncu adı boş olamaz.`);
      continue;
    }
    const teamSide = sideRaw ? SIDE_ALIASES[sideRaw.toLowerCase()] : undefined;
    if (!teamSide) {
      errors.push(`Satır ${lineNo}: taraf "ev", "deplasman" veya "yok" olmalı.`);
      continue;
    }
    const odds = oddsPart ? parseOdds(oddsPart) : null;
    if (odds === null) {
      errors.push(`Satır ${lineNo}: oran geçersiz (1'den büyük bir sayı olmalı).`);
      continue;
    }
    rows.push({ playerName, teamSide, odds });
  }
  return { rows, errors };
}
