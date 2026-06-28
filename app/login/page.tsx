"use client";

import { useState } from "react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/login" : "/api/register";
      const payload =
        mode === "login"
          ? { username, password }
          : { username, password, display_name: displayName };
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">⚽ Quiniela Mundial 2026</h1>
          <p className="mt-2 text-sm text-slate-400">Predice los playoffs y compite con tus amigos.</p>
        </div>

        {/* Tabs */}
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              mode === "register" ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        >
          {mode === "register" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Tu nombre <span className="text-slate-500">(aparece en la tabla)</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Edward"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Usuario</label>
            <input
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
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
            <p className="text-center text-xs text-slate-500">
              Crea tu usuario una sola vez. Luego entras con esos mismos datos.
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
