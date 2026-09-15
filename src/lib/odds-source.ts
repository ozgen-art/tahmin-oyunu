import "server-only";

/**
 * ---------------------------------------------------------------------------
 * CANLI VERİ ENTEGRASYONU — API-Football (api-sports.io)
 * ---------------------------------------------------------------------------
 * Free plan kısıtı: hem `/fixtures` hem `/odds` sadece "dün / bugün / yarın"
 * penceresine izin veriyor (her gün kayar). Bu yüzden burada sadece BUGÜN ve
 * YARIN için UCL (league=2) / UEL (league=3) maçlarını çekiyoruz — daha ileri
 * bir tarih istersek API "Free plans do not have access to this date" hatası
 * döner. Admin panelinden "Yarının maçlarını çek" butonuna her gün basıldığında
 * bir sonraki günün maçı varsa yakalanmış olur.
 *
 * Üst plana geçilirse (Pro/Ultra/Mega) tarih penceresi kalkar; bu dosyada
 * değişiklik gerekmez, sadece daha geniş bir tarih aralığı sorgulanabilir.
 * ---------------------------------------------------------------------------
 */
import type { Competition, TeamSide } from "./types";

export interface ExternalMatch {
  externalId: string;
  competition: Competition;
  homeTeam: string;
  awayTeam: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  kickoffAt: string; // ISO datetime
  result1x2Odds: { home: number; draw: number; away: number } | null;
  correctScoreOdds: Array<{ homeScore: number; awayScore: number; odds: number }>;
  firstScorerOdds: Array<{ playerName: string; teamSide: TeamSide; odds: number }>;
}

const API_BASE = "https://v3.football.api-sports.io";
const LEAGUE_IDS: Record<number, Competition> = { 2: "UCL", 3: "UEL" };

// API-Football bet (market) id'leri — bkz. GET /odds/bets
const BET_MATCH_WINNER = 1;
const BET_EXACT_SCORE = 10;
const BET_FIRST_GOAL_SCORER = 93;

function apiFootballKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("API_FOOTBALL_KEY ortam değişkeni tanımlı değil.");
  return key;
}

async function apiFootballGet(path: string, params: Record<string, string>) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { "x-apisports-key": apiFootballKey() },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API-Football isteği başarısız (${res.status}): ${path}`);
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football hata döndü: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

interface RawFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number };
  teams: { home: { name: string; logo?: string }; away: { name: string; logo?: string } };
}

async function fetchFixturesForDate(date: string): Promise<RawFixture[]> {
  const json = await apiFootballGet("/fixtures", { date });
  return (json.response as RawFixture[]).filter(
    (f) => f.league.id in LEAGUE_IDS && f.fixture.status.short === "NS" // henüz başlamamış
  );
}

interface OddValue {
  value: string;
  odd: string;
}
interface OddBet {
  id: number;
  name: string;
  values: OddValue[];
}
interface OddBookmaker {
  id: number;
  name: string;
  bets: OddBet[];
}

/**
 * Bir bet (market) tipi için TÜM bahisçilerin verdiği oranları, "değer"
 * (ör. "Home", "2:1", oyuncu adı) bazında ortalayarak "optimum" — tek bir
 * bahisçiye bağlı kalmayan, daha dengeli — bir oran haritası üretir.
 * Kullanıcıya hiç gösterilmiyor, sadece dahili puan hesaplaması için.
 */
function averageBetValues(bookmakers: OddBookmaker[], betId: number): Map<string, number> {
  const sums = new Map<string, { sum: number; count: number }>();
  for (const bm of bookmakers) {
    const bet = bm.bets.find((b) => b.id === betId);
    if (!bet) continue;
    for (const v of bet.values) {
      const odd = Number(v.odd);
      if (!Number.isFinite(odd) || odd <= 1) continue;
      const entry = sums.get(v.value) ?? { sum: 0, count: 0 };
      entry.sum += odd;
      entry.count += 1;
      sums.set(v.value, entry);
    }
  }
  const averaged = new Map<string, number>();
  for (const [value, { sum, count }] of sums) averaged.set(value, sum / count);
  return averaged;
}

async function fetchOddsForFixture(fixtureId: number): Promise<{
  result1x2Odds: ExternalMatch["result1x2Odds"];
  correctScoreOdds: ExternalMatch["correctScoreOdds"];
  firstScorerOdds: ExternalMatch["firstScorerOdds"];
}> {
  const json = await apiFootballGet("/odds", { fixture: String(fixtureId) });
  const bookmakers: OddBookmaker[] = json.response?.[0]?.bookmakers ?? [];

  // Maç Sonucu (1 / Berabere / 2) — tüm bahisçilerin ortalaması
  let result1x2Odds: ExternalMatch["result1x2Odds"] = null;
  const winnerOdds = averageBetValues(bookmakers, BET_MATCH_WINNER);
  if (winnerOdds.has("Home") && winnerOdds.has("Draw") && winnerOdds.has("Away")) {
    result1x2Odds = {
      home: winnerOdds.get("Home")!,
      draw: winnerOdds.get("Draw")!,
      away: winnerOdds.get("Away")!,
    };
  }

  // Kesin Skor — en olası (en düşük ortalama oranlı) 8 skor
  const correctScoreOdds: ExternalMatch["correctScoreOdds"] = [];
  const scoreOdds = averageBetValues(bookmakers, BET_EXACT_SCORE);
  for (const [value, odds] of scoreOdds) {
    const m = value.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
    if (!m) continue; // "Other"/"Any Unquoted" gibi seçenekleri atla
    correctScoreOdds.push({ homeScore: Number(m[1]), awayScore: Number(m[2]), odds });
  }
  correctScoreOdds.sort((a, b) => a.odds - b.odds);
  correctScoreOdds.splice(8);

  // İlk Golü Atan — en olası 6 oyuncu + "Gol olmaz" (API bu marketi sadece
  // büyük maçlarda/bazı bahisçilerde sunuyor; yoksa boş döner, admin elle
  // girer).
  const firstScorerOdds: ExternalMatch["firstScorerOdds"] = [];
  const scorerOdds = averageBetValues(bookmakers, BET_FIRST_GOAL_SCORER);
  for (const [playerName, odds] of scorerOdds) {
    firstScorerOdds.push({ playerName, teamSide: "none", odds });
  }
  firstScorerOdds.sort((a, b) => a.odds - b.odds);
  firstScorerOdds.splice(6);
  if (firstScorerOdds.length > 0) {
    const zeroZero = correctScoreOdds.find((s) => s.homeScore === 0 && s.awayScore === 0);
    firstScorerOdds.push({
      playerName: "Gol olmaz / Diğer",
      teamSide: "none",
      odds: zeroZero?.odds ?? 7,
    });
  }

  return { result1x2Odds, correctScoreOdds, firstScorerOdds };
}

export interface ExternalResult {
  finalHomeScore: number;
  finalAwayScore: number;
  /** API'nin döndürdüğü ilk golü atan oyuncunun adı; 0-0 ise null. */
  firstScorerName: string | null;
}

interface FixtureEvent {
  time: { elapsed: number };
  type: string;
  detail: string;
  player: { name: string };
}

function normalizePlayerName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // aksan işaretlerini kaldır (é -> e, ı -> i vb.)
    .toLowerCase()
    .trim();
}

async function fetchFixtureById(fixtureId: number): Promise<{
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
} | null> {
  const json = await apiFootballGet("/fixtures", { id: String(fixtureId) });
  const f = json.response?.[0];
  if (!f) return null;
  return {
    status: f.fixture.status.short,
    homeGoals: f.goals.home,
    awayGoals: f.goals.away,
  };
}

async function fetchFirstGoalScorerName(fixtureId: number): Promise<string | null> {
  const json = await apiFootballGet("/fixtures/events", { fixture: String(fixtureId) });
  const events = (json.response ?? []) as FixtureEvent[];
  const goals = events
    .filter((e) => e.type === "Goal" && e.detail !== "Missed Penalty")
    .sort((a, b) => a.time.elapsed - b.time.elapsed);
  return goals[0]?.player.name ?? null;
}

/**
 * Daha önce API'den içe aktarılmış (externalId `api-football:<fixtureId>`
 * biçiminde) bir maçın sonucunu döner. Maç API'de henüz bitmemişse
 * (status "FT" değilse) `null` döner — admin panelinden tekrar denenebilir.
 */
export async function fetchFinishedResultFromLiveApi(
  externalId: string
): Promise<ExternalResult | null> {
  const fixtureId = Number(externalId.replace("api-football:", ""));
  if (!Number.isFinite(fixtureId)) return null;

  const fixture = await fetchFixtureById(fixtureId);
  if (!fixture || fixture.status !== "FT") return null;
  if (fixture.homeGoals === null || fixture.awayGoals === null) return null;

  const firstScorerName =
    fixture.homeGoals + fixture.awayGoals > 0 ? await fetchFirstGoalScorerName(fixtureId) : null;

  return {
    finalHomeScore: fixture.homeGoals,
    finalAwayScore: fixture.awayGoals,
    firstScorerName,
  };
}

/** `firstScorerName`'i, bir maçın önceden kaydedilmiş scorer_options listesindeki
 * (aksan/boşluk farklarına toleranslı) en yakın seçeneğin id'sine eşler. Gol
 * atılmadıysa (0-0) "Gol olmaz" seçeneğini bulmaya çalışır. Eşleşme yoksa
 * `null` döner — admin panelinden elle seçilebilir. */
export function matchScorerName(
  firstScorerName: string | null,
  scorerOptions: Array<{ id: string; playerName: string }>
): string | null {
  if (firstScorerName === null) {
    return (
      scorerOptions.find((o) =>
        normalizePlayerName(o.playerName).replace(/\s+/g, "").includes("gololmaz")
      )?.id ?? null
    );
  }
  const normalized = normalizePlayerName(firstScorerName);
  return scorerOptions.find((o) => normalizePlayerName(o.playerName) === normalized)?.id ?? null;
}

/**
 * Bugün ve yarın için UCL/UEL maçlarını (henüz başlamamış olanları), varsa
 * oranlarıyla birlikte döner. Oran bulunamayan piyasalar boş dizi/`null`
 * olarak gelir — admin panelinden elle tamamlanabilir.
 */
export async function fetchUpcomingMatchesFromLiveApi(): Promise<ExternalMatch[]> {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dates = [today, tomorrow].map((d) => d.toISOString().slice(0, 10));

  const fixtures: RawFixture[] = [];
  for (const date of dates) {
    fixtures.push(...(await fetchFixturesForDate(date)));
  }

  const results: ExternalMatch[] = [];
  for (const f of fixtures) {
    const odds = await fetchOddsForFixture(f.fixture.id);
    results.push({
      externalId: `api-football:${f.fixture.id}`,
      competition: LEAGUE_IDS[f.league.id],
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeLogoUrl: f.teams.home.logo,
      awayLogoUrl: f.teams.away.logo,
      kickoffAt: f.fixture.date,
      ...odds,
    });
  }
  return results;
}
