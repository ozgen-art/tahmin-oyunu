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
  teams: { home: { name: string }; away: { name: string } };
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

function findBet(bookmakers: OddBookmaker[], betId: number): OddBet | null {
  for (const bm of bookmakers) {
    const bet = bm.bets.find((b) => b.id === betId);
    if (bet && bet.values.length > 0) return bet;
  }
  return null;
}

async function fetchOddsForFixture(fixtureId: number): Promise<{
  result1x2Odds: ExternalMatch["result1x2Odds"];
  correctScoreOdds: ExternalMatch["correctScoreOdds"];
  firstScorerOdds: ExternalMatch["firstScorerOdds"];
}> {
  const json = await apiFootballGet("/odds", { fixture: String(fixtureId) });
  const bookmakers: OddBookmaker[] = json.response?.[0]?.bookmakers ?? [];

  // Maç Sonucu (1 / Berabere / 2)
  let result1x2Odds: ExternalMatch["result1x2Odds"] = null;
  const winnerBet = findBet(bookmakers, BET_MATCH_WINNER);
  if (winnerBet) {
    const home = winnerBet.values.find((v) => v.value === "Home");
    const draw = winnerBet.values.find((v) => v.value === "Draw");
    const away = winnerBet.values.find((v) => v.value === "Away");
    if (home && draw && away) {
      result1x2Odds = { home: Number(home.odd), draw: Number(draw.odd), away: Number(away.odd) };
    }
  }

  // Kesin Skor — en olası (en düşük oranlı) 8 skor
  const correctScoreOdds: ExternalMatch["correctScoreOdds"] = [];
  const scoreBet = findBet(bookmakers, BET_EXACT_SCORE);
  if (scoreBet) {
    for (const v of scoreBet.values) {
      const m = v.value.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
      if (!m) continue; // "Other"/"Any Unquoted" gibi seçenekleri atla
      const odds = Number(v.odd);
      if (!Number.isFinite(odds) || odds <= 1) continue;
      correctScoreOdds.push({ homeScore: Number(m[1]), awayScore: Number(m[2]), odds });
    }
    correctScoreOdds.sort((a, b) => a.odds - b.odds);
    correctScoreOdds.splice(8);
  }

  // İlk Golü Atan — en olası 6 oyuncu + "Gol olmaz" (API bu marketi sadece
  // büyük maçlarda/bazı bahisçilerde sunuyor; yoksa boş döner, admin elle
  // girer).
  const firstScorerOdds: ExternalMatch["firstScorerOdds"] = [];
  const scorerBet = findBet(bookmakers, BET_FIRST_GOAL_SCORER);
  if (scorerBet) {
    for (const v of scorerBet.values) {
      const odds = Number(v.odd);
      if (!Number.isFinite(odds) || odds <= 1) continue;
      // API oyuncunun takımını bu markette vermiyor; taraf bilgisi olmadan
      // "none" (nötr) olarak işaretliyoruz — arayüzde sadece opsiyonel bir
      // ipucu olarak kullanılıyor, işlevi etkilemiyor.
      firstScorerOdds.push({ playerName: v.value, teamSide: "none", odds });
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
  }

  return { result1x2Odds, correctScoreOdds, firstScorerOdds };
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
      kickoffAt: f.fixture.date,
      ...odds,
    });
  }
  return results;
}
