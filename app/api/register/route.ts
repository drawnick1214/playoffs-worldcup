import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let username = "";
  let password = "";
  let displayName = "";
  try {
    const body = await req.json();
    username = String(body.username ?? "").trim();
    password = String(body.password ?? "");
    displayName = String(body.display_name ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { error: "El usuario debe tener 3 a 20 caracteres (letras, números o _)." },
      { status: 400 }
    );
  }
  if (password.length < 4) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 4 caracteres." },
      { status: 400 }
    );
  }

  const supabase = db();

  // Username must be unique (case-insensitive).
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Ese usuario ya existe. Elige otro." }, { status: 409 });
  }

  // The very first person to register becomes the admin.
  const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
  const isAdmin = (count ?? 0) === 0;

  const password_hash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      username,
      display_name: displayName || username,
      password_hash,
      is_admin: isAdmin,
    })
    .select("id, username, display_name, is_admin")
    .single();

  if (error || !user) {
    // Unique violation (race) or other error.
    return NextResponse.json({ error: "No se pudo crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }

  await setSession({
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    is_admin: user.is_admin,
  });

  return NextResponse.json({ ok: true });
}
