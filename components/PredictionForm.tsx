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
    pred_pen_winner: "HOME" | "AWAY" | null;
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
  const [pen, setPen] = useState<"HOME" | "AWAY" | "">(initial.pred_pen_winner ?? "");
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
      setMsg("Elige quién gana en penales.");
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
          pred_pen_winner: isTie ? pen : null,
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
          className="w-12 rounded-md border border-slate-700 bg-slate-800 py-1 text-center text-lg"
        />
        <span className="text-slate-500">-</span>
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
          className="w-12 rounded-md border border-slate-700 bg-slate-800 py-1 text-center text-lg"
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
          <p className="mb-1 text-xs text-amber-300">Empate: ¿quién gana en penales?</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPen("HOME");
                setStatus("idle");
              }}
              className={`rounded-md px-3 py-1 text-sm ${
                pen === "HOME" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
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
              className={`rounded-md px-3 py-1 text-sm ${
                pen === "AWAY" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
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
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {status === "saving" ? "Guardando…" : status === "saved" ? "Actualizar" : "Guardar"}
        </button>
        {msg && (
          <span className={`text-xs ${status === "error" ? "text-red-400" : "text-emerald-400"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}
