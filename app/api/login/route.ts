import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let phone = "";
  let password = "";
  try {
    const body = await req.json();
    phone = String(body.phone ?? "").trim();
    password = String(body.password ?? "");
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!phone || !password) {
    return NextResponse.json(
      { error: "Celular y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const { data: user } = await db()
    .from("users")
    .select("id, phone, display_name, is_admin, password_hash")
    .eq("phone", phone)
    .maybeSingle();

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return NextResponse.json(
      { error: "Celular o contraseña incorrectos." },
      { status: 401 }
    );
  }

  await setSession({
    id: user.id,
    phone: user.phone,
    display_name: user.display_name,
    is_admin: user.is_admin,
  });

  return NextResponse.json({ ok: true });
}
