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
  drew_at_90: boolean;
  advance_winner: "HOME" | "AWAY" | null;
}

export interface PendingUser {
  id: string;
  display_name: string;
  phone: string;
}

export interface ApprovedUser {
  id: string;
  display_name: string;
  phone: string;
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

function UserRow({ u, pending }: { u: PendingUser; pending: boolean }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  async function act(action: "approve" | "delete") {
    if (action === "delete" && !confirm(`¿Eliminar a ${u.display_name}?`)) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, action }),
      });
      const data = await res.json();
      if (res.ok) setHidden(true);
      else setMsg(data.error || "Error");
    } catch {
      setMsg("Error de conexión.");
    }
    setBusy(false);
  }

  if (hidden) return null;
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
      <span className="text-sm">
        <b>{u.display_name}</b> <span className="text-white/60">· {u.phone}</span>
      </span>
      <span className="flex shrink-0 gap-2">
        {pending && (
          <button
            onClick={() => act("approve")}
            disabled={busy}
            className="rounded-md bg-emerald-500 px-3 py-1 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-50"
          >
            Aprobar
          </button>
        )}
        <button
          onClick={() => act("delete")}
          disabled={busy}
          className="rounded-md bg-red-500/80 px-3 py-1 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          Eliminar
        </button>
        {msg && <span className="text-xs text-red-200">{msg}</span>}
      </span>
    </li>
  );
}

function ResultForm({ m }: { m: AdminMatch }) {
  const [home, setHome] = useState(m.reg_home?.toString() ?? "");
  const [away, setAway] = useState(m.reg_away?.toString() ?? "");
  const [draw90, setDraw90] = useState(m.drew_at_90);
  const [adv, setAdv] = useState<"HOME" | "AWAY" | "">(m.advance_winner ?? "");
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
          drew_at_90: draw90,
          advance_winner: draw90 ? adv : null,
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
          className="w-14 rounded-md border border-white/30 bg-white/20 px-2 py-1 text-center text-white"
          placeholder="L"
        />
        <span>-</span>
        <input
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className="w-14 rounded-md border border-white/30 bg-white/20 px-2 py-1 text-center text-white"
          placeholder="V"
        />
        <label className="ml-2 flex items-center gap-1 text-sm">
          <input type="checkbox" checked={draw90} onChange={(e) => setDraw90(e.target.checked)} />
          Empate 90&apos; (prórroga/penales)
        </label>
        {draw90 && (
          <select
            value={adv}
            onChange={(e) => setAdv(e.target.value as "HOME" | "AWAY")}
            className="rounded-md border border-white/30 bg-white/20 px-2 py-1 text-sm text-white"
          >
            <option value="">¿Quién pasó?…</option>
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

export default function AdminPanel({
  matches,
  pending,
  approved,
}: {
  matches: AdminMatch[];
  pending: PendingUser[];
  approved: ApprovedUser[];
}) {
  return (
    <div>
      {/* Pending approvals */}
      <div className="mb-6 rounded-xl border border-amber-300/40 bg-amber-400/10 p-4 shadow-lg backdrop-blur-md">
        <h2 className="mb-2 text-lg font-black uppercase tracking-wide text-amber-300">
          Pendientes de aprobar {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-white/70">No hay registros pendientes.</p>
        ) : (
          <ul className="space-y-2">
            {pending.map((u) => (
              <UserRow key={u.id} u={u} pending />
            ))}
          </ul>
        )}
      </div>

      {/* Approved players */}
      <details className="mb-6 rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
        <summary className="cursor-pointer font-bold text-white">
          Jugadores aprobados ({approved.length})
        </summary>
        <ul className="mt-2 space-y-2">
          {approved.map((u) => (
            <UserRow key={u.id} u={u} pending={false} />
          ))}
        </ul>
      </details>

      <SyncButton />

      <h2 className="mb-2 text-lg font-bold">Corregir resultados manualmente</h2>
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
