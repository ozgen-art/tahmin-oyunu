import "server-only";
import { readDb, writeDb } from "./store";
import { deriveWinner, oddsToPoints } from "./scoring";
import { sha256Hex, randomToken } from "./hash";
import type {
  Match,
  MatchPhase,
  MatchWithOptions,
  Participant,
  Prediction,
  ResultOption,
  ScoreOption,
  ScorerOption,
  TeamSide,
} from "./types";

const isoNow = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Örnek (mock) veri — gerçek maç/oran verisi bağlanana kadar iskeleti
// göstermek için kullanılır. Admin panelinden düzenlenebilir/silinebilir.
// Gerçek bir canlı oran/sonuç API'sine bağlanmak için src/lib/odds-source.ts
// dosyasına bakın.
// ---------------------------------------------------------------------------
async function seedIfEmpty() {
  const db = await readDb();
  if (db.matches.length > 0) return;

  const daysFromNow = (d: number, h: number, m: number) => {
    const date = new Date();
    date.setDate(date.getDate() + d);
    date.setHours(h, m, 0, 0);
    return date.toISOString();
  };

  type SeedMatch = {
    competition: "UCL" | "UEL";
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    result: { home: number; draw: number; away: number };
    scores: Array<[number, number, number]>; // [homeScore, awayScore, odds]
    scorers: Array<[string, TeamSide, number]>; // [player, side, odds]
  };

  const seedMatches: SeedMatch[] = [
    {
      competition: "UCL",
      homeTeam: "Real Madrid",
      awayTeam: "Manchester City",
      kickoffAt: daysFromNow(3, 22, 0),
      result: { home: 2.3, draw: 3.6, away: 2.8 },
      scores: [
        [2, 1, 8.5],
        [1, 1, 6.5],
        [1, 0, 7.0],
        [2, 0, 9.0],
        [0, 0, 11.0],
        [1, 2, 9.5],
        [0, 1, 8.0],
        [2, 2, 12.0],
      ],
      scorers: [
        ["Kylian Mbappé", "home", 3.25],
        ["Vinícius Júnior", "home", 3.75],
        ["Erling Haaland", "away", 2.9],
        ["Phil Foden", "away", 5.5],
        ["Gol olmaz / Diğer", "none", 6.0],
      ],
    },
    {
      competition: "UCL",
      homeTeam: "Bayern München",
      awayTeam: "Paris Saint-Germain",
      kickoffAt: daysFromNow(3, 19, 45),
      result: { home: 2.1, draw: 3.8, away: 3.1 },
      scores: [
        [2, 1, 8.0],
        [1, 1, 6.0],
        [2, 0, 8.5],
        [1, 0, 6.75],
        [0, 0, 10.5],
        [1, 2, 10.0],
        [0, 1, 8.5],
        [3, 1, 13.0],
      ],
      scorers: [
        ["Harry Kane", "home", 2.75],
        ["Michael Olise", "home", 5.0],
        ["Ousmane Dembélé", "away", 3.5],
        ["Bradley Barcola", "away", 5.5],
        ["Gol olmaz / Diğer", "none", 6.0],
      ],
    },
    {
      competition: "UEL",
      homeTeam: "Ajax",
      awayTeam: "Fenerbahçe",
      kickoffAt: daysFromNow(4, 20, 0),
      result: { home: 2.5, draw: 3.3, away: 2.7 },
      scores: [
        [1, 1, 6.0],
        [2, 1, 8.0],
        [1, 0, 6.5],
        [1, 2, 8.5],
        [0, 0, 9.5],
        [0, 1, 7.5],
        [2, 0, 9.0],
        [2, 2, 12.5],
      ],
      scorers: [
        ["Wout Weghorst", "home", 3.5],
        ["Kenneth Taylor", "home", 6.0],
        ["Edin Džeko", "away", 3.75],
        ["Dušan Tadić", "away", 4.5],
        ["Gol olmaz / Diğer", "none", 6.5],
      ],
    },
    {
      competition: "UEL",
      homeTeam: "AS Roma",
      awayTeam: "Tottenham Hotspur",
      kickoffAt: daysFromNow(4, 22, 0),
      result: { home: 2.6, draw: 3.4, away: 2.6 },
      scores: [
        [1, 1, 6.0],
        [1, 0, 6.75],
        [2, 1, 8.25],
        [0, 1, 7.0],
        [0, 0, 9.75],
        [1, 2, 8.75],
        [2, 0, 9.5],
        [0, 2, 10.0],
      ],
      scorers: [
        ["Artem Dovbyk", "home", 3.25],
        ["Paulo Dybala", "home", 4.0],
        ["Dominic Solanke", "away", 3.6],
        ["Son Heung-min", "away", 3.9],
        ["Gol olmaz / Diğer", "none", 6.0],
      ],
    },
  ];

  await writeDb((data) => {
    for (const sm of seedMatches) {
      const matchId = crypto.randomUUID();
      const match: Match = {
        id: matchId,
        competition: sm.competition,
        homeTeam: sm.homeTeam,
        awayTeam: sm.awayTeam,
        kickoffAt: sm.kickoffAt,
        status: "scheduled",
        createdAt: isoNow(),
      };
      data.matches.push(match);

      (["home", "draw", "away"] as const).forEach((outcome) => {
        const odds = sm.result[outcome];
        const opt: ResultOption = {
          id: crypto.randomUUID(),
          matchId,
          outcome,
          odds,
          points: oddsToPoints(odds),
        };
        data.resultOptions.push(opt);
      });

      for (const [homeScore, awayScore, odds] of sm.scores) {
        const opt: ScoreOption = {
          id: crypto.randomUUID(),
          matchId,
          homeScore,
          awayScore,
          odds,
          points: oddsToPoints(odds),
        };
        data.scoreOptions.push(opt);
      }

      for (const [playerName, teamSide, odds] of sm.scorers) {
        const opt: ScorerOption = {
          id: crypto.randomUUID(),
          matchId,
          playerName,
          teamSide,
          odds,
          points: oddsToPoints(odds),
        };
        data.scorerOptions.push(opt);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Maçlar
// ---------------------------------------------------------------------------

export async function getMatchPhase(match: Pick<Match, "status" | "kickoffAt">): Promise<MatchPhase> {
  if (match.status === "finished") return "finished";
  return new Date(match.kickoffAt).getTime() <= Date.now() ? "locked" : "open";
}

export function getMatchPhaseSync(match: Pick<Match, "status" | "kickoffAt">): MatchPhase {
  if (match.status === "finished") return "finished";
  return new Date(match.kickoffAt).getTime() <= Date.now() ? "locked" : "open";
}

export async function listMatches(): Promise<Match[]> {
  await seedIfEmpty();
  const db = await readDb();
  return [...db.matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()
  );
}

export async function getMatchWithOptions(matchId: string): Promise<MatchWithOptions | null> {
  await seedIfEmpty();
  const db = await readDb();
  const match = db.matches.find((m) => m.id === matchId);
  if (!match) return null;
  return {
    ...match,
    resultOptions: db.resultOptions
      .filter((o) => o.matchId === matchId)
      .sort((a, b) => a.outcome.localeCompare(b.outcome)),
    scoreOptions: db.scoreOptions
      .filter((o) => o.matchId === matchId)
      .sort((a, b) => a.odds - b.odds),
    scorerOptions: db.scorerOptions
      .filter((o) => o.matchId === matchId)
      .sort((a, b) => a.odds - b.odds),
  };
}

export async function createMatch(input: {
  competition: "UCL" | "UEL";
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
}): Promise<Match> {
  const match: Match = {
    id: crypto.randomUUID(),
    competition: input.competition,
    homeTeam: input.homeTeam.trim(),
    awayTeam: input.awayTeam.trim(),
    kickoffAt: new Date(input.kickoffAt).toISOString(),
    status: "scheduled",
    createdAt: isoNow(),
  };
  await writeDb((db) => {
    db.matches.push(match);
  });
  return match;
}

export async function updateMatchInfo(
  matchId: string,
  input: { competition: "UCL" | "UEL"; homeTeam: string; awayTeam: string; kickoffAt: string }
): Promise<void> {
  await writeDb((db) => {
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) throw new Error("Maç bulunamadı");
    match.competition = input.competition;
    match.homeTeam = input.homeTeam.trim();
    match.awayTeam = input.awayTeam.trim();
    match.kickoffAt = new Date(input.kickoffAt).toISOString();
  });
}

export async function deleteMatch(matchId: string): Promise<void> {
  await writeDb((db) => {
    db.matches = db.matches.filter((m) => m.id !== matchId);
    db.resultOptions = db.resultOptions.filter((o) => o.matchId !== matchId);
    db.scoreOptions = db.scoreOptions.filter((o) => o.matchId !== matchId);
    db.scorerOptions = db.scorerOptions.filter((o) => o.matchId !== matchId);
    db.predictions = db.predictions.filter((p) => p.matchId !== matchId);
  });
}

export async function setResultOptions(
  matchId: string,
  odds: { home: number; draw: number; away: number }
): Promise<void> {
  await writeDb((db) => {
    db.resultOptions = db.resultOptions.filter((o) => o.matchId !== matchId);
    (["home", "draw", "away"] as const).forEach((outcome) => {
      db.resultOptions.push({
        id: crypto.randomUUID(),
        matchId,
        outcome,
        odds: odds[outcome],
        points: oddsToPoints(odds[outcome]),
      });
    });
  });
}

export async function setScoreOptions(
  matchId: string,
  rows: Array<{ homeScore: number; awayScore: number; odds: number }>
): Promise<void> {
  await writeDb((db) => {
    db.scoreOptions = db.scoreOptions.filter((o) => o.matchId !== matchId);
    for (const row of rows) {
      db.scoreOptions.push({
        id: crypto.randomUUID(),
        matchId,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        odds: row.odds,
        points: oddsToPoints(row.odds),
      });
    }
  });
}

export async function setScorerOptions(
  matchId: string,
  rows: Array<{ playerName: string; teamSide: TeamSide; odds: number }>
): Promise<void> {
  await writeDb((db) => {
    db.scorerOptions = db.scorerOptions.filter((o) => o.matchId !== matchId);
    for (const row of rows) {
      db.scorerOptions.push({
        id: crypto.randomUUID(),
        matchId,
        playerName: row.playerName.trim(),
        teamSide: row.teamSide,
        odds: row.odds,
        points: oddsToPoints(row.odds),
      });
    }
  });
}

export async function finalizeMatch(
  matchId: string,
  input: { finalHomeScore: number; finalAwayScore: number; finalScorerOptionId: string | null }
): Promise<void> {
  await writeDb((db) => {
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) throw new Error("Maç bulunamadı");

    const winner = deriveWinner(input.finalHomeScore, input.finalAwayScore);
    match.finalHomeScore = input.finalHomeScore;
    match.finalAwayScore = input.finalAwayScore;
    match.finalWinner = winner;
    match.finalScorerOptionId = input.finalScorerOptionId ?? undefined;
    match.status = "finished";

    const resultOptions = db.resultOptions.filter((o) => o.matchId === matchId);
    const scoreOptions = db.scoreOptions.filter((o) => o.matchId === matchId);

    for (const pred of db.predictions.filter((p) => p.matchId === matchId)) {
      const resultOpt = resultOptions.find((o) => o.id === pred.resultOptionId);
      pred.resultPointsEarned = resultOpt && resultOpt.outcome === winner ? resultOpt.points : 0;

      const scoreOpt = scoreOptions.find((o) => o.id === pred.scoreOptionId);
      pred.scorePointsEarned =
        scoreOpt &&
        scoreOpt.homeScore === input.finalHomeScore &&
        scoreOpt.awayScore === input.finalAwayScore
          ? scoreOpt.points
          : 0;

      const scorerOpt = db.scorerOptions.find((o) => o.id === pred.scorerOptionId);
      pred.scorerPointsEarned =
        scorerOpt && pred.scorerOptionId === match.finalScorerOptionId ? scorerOpt.points : 0;

      pred.updatedAt = isoNow();
    }
  });
}

export async function reopenMatch(matchId: string): Promise<void> {
  await writeDb((db) => {
    const match = db.matches.find((m) => m.id === matchId);
    if (!match) throw new Error("Maç bulunamadı");
    match.status = "scheduled";
    match.finalHomeScore = undefined;
    match.finalAwayScore = undefined;
    match.finalWinner = undefined;
    match.finalScorerOptionId = undefined;
    for (const pred of db.predictions.filter((p) => p.matchId === matchId)) {
      pred.resultPointsEarned = undefined;
      pred.scorePointsEarned = undefined;
      pred.scorerPointsEarned = undefined;
    }
  });
}

// ---------------------------------------------------------------------------
// Katılımcılar (basit isim + PIN ile oturum)
// ---------------------------------------------------------------------------

export async function findParticipantByName(displayName: string): Promise<Participant | null> {
  const db = await readDb();
  const normalized = displayName.trim().toLowerCase();
  return db.participants.find((p) => p.displayName.toLowerCase() === normalized) ?? null;
}

export async function findParticipantByToken(token: string | undefined): Promise<Participant | null> {
  if (!token) return null;
  const db = await readDb();
  return db.participants.find((p) => p.sessionToken === token) ?? null;
}

export async function createParticipant(displayName: string, pin: string): Promise<Participant> {
  const participant: Participant = {
    id: crypto.randomUUID(),
    displayName: displayName.trim(),
    pinHash: await sha256Hex(pin),
    sessionToken: randomToken(),
    createdAt: isoNow(),
  };
  await writeDb((db) => {
    db.participants.push(participant);
  });
  return participant;
}

export async function verifyParticipantPin(participant: Participant, pin: string): Promise<boolean> {
  return participant.pinHash === (await sha256Hex(pin));
}

export async function rotateParticipantToken(participantId: string): Promise<string> {
  const token = randomToken();
  await writeDb((db) => {
    const p = db.participants.find((x) => x.id === participantId);
    if (p) p.sessionToken = token;
  });
  return token;
}

// ---------------------------------------------------------------------------
// Tahminler
// ---------------------------------------------------------------------------

export async function getPrediction(
  participantId: string,
  matchId: string
): Promise<Prediction | null> {
  const db = await readDb();
  return (
    db.predictions.find((p) => p.participantId === participantId && p.matchId === matchId) ?? null
  );
}

export async function listPredictionsForParticipant(participantId: string): Promise<Prediction[]> {
  const db = await readDb();
  return db.predictions.filter((p) => p.participantId === participantId);
}

export async function submitPrediction(input: {
  participantId: string;
  matchId: string;
  resultOptionId?: string;
  scoreOptionId?: string;
  scorerOptionId?: string;
}): Promise<void> {
  await writeDb((db) => {
    const match = db.matches.find((m) => m.id === input.matchId);
    if (!match) throw new Error("Maç bulunamadı");
    if (getMatchPhaseSync(match) !== "open") {
      throw new Error("Bu maç için tahmin süresi doldu");
    }

    let pred = db.predictions.find(
      (p) => p.participantId === input.participantId && p.matchId === input.matchId
    );
    const now = isoNow();
    if (!pred) {
      pred = {
        id: crypto.randomUUID(),
        participantId: input.participantId,
        matchId: input.matchId,
        submittedAt: now,
        updatedAt: now,
      };
      db.predictions.push(pred);
    }
    if (input.resultOptionId !== undefined) pred.resultOptionId = input.resultOptionId || undefined;
    if (input.scoreOptionId !== undefined) pred.scoreOptionId = input.scoreOptionId || undefined;
    if (input.scorerOptionId !== undefined) pred.scorerOptionId = input.scorerOptionId || undefined;
    pred.updatedAt = now;
  });
}

// ---------------------------------------------------------------------------
// Liderlik tablosu
// ---------------------------------------------------------------------------

export interface LeaderboardRow {
  participantId: string;
  displayName: string;
  totalPoints: number;
  matchesPredicted: number;
  matchesFinished: number;
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const db = await readDb();
  const rows = new Map<string, LeaderboardRow>();
  for (const participant of db.participants) {
    rows.set(participant.id, {
      participantId: participant.id,
      displayName: participant.displayName,
      totalPoints: 0,
      matchesPredicted: 0,
      matchesFinished: 0,
    });
  }
  const matchStatus = new Map(db.matches.map((m) => [m.id, m.status]));
  for (const pred of db.predictions) {
    const row = rows.get(pred.participantId);
    if (!row) continue;
    row.matchesPredicted += 1;
    if (matchStatus.get(pred.matchId) === "finished") {
      row.matchesFinished += 1;
      row.totalPoints +=
        (pred.resultPointsEarned ?? 0) + (pred.scorePointsEarned ?? 0) + (pred.scorerPointsEarned ?? 0);
    }
  }
  return [...rows.values()].sort((a, b) => b.totalPoints - a.totalPoints);
}
