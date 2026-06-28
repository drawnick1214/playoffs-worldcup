import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Triggered every ~5 min by an external cron pinger (e.g. cron-job.org):
 *   GET /api/sync?token=SYNC_TOKEN
 * Fetches results from football-data, upserts matches, and distributes points.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.SYNC_TOKEN || token !== process.env.SYNC_TOKEN) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
