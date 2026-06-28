import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatBogota } from "@/lib/time";
import { STAGE_ORDER, stageLabel } from "@/lib/football";
import type { Match } from "@/lib/types";
import AdminPanel, { type AdminMatch } from "@/components/AdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const { data } = await db().from("matches").select("*");
  const matches = (data ?? []) as Match[];

  const adminMatches: AdminMatch[] = matches
    .filter((m) => m.home_team && m.away_team)
    .sort((a, b) => {
      const sa = STAGE_ORDER[a.stage ?? ""] ?? 99;
      const sb = STAGE_ORDER[b.stage ?? ""] ?? 99;
      if (sa !== sb) return sa - sb;
      const ka = a.kickoff_utc ? new Date(a.kickoff_utc).getTime() : Infinity;
      const kb = b.kickoff_utc ? new Date(b.kickoff_utc).getTime() : Infinity;
      return ka - kb;
    })
    .map((m) => ({
      id: m.id,
      label: stageLabel(m.stage),
      home_team: m.home_team as string,
      away_team: m.away_team as string,
      kickoff: formatBogota(m.kickoff_utc),
      status: m.status,
      reg_home: m.reg_home,
      reg_away: m.reg_away,
      went_to_pens: m.went_to_pens,
      pen_winner: m.pen_winner,
    }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <Link
          href="/"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          ← Volver
        </Link>
      </header>
      <AdminPanel matches={adminMatches} />
    </main>
  );
}
