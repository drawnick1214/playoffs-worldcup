"use client";

import { useState } from "react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onPhoneChange(v: string) {
    // digits only, max 10
    setPhone(v.replace(/\D/g, "").slice(0, 10));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^3\d{9}$/.test(phone)) {
      setError("El celular debe tener 10 dígitos y empezar por 3.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const payload =
        mode === "login"
          ? { phone, password }
          : { phone, password, display_name: displayName };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Algo salió mal.");
        setLoading(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError("");
  }

  const inputCls =
    "w-full rounded-lg border border-white/25 bg-white/15 px-3 py-2 text-white placeholder-white/50 outline-none transition focus:border-amber-300 focus:bg-white/20";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-5xl">⚽🏆</div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight drop-shadow">
            Polla Playoffs <span className="text-amber-300">del Mundial</span>
          </h1>
          <p className="mt-2 text-sm text-white/80">Predice los playoffs y compite con tus amigos.</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              mode === "login" ? "bg-amber-400 text-slate-900" : "text-white/80 hover:bg-white/10"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              mode === "register" ? "bg-amber-400 text-slate-900" : "text-white/80 hover:bg-white/10"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-md"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-white/90">
                Tu nombre <span className="text-white/50">(aparece en la tabla)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Edward"
                className={inputCls}
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-white/90">Celular</label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => onPhoneChange(e.target.value)}
              placeholder="3001234567"
              maxLength={10}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-white/90">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          {error && <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-100">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-400 px-4 py-2.5 font-black uppercase tracking-wide text-slate-900 shadow-lg transition hover:bg-amber-300 disabled:opacity-50"
          >
            {loading
              ? mode === "login"
                ? "Entrando…"
                : "Creando…"
              : mode === "login"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
          {mode === "register" && (
            <p className="text-center text-xs text-white/60">
              Tu cuenta quedará pendiente hasta que el administrador la apruebe.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
