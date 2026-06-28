import type { Side } from "@/lib/types";

export interface RevealRow {
  name: string;
  home: number;
  away: number;
  advanceWinner: Side | null;
  points: number | null;
  isMe: boolean;
}

interface Props {
  rows: RevealRow[];
  homeTeam: string;
  awayTeam: string;
  showPoints: boolean;
}

/** Shows everyone's predictions for a match (only used once the match is locked). */
export default function PredictionsList({ rows, homeTeam, awayTeam, showPoints }: Props) {
  if (rows.length === 0) {
    return (
      <div className="mt-3 border-t border-white/15 pt-2 text-center text-xs text-white/50">
        Nadie predijo este partido.
      </div>
    );
  }

  const sorted = [...rows].sort((a, b) => {
    if (showPoints) return (b.points ?? 0) - (a.points ?? 0) || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="mt-3 border-t border-white/15 pt-2">
      <p className="mb-1 text-center text-xs font-bold uppercase tracking-wide text-white/60">
        Predicciones de todos
      </p>
      <ul className="space-y-1 text-sm">
        {sorted.map((r, i) => (
          <li
            key={i}
            className={`flex items-center justify-between rounded-md px-2 py-1 ${
              r.isMe ? "bg-amber-400/20" : ""
            }`}
          >
            <span className="truncate">
              {r.name}
              {r.isMe && <span className="ml-1 text-xs text-amber-200">(tú)</span>}
            </span>
            <span className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-semibold">
                {r.home} - {r.away}
              </span>
              {r.home === r.away && r.advanceWinner && (
                <span className="text-xs text-white/60">
                  pasa: {r.advanceWinner === "HOME" ? homeTeam : awayTeam}
                </span>
              )}
              {showPoints && (
                <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs font-bold text-emerald-100">
                  {r.points ?? 0} pts
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
