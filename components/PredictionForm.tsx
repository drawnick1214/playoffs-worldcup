"use client";

import { useState } from "react";

interface Props {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeCrest?: string | null;
  awayCrest?: string | null;
  initial: {
    pred_home: number | null;
    pred_away: number | null;
    pred_advance_winner: "HOME" | "AWAY" | null;
  };
}

export default function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  homeCrest,
  awayCrest,
  initial,
}: Props) {
  const [home, setHome] = useState(initial.pred_home?.toString() ?? "");
  const [away, setAway] = useState(initial.pred_away?.toString() ?? "");
  const [pen, setPen] = useState<"HOME" | "AWAY" | "">(initial.pred_advance_winner ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    initial.pred_home != null ? "saved" : "idle"
  );
  const [msg, setMsg] = useState("");

  const isTie = home !== "" && away !== "" && Number(home) === Number(away);

  async function save() {
    setMsg("");
    if (home === "" || away === "") {
      setStatus("error");
      setMsg("Ingresa ambos marcadores.");
      return;
    }
    if (isTie && pen === "") {
      setStatus("error");
      setMsg("Elige qué equipo pasa a la siguiente ronda.");
      return;
    }
    setStatus("saving");
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          pred_home: Number(home),
          pred_away: Number(away),
          pred_advance_winner: isTie ? pen : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMsg(data.error || "No se pudo guardar.");
        return;
      }
      setStatus("saved");
      setMsg("¡Guardado!");
    } catch {
      setStatus("error");
      setMsg("Error de conexión.");
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-center gap-3">
        <span className="flex w-28 items-center justify-end gap-1.5 text-right text-sm font-medium">
          {homeCrest && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={homeCrest} alt="" className="inline-block h-4 w-5 shrink-0 object-contain" />
          )}
          {homeTeam}
        </span>
        <input
          type="number"
          min={0}
          max={30}
          inputMode="numeric"
          value={home}
          onChange={(e) => {
            setHome(e.target.value);
            setStatus("idle");
          }}
          className="w-12 rounded-md border border-white/30 bg-white/20 py-1 text-center text-lg text-white outline-none focus:border-amber-300"
        />
        <span className="text-white/50">-</span>
        <input
          type="number"
          min={0}
          max={30}
          inputMode="numeric"
          value={away}
          onChange={(e) => {
            setAway(e.target.value);
            setStatus("idle");
          }}
          className="w-12 rounded-md border border-white/30 bg-white/20 py-1 text-center text-lg text-white outline-none focus:border-amber-300"
        />
        <span className="flex w-28 items-center justify-start gap-1.5 text-left text-sm font-medium">
          {awayTeam}
          {awayCrest && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={awayCrest} alt="" className="inline-block h-4 w-5 shrink-0 object-contain" />
          )}
        </span>
      </div>

      {isTie && (
        <div className="mt-3 text-center">
          <p className="mb-1 text-xs font-semibold text-amber-200">Empate: ¿quién pasa a la siguiente ronda?</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPen("HOME");
                setStatus("idle");
              }}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                pen === "HOME" ? "bg-amber-400 text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {homeTeam}
            </button>
            <button
              type="button"
              onClick={() => {
                setPen("AWAY");
                setStatus("idle");
              }}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition ${
                pen === "AWAY" ? "bg-amber-400 text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              {awayTeam}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-900 shadow transition hover:bg-amber-300 disabled:opacity-50"
        >
          {status === "saving" ? "Guardando…" : status === "saved" ? "Actualizar" : "Guardar"}
        </button>
        {msg && (
          <span className={`text-xs font-semibold ${status === "error" ? "text-red-200" : "text-emerald-200"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
