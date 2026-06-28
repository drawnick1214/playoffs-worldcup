"use client";

import { useState } from "react";

export interface AdminMatch {
  id: string;
  label: string;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
  reg_home: number | null;
  reg_away: number | null;
  went_to_pens: boolean;
  pen_winner: "HOME" | "AWAY" | null;
}

function SyncButton() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  async function run() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/sync", { method: "POST" });
      const data = await res.json();
      setMsg(
        res.ok
          ? `OK · ${data.upserted} partidos, ${data.scoredMatches} cerrados, ${data.scoredPredictions} predicciones puntuadas`
          : data.error || "Error"
      );
    } catch {
      setMsg("Error de conexión.");
    }
    setLoading(false);
  }
  return (
    <div className="mb-6 rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md">
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg bg-amber-400 px-4 py-2 font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
      >
        {loading ? "Sincronizando…" : "Sincronizar resultados ahora"}
      </button>
      {msg && <p className="mt-2 text-sm text-white/80">{msg}</p>}
    </div>
  );
}

function ResultForm({ m }: { m: AdminMatch }) {
  const [home, setHome] = useState(m.reg_home?.toString() ?? "");
  const [away, setAway] = useState(m.reg_away?.toString() ?? "");
  const [pens, setPens] = useState(m.went_to_pens);
  const [pen, setPen] = useState<"HOME" | "AWAY" | "">(m.pen_winner ?? "");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: m.id,
          reg_home: Number(home),
          reg_away: Number(away),
          went_to_pens: pens,
          pen_winner: pens ? pen : null,
        }),
      });
      const data = await res.json();
      setMsg(res.ok ? "Guardado y puntuado." : data.error || "Error");
    } catch {
      setMsg("Error de conexión.");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md">
      <div className="mb-1 text-xs text-white/70">
        {m.label} · {m.kickoff} · {m.status ?? "—"}
      </div>
      <div className="font-medium">
        {m.home_team} vs {m.away_team}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          type="number"
          min={0}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className="w-14 rounded-md border border-white/30 bg-white/20 text-white px-2 py-1 text-center"
          placeholder="L"
        />
        <span>-</span>
        <input
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="w-14 rounded-md border border-white/30 bg-white/20 text-white px-2 py-1 text-center"
          placeholder="V"
        />
        <label className="ml-2 flex items-center gap-1 text-sm">
          <input type="checkbox" checked={pens} onChange={(e) => setPens(e.target.checked)} />
          Penales
        </label>
        {pens && (
          <select
            value={pen}
            onChange={(e) => setPen(e.target.value as "HOME" | "AWAY")}
            className="rounded-md border border-white/30 bg-white/20 text-white px-2 py-1 text-sm"
          >
            <option value="">Ganador penales…</option>
            <option value="HOME">{m.home_team}</option>
            <option value="AWAY">{m.away_team}</option>
          </select>
        )}
        <button
          onClick={save}
          disabled={loading}
          className="rounded-lg bg-amber-400 px-3 py-1 text-sm font-bold text-slate-900 hover:bg-amber-300 disabled:opacity-50"
        >
          {loading ? "…" : "Guardar"}
        </button>
      </div>
      {msg && <p className="mt-1 text-xs text-white/80">{msg}</p>}
    </div>
  );
}

export default function AdminPanel({ matches }: { matches: AdminMatch[] }) {
  return (
    <div>
      <SyncButton />
      <h2 className="mb-2 text-lg font-semibold">Corregir resultados manualmente</h2>
      <p className="mb-3 text-sm text-white/70">
        Úsalo solo si la API falla o se demora. Guardar vuelve a calcular los puntos del partido.
      </p>
      <div className="space-y-3">
        {matches.length === 0 && (
          <p className="text-sm text-white/60">No hay partidos con equipos definidos todavía.</p>
        )}
        {matches.map((m) => (
          <ResultForm key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}
