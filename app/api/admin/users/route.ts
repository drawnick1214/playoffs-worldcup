import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getSession();
  if (!admin?.is_admin) return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const userId = String(body.user_id ?? "");
  const action = String(body.action ?? "");
  if (!userId || (action !== "approve" && action !== "delete")) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }
  if (userId === admin.id) {
    return NextResponse.json({ error: "No puedes modificar tu propia cuenta." }, { status: 400 });
  }

  if (action === "approve") {
    const { error } = await db().from("users").update({ approved: true }).eq("id", userId);
    if (error) return NextResponse.json({ error: "No se pudo aprobar." }, { status: 500 });
  } else {
    const { error } = await db().from("users").delete().eq("id", userId);
    if (error) return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
