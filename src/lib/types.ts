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
  /** Galatasaray / Fenerbahçe / Beşiktaş / Trabzonspor'un oynadığı maç mı —
   * joker (3 kat puan) sadece bu maçlarda kullanılabilir. */
  isJokerEligible: boolean;
  /** API-Football'dan gelen forma/logo görseli — yoksa arayüz baş harf rozetine düşer. */
  homeLogoUrl?: string;
  awayLogoUrl?: string;
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

/** Admin/API tarafından bilinen (gerçek oranlı) "en olası skorlar" listesi.
 * Kullanıcıya gösterilmez — sadece serbest skor tahminlerinin puanını
 * hesaplarken referans/kalibrasyon verisi olarak kullanılır. */
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
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  scorerOptionId?: string;
  /** Bu tahmin için haftalık jokerin kullanılıp kullanılmadığı (puan x3). */
  jokerUsed: boolean;
  resultPointsEarned?: number;
  scorePointsEarned?: number;
  scorerPointsEarned?: number;
  submittedAt: string;
  updatedAt: string;
}

/** Bir maç için kullanıcıya gösterilecek tüm tahmin seçenekleriyle birlikte hali. */
export interface MatchWithOptions extends Match {
  resultOptions: ResultOption[];
  scoreOptions: ScoreOption[];
  scorerOptions: ScorerOption[];
}

export type MatchPhase = "open" | "locked" | "finished";
