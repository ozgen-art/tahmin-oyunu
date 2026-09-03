export type Competition = "UCL" | "UEL";

export type Outcome = "home" | "draw" | "away";

export type TeamSide = "home" | "away" | "none";

export type MatchStatus = "scheduled" | "finished";

export interface Match {
  id: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string; // ISO datetime
  status: MatchStatus;
  finalHomeScore?: number;
  finalAwayScore?: number;
  finalWinner?: Outcome;
  finalScorerOptionId?: string;
  externalRef?: string;
  createdAt: string;
}

export interface ResultOption {
  id: string;
  matchId: string;
  outcome: Outcome;
  odds: number;
  points: number;
}

export interface ScoreOption {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  odds: number;
  points: number;
}

export interface ScorerOption {
  id: string;
  matchId: string;
  playerName: string;
  teamSide: TeamSide;
  odds: number;
  points: number;
}

export interface Participant {
  id: string;
  displayName: string;
  pinHash: string;
  sessionToken: string;
  createdAt: string;
}

export interface Prediction {
  id: string;
  participantId: string;
  matchId: string;
  resultOptionId?: string;
  scoreOptionId?: string;
  scorerOptionId?: string;
  resultPointsEarned?: number;
  scorePointsEarned?: number;
  scorerPointsEarned?: number;
  submittedAt: string;
  updatedAt: string;
}

export interface DbShape {
  matches: Match[];
  resultOptions: ResultOption[];
  scoreOptions: ScoreOption[];
  scorerOptions: ScorerOption[];
  participants: Participant[];
  predictions: Prediction[];
}

/** Bir maç için kullanıcıya gösterilecek tüm tahmin seçenekleriyle birlikte hali. */
export interface MatchWithOptions extends Match {
  resultOptions: ResultOption[];
  scoreOptions: ScoreOption[];
  scorerOptions: ScorerOption[];
}

export type MatchPhase = "open" | "locked" | "finished";
