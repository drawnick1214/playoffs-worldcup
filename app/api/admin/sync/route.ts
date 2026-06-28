import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { runSync } from "@/lib/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const user = await getSession();
  if (!user?.is_admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  try {
    const result = await runSync();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
