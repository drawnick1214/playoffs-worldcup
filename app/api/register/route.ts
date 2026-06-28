import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setSession } from "@/lib/auth";
import { notifyAdminNewUser } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let phone = "";
  let password = "";
  let displayName = "";
  try {
    const body = await req.json();
    phone = String(body.phone ?? "").trim();
    password = String(body.password ?? "");
    displayName = String(body.display_name ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!displayName) {
    return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
  }
  // Phone: exactly 10 digits, must start with 3 (Colombian mobile).
  if (!/^3\d{9}$/.test(phone)) {
    return NextResponse.json(
      { error: "El celular debe tener 10 dígitos y empezar por 3." },
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

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Ese celular ya está registrado." }, { status: 409 });
  }

  // The very first person to register becomes the admin (and is auto-approved).
  const { count } = await supabase.from("users").select("id", { count: "exact", head: true });
  const isFirst = (count ?? 0) === 0;

  const password_hash = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      phone,
      display_name: displayName,
      password_hash,
      is_admin: isFirst,
      approved: isFirst,
    })
    .select("id, phone, display_name, is_admin, approved")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "No se pudo crear la cuenta. Intenta de nuevo." }, { status: 500 });
  }

  // Give them a session so they immediately see the "pending approval" screen.
  await setSession({
    id: user.id,
    phone: user.phone,
    display_name: user.display_name,
    is_admin: user.is_admin,
  });

  // Notify the admin by email (best-effort) for accounts needing approval.
  if (!user.approved) {
    await notifyAdminNewUser(user.display_name, user.phone);
  }

  return NextResponse.json({ ok: true, approved: user.approved });
}
