import type { MatchResult, Side } from "./types";

// ---------------------------------------------------------------------------
// Stage metadata (knockout / playoffs only). Group stage is intentionally
// excluded — this game is about the playoffs.
// ---------------------------------------------------------------------------

export const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Dieciseisavos de final",
  LAST_16: "Octavos de final",
  QUARTER_FINALS: "Cuartos de final",
  SEMI_FINALS: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  "3RD_PLACE": "Tercer puesto",
  FINAL: "Final",
};

export const STAGE_ORDER: Record<string, number> = {
  LAST_32: 1,
  LAST_16: 2,
  QUARTER_FINALS: 3,
  SEMI_FINALS: 4,
  THIRD_PLACE: 5,
  "3RD_PLACE": 5,
  FINAL: 6,
};

export function isKnockoutStage(stage: string | null | undefined): boolean {
  return !!stage && stage in STAGE_ORDER;
}

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "Por definir";
  return STAGE_LABELS[stage] ?? stage;
}

// ---------------------------------------------------------------------------
// football-data.org API
// ---------------------------------------------------------------------------

interface FdTeam {
  name: string | null;
  tla: string | null;
  crest: string | null;
}

interface FdScore {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | null;
  fullTime: { home: number | null; away: number | null };
  halfTime?: { home: number | null; away: number | null };
}

interface FdMatch {
  id: number;
  utcDate: string | null;
  status: string;
  stage: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
}

/** Row shape we upsert into the `matches` table. */
export interface MatchRow {
  external_id: string;
  stage: string | null;
  round_label: string | null;
  home_team: string | null;
  away_team: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_team_crest: string | null;
  away_team_crest: string | null;
  kickoff_utc: string | null;
  venue: string | null;
  status: string | null;
  reg_home: number | null;
  reg_away: number | null;
  result: MatchResult | null;
  went_to_pens: boolean;
  pen_winner: Side | null;
}

const API_BASE = "https://api.football-data.org/v4";

export async function fetchWorldCupMatches(): Promise<FdMatch[]> {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("Falta FOOTBALL_DATA_API_KEY.");

  const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { "X-Auth-Token": key },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { matches?: FdMatch[] };
  return data.matches ?? [];
}

/**
 * Derive the scoring fields from a finished match.
 *
 * We treat the API `fullTime` score (after extra time, before penalties) as the
 * "regulation" score the players bet on, and define a DRAW as exactly the case
 * where the match was decided by a penalty shootout. A match decided in extra
 * time has a real winner (no shootout), so it is NOT a draw for our purposes.
 */
function deriveScore(m: FdMatch): Pick<
  MatchRow,
  "reg_home" | "reg_away" | "result" | "went_to_pens" | "pen_winner"
> {
  const s = m.score;
  const wentToPens = s.duration === "PENALTY_SHOOTOUT";
  const home = s.fullTime?.home ?? null;
  const away = s.fullTime?.away ?? null;

  let result: MatchResult | null = null;
  let penWinner: Side | null = null;

  if (wentToPens) {
    result = "DRAW";
    penWinner = s.winner === "AWAY_TEAM" ? "AWAY" : "HOME";
  } else if (s.winner === "HOME_TEAM") {
    result = "HOME";
  } else if (s.winner === "AWAY_TEAM") {
    result = "AWAY";
  } else if (home != null && away != null) {
    result = home > away ? "HOME" : home < away ? "AWAY" : "DRAW";
  }

  return {
    reg_home: home,
    reg_away: away,
    result,
    went_to_pens: wentToPens,
    pen_winner: penWinner,
  };
}

/** Map a football-data match to a `matches` row, or null if not a knockout match. */
export function mapMatch(m: FdMatch): MatchRow | null {
  if (!isKnockoutStage(m.stage)) return null;

  const finished = m.status === "FINISHED";
  const scored = finished
    ? deriveScore(m)
    : {
        reg_home: null,
        reg_away: null,
        result: null,
        went_to_pens: false,
        pen_winner: null,
      };

  return {
    external_id: String(m.id),
    stage: m.stage,
    round_label: stageLabel(m.stage),
    home_team: m.homeTeam?.name ?? null,
    away_team: m.awayTeam?.name ?? null,
    home_team_code: m.homeTeam?.tla ?? null,
    away_team_code: m.awayTeam?.tla ?? null,
    home_team_crest: m.homeTeam?.crest ?? null,
    away_team_crest: m.awayTeam?.crest ?? null,
    kickoff_utc: m.utcDate ?? null,
    venue: null, // filled from openfootball in the sync step
    status: m.status,
    ...scored,
  };
}

// ---------------------------------------------------------------------------
// Venues — football-data's free tier omits the stadium, so we pull the venue
// from the open public openfootball dataset and join by exact kickoff time.
// ---------------------------------------------------------------------------

const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const KNOCKOUT_ROUNDS = new Set([
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Match for third place",
  "Final",
]);

function openfootballToUtc(date: string, time: string): string | null {
  const m = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if (!m) return null;
  const sign = m[3][0];
  const hours = m[3].slice(1).padStart(2, "0");
  const off = `${sign}${hours}:00`;
  const iso = `${date}T${m[1].padStart(2, "0")}:${m[2]}:00${off}`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Map of kickoff time (ISO UTC) -> venue, for knockout matches. */
export async function fetchVenueMap(): Promise<Record<string, string>> {
  const res = await fetch(OPENFOOTBALL_URL, { cache: "no-store" });
  if (!res.ok) return {};
  const data = (await res.json()) as {
    matches?: { round?: string; date?: string; time?: string; ground?: string }[];
  };
  const map: Record<string, string> = {};
  for (const m of data.matches ?? []) {
    if (!m.round || !KNOCKOUT_ROUNDS.has(m.round)) continue;
    if (!m.date || !m.time || !m.ground) continue;
    const key = openfootballToUtc(m.date, m.time);
    if (key) map[key] = m.ground;
  }
  return map;
}

