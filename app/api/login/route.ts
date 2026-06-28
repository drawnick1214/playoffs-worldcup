import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let username = "";
  let password = "";
  try {
    const body = await req.json();
    username = String(body.username ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json(
      { error: "Usuario y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const { data: user } = await db()
    .from("users")
    .select("id, username, display_name, is_admin, password_hash")
    .eq("username", username)
    .maybeSingle();

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  await setSession({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    is_admin: user.is_admin,
  });

  return NextResponse.json({ ok: true });
}
