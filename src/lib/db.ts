import "server-only";
import { getSupabaseAdmin } from "./supabase-admin";
import { deriveWinner } from "./scoring";
import { sha256Hex, randomToken } from "./hash";
import type {
  Match,
  MatchPhase,
  MatchWithOptions,
  Outcome,
  Participant,
  Prediction,
  ResultOption,
  ScoreOption,
  ScorerOption,
  TeamSide,
} from "./types";

// ---------------------------------------------------------------------------
// DB satırı (snake_case) <-> uygulama tipi (camelCase) dönüşümleri
// ---------------------------------------------------------------------------

interface MatchRow {
  id: string;
  competition: "UCL" | "UEL";
  home_team: string;
  away_team: string;
  kickoff_at: string;
  status: "scheduled" | "finished";
  final_home_score: number | null;
  final_away_score: number | null;
  final_winner: Outcome | null;
  final_scorer_option_id: string | null;
  external_ref: string | null;
  created_at: string;
}

function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    competition: row.competition,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    kickoffAt: row.kickoff_at,
    status: row.status,
    finalHomeScore: row.final_home_score ?? undefined,
    finalAwayScore: row.final_away_score ?? undefined,
    finalWinner: row.final_winner ?? undefined,
    finalScorerOptionId: row.final_scorer_option_id ?? undefined,
    externalRef: row.external_ref ?? undefined,
    createdAt: row.created_at,
  };
}

interface ResultOptionRow {
  id: string;
  match_id: string;
  outcome: Outcome;
  odds: number;
  points: number;
}
const mapResultOption = (row: ResultOptionRow): ResultOption => ({
  id: row.id,
  matchId: row.match_id,
  outcome: row.outcome,
  odds: Number(row.odds),
  points: row.points,
});

interface ScoreOptionRow {
  id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  odds: number;
  points: number;
}
const mapScoreOption = (row: ScoreOptionRow): ScoreOption => ({
  id: row.id,
  matchId: row.match_id,
  homeScore: row.home_score,
  awayScore: row.away_score,
  odds: Number(row.odds),
  points: row.points,
});

interface ScorerOptionRow {
  id: string;
  match_id: string;
  player_name: string;
  team_side: TeamSide;
  odds: number;
  points: number;
}
const mapScorerOption = (row: ScorerOptionRow): ScorerOption => ({
  id: row.id,
  matchId: row.match_id,
  playerName: row.player_name,
  teamSide: row.team_side,
  odds: Number(row.odds),
  points: row.points,
});

interface ParticipantRow {
  id: string;
  display_name: string;
  pin_hash: string;
  session_token: string;
  created_at: string;
}
const mapParticipant = (row: ParticipantRow): Participant => ({
  id: row.id,
  displayName: row.display_name,
  pinHash: row.pin_hash,
  sessionToken: row.session_token,
  createdAt: row.created_at,
});

interface PredictionRow {
  id: string;
  participant_id: string;
  match_id: string;
  result_option_id: string | null;
  score_option_id: string | null;
  scorer_option_id: string | null;
  result_points_earned: number | null;
  score_points_earned: number | null;
  scorer_points_earned: number | null;
  submitted_at: string;
  updated_at: string;
}
const mapPrediction = (row: PredictionRow): Prediction => ({
  id: row.id,
  participantId: row.participant_id,
  matchId: row.match_id,
  resultOptionId: row.result_option_id ?? undefined,
  scoreOptionId: row.score_option_id ?? undefined,
  scorerOptionId: row.scorer_option_id ?? undefined,
  resultPointsEarned: row.result_points_earned ?? undefined,
  scorePointsEarned: row.score_points_earned ?? undefined,
  scorerPointsEarned: row.scorer_points_earned ?? undefined,
  submittedAt: row.submitted_at,
  updatedAt: row.updated_at,
});

function must<T>(value: T | null, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

// ---------------------------------------------------------------------------
// Maçlar
// ---------------------------------------------------------------------------

export function getMatchPhaseSync(match: Pick<Match, "status" | "kickoffAt">): MatchPhase {
  if (match.status === "finished") return "finished";
  return new Date(match.kickoffAt).getTime() <= Date.now() ? "locked" : "open";
}

export async function listMatches(): Promise<Match[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("matches").select("*").order("kickoff_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as MatchRow[]).map(mapMatch);
}

export async function getMatchWithOptions(matchId: string): Promise<MatchWithOptions | null> {
  const db = getSupabaseAdmin();
  const [matchRes, resultRes, scoreRes, scorerRes] = await Promise.all([
    db.from("matches").select("*").eq("id", matchId).maybeSingle(),
    db.from("result_options").select("*").eq("match_id", matchId),
    db.from("score_options").select("*").eq("match_id", matchId).order("odds", { ascending: true }),
    db.from("scorer_options").select("*").eq("match_id", matchId).order("odds", { ascending: true }),
  ]);
  if (matchRes.error) throw new Error(matchRes.error.message);
  if (!matchRes.data) return null;
  if (resultRes.error) throw new Error(resultRes.error.message);
  if (scoreRes.error) throw new Error(scoreRes.error.message);
  if (scorerRes.error) throw new Error(scorerRes.error.message);

  return {
    ...mapMatch(matchRes.data as MatchRow),
    resultOptions: (resultRes.data as ResultOptionRow[]).map(mapResultOption),
    scoreOptions: (scoreRes.data as ScoreOptionRow[]).map(mapScoreOption),
    scorerOptions: (scorerRes.data as ScorerOptionRow[]).map(mapScorerOption),
  };
}

export async function createMatch(input: {
  competition: "UCL" | "UEL";
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  externalRef?: string;
}): Promise<Match> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("matches")
    .insert({
      competition: input.competition,
      home_team: input.homeTeam.trim(),
      away_team: input.awayTeam.trim(),
      kickoff_at: new Date(input.kickoffAt).toISOString(),
      external_ref: input.externalRef ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapMatch(data as MatchRow);
}

export async function findMatchByExternalRef(externalRef: string): Promise<Match | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("matches")
    .select("*")
    .eq("external_ref", externalRef)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapMatch(data as MatchRow) : null;
}

export async function updateMatchInfo(
  matchId: string,
  input: { competition: "UCL" | "UEL"; homeTeam: string; awayTeam: string; kickoffAt: string }
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("matches")
    .update({
      competition: input.competition,
      home_team: input.homeTeam.trim(),
      away_team: input.awayTeam.trim(),
      kickoff_at: new Date(input.kickoffAt).toISOString(),
    })
    .eq("id", matchId);
  if (error) throw new Error(error.message);
}

export async function deleteMatch(matchId: string): Promise<void> {
  const db = getSupabaseAdmin();
  // result/score/scorer_options ve predictions, FK "on delete cascade" ile
  // otomatik silinir.
  const { error } = await db.from("matches").delete().eq("id", matchId);
  if (error) throw new Error(error.message);
}

export async function setResultOptions(
  matchId: string,
  odds: { home: number; draw: number; away: number }
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error: delErr } = await db.from("result_options").delete().eq("match_id", matchId);
  if (delErr) throw new Error(delErr.message);

  const { error } = await db.from("result_options").insert(
    (["home", "draw", "away"] as const).map((outcome) => ({
      match_id: matchId,
      outcome,
      odds: odds[outcome],
    }))
  );
  if (error) throw new Error(error.message);
}

export async function setScoreOptions(
  matchId: string,
  rows: Array<{ homeScore: number; awayScore: number; odds: number }>
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error: delErr } = await db.from("score_options").delete().eq("match_id", matchId);
  if (delErr) throw new Error(delErr.message);

  const { error } = await db.from("score_options").insert(
    rows.map((r) => ({
      match_id: matchId,
      home_score: r.homeScore,
      away_score: r.awayScore,
      odds: r.odds,
    }))
  );
  if (error) throw new Error(error.message);
}

export async function setScorerOptions(
  matchId: string,
  rows: Array<{ playerName: string; teamSide: TeamSide; odds: number }>
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error: delErr } = await db.from("scorer_options").delete().eq("match_id", matchId);
  if (delErr) throw new Error(delErr.message);

  const { error } = await db.from("scorer_options").insert(
    rows.map((r) => ({
      match_id: matchId,
      player_name: r.playerName.trim(),
      team_side: r.teamSide,
      odds: r.odds,
    }))
  );
  if (error) throw new Error(error.message);
}

export async function finalizeMatch(
  matchId: string,
  input: { finalHomeScore: number; finalAwayScore: number; finalScorerOptionId: string | null }
): Promise<void> {
  const db = getSupabaseAdmin();

  const { error: updateErr } = await db
    .from("matches")
    .update({
      final_home_score: input.finalHomeScore,
      final_away_score: input.finalAwayScore,
      final_scorer_option_id: input.finalScorerOptionId,
      status: "finished",
    })
    .eq("id", matchId);
  if (updateErr) throw new Error(updateErr.message);

  const winner = deriveWinner(input.finalHomeScore, input.finalAwayScore);

  const [resultRes, scoreRes, scorerRes, predsRes] = await Promise.all([
    db.from("result_options").select("*").eq("match_id", matchId),
    db.from("score_options").select("*").eq("match_id", matchId),
    db.from("scorer_options").select("*").eq("match_id", matchId),
    db.from("predictions").select("*").eq("match_id", matchId),
  ]);
  if (resultRes.error) throw new Error(resultRes.error.message);
  if (scoreRes.error) throw new Error(scoreRes.error.message);
  if (scorerRes.error) throw new Error(scorerRes.error.message);
  if (predsRes.error) throw new Error(predsRes.error.message);

  const resultOptions = (resultRes.data as ResultOptionRow[]).map(mapResultOption);
  const scoreOptions = (scoreRes.data as ScoreOptionRow[]).map(mapScoreOption);
  const scorerOptions = (scorerRes.data as ScorerOptionRow[]).map(mapScorerOption);
  const predictions = (predsRes.data as PredictionRow[]).map(mapPrediction);

  await Promise.all(
    predictions.map((pred) => {
      const resultOpt = resultOptions.find((o) => o.id === pred.resultOptionId);
      const resultPointsEarned = resultOpt && resultOpt.outcome === winner ? resultOpt.points : 0;

      const scoreOpt = scoreOptions.find((o) => o.id === pred.scoreOptionId);
      const scorePointsEarned =
        scoreOpt &&
        scoreOpt.homeScore === input.finalHomeScore &&
        scoreOpt.awayScore === input.finalAwayScore
          ? scoreOpt.points
          : 0;

      const scorerOpt = scorerOptions.find((o) => o.id === pred.scorerOptionId);
      const scorerPointsEarned =
        scorerOpt && input.finalScorerOptionId && pred.scorerOptionId === input.finalScorerOptionId
          ? scorerOpt.points
          : 0;

      return db
        .from("predictions")
        .update({
          result_points_earned: resultPointsEarned,
          score_points_earned: scorePointsEarned,
          scorer_points_earned: scorerPointsEarned,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pred.id);
    })
  );
}

export async function reopenMatch(matchId: string): Promise<void> {
  const db = getSupabaseAdmin();
  const { error: matchErr } = await db
    .from("matches")
    .update({
      status: "scheduled",
      final_home_score: null,
      final_away_score: null,
      final_scorer_option_id: null,
    })
    .eq("id", matchId);
  if (matchErr) throw new Error(matchErr.message);

  const { error: predErr } = await db
    .from("predictions")
    .update({ result_points_earned: null, score_points_earned: null, scorer_points_earned: null })
    .eq("match_id", matchId);
  if (predErr) throw new Error(predErr.message);
}

// ---------------------------------------------------------------------------
// Katılımcılar (basit isim + PIN ile oturum)
// ---------------------------------------------------------------------------

export async function findParticipantByName(displayName: string): Promise<Participant | null> {
  const db = getSupabaseAdmin();
  const normalized = displayName.trim().toLowerCase();
  const { data, error } = await db
    .from("participants")
    .select("*")
    .eq("display_name_lower", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapParticipant(data as ParticipantRow) : null;
}

export async function findParticipantByToken(token: string | undefined): Promise<Participant | null> {
  if (!token) return null;
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("participants").select("*").eq("session_token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapParticipant(data as ParticipantRow) : null;
}

export async function createParticipant(displayName: string, pin: string): Promise<Participant> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("participants")
    .insert({
      display_name: displayName.trim(),
      pin_hash: await sha256Hex(pin),
      session_token: randomToken(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapParticipant(data as ParticipantRow);
}

export async function verifyParticipantPin(participant: Participant, pin: string): Promise<boolean> {
  return participant.pinHash === (await sha256Hex(pin));
}

export async function rotateParticipantToken(participantId: string): Promise<string> {
  const db = getSupabaseAdmin();
  const token = randomToken();
  const { error } = await db.from("participants").update({ session_token: token }).eq("id", participantId);
  if (error) throw new Error(error.message);
  return token;
}

// ---------------------------------------------------------------------------
// Tahminler
// ---------------------------------------------------------------------------

export async function getPrediction(
  participantId: string,
  matchId: string
): Promise<Prediction | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("predictions")
    .select("*")
    .eq("participant_id", participantId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPrediction(data as PredictionRow) : null;
}

export async function listPredictionsForParticipant(participantId: string): Promise<Prediction[]> {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("predictions").select("*").eq("participant_id", participantId);
  if (error) throw new Error(error.message);
  return (data as PredictionRow[]).map(mapPrediction);
}

export async function submitPrediction(input: {
  participantId: string;
  matchId: string;
  resultOptionId?: string;
  scoreOptionId?: string;
  scorerOptionId?: string;
}): Promise<void> {
  const db = getSupabaseAdmin();

  const { data: matchData, error: matchErr } = await db
    .from("matches")
    .select("status, kickoff_at")
    .eq("id", input.matchId)
    .maybeSingle();
  if (matchErr) throw new Error(matchErr.message);
  const match = must(matchData, "Maç bulunamadı") as Pick<MatchRow, "status" | "kickoff_at">;
  if (getMatchPhaseSync({ status: match.status, kickoffAt: match.kickoff_at }) !== "open") {
    throw new Error("Bu maç için tahmin süresi doldu");
  }

  const patch: Record<string, string | null> = {};
  if (input.resultOptionId !== undefined) patch.result_option_id = input.resultOptionId || null;
  if (input.scoreOptionId !== undefined) patch.score_option_id = input.scoreOptionId || null;
  if (input.scorerOptionId !== undefined) patch.scorer_option_id = input.scorerOptionId || null;

  const { data: existing, error: existingErr } = await db
    .from("predictions")
    .select("id")
    .eq("participant_id", input.participantId)
    .eq("match_id", input.matchId)
    .maybeSingle();
  if (existingErr) throw new Error(existingErr.message);

  if (existing) {
    const { error } = await db
      .from("predictions")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("predictions").insert({
      participant_id: input.participantId,
      match_id: input.matchId,
      ...patch,
    });
    if (error) throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Liderlik tablosu
// ---------------------------------------------------------------------------

export interface LeaderboardRow {
  participantId: string;
  displayName: string;
  createdAt: string;
  totalPoints: number;
  matchesPredicted: number;
  matchesFinished: number;
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const db = getSupabaseAdmin();
  const [participantsRes, predictionsRes, matchesRes] = await Promise.all([
    db.from("participants").select("id, display_name, created_at"),
    db.from("predictions").select("*"),
    db.from("matches").select("id, status"),
  ]);
  if (participantsRes.error) throw new Error(participantsRes.error.message);
  if (predictionsRes.error) throw new Error(predictionsRes.error.message);
  if (matchesRes.error) throw new Error(matchesRes.error.message);

  const matchStatus = new Map(
    (matchesRes.data as Array<{ id: string; status: string }>).map((m) => [m.id, m.status])
  );

  const rows = new Map<string, LeaderboardRow>();
  for (const p of participantsRes.data as Array<{ id: string; display_name: string; created_at: string }>) {
    rows.set(p.id, {
      participantId: p.id,
      displayName: p.display_name,
      createdAt: p.created_at,
      totalPoints: 0,
      matchesPredicted: 0,
      matchesFinished: 0,
    });
  }

  for (const predRow of predictionsRes.data as PredictionRow[]) {
    const pred = mapPrediction(predRow);
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
