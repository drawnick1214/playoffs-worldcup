export type Side = "HOME" | "AWAY";
export type MatchResult = "HOME" | "AWAY" | "DRAW";

export interface User {
  id: string;
  phone: string;
  display_name: string;
  is_admin: boolean;
  approved: boolean;
}

export interface Match {
  id: string;
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
  drew_at_90: boolean; // true if level after 90' (decided in extra time or penalties)
  advance_winner: Side | null; // who advanced when it was a draw at 90'
  scored: boolean;
  updated_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  pred_home: number;
  pred_away: number;
  pred_advance_winner: Side | null;
  points: number | null;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  phone: string;
  display_name: string;
  is_admin: boolean;
}
