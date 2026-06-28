"use client";

import { useState } from "react";

interface Props {
  prediccion: React.ReactNode;
  leaderboard: React.ReactNode;
}

export default function Tabs({ prediccion, leaderboard }: Props) {
  const [tab, setTab] = useState<"prediccion" | "leaderboard">("prediccion");

  const btn = (active: boolean) =>
    `flex-1 rounded-lg py-2.5 text-sm font-black uppercase tracking-wide transition ${
      active ? "bg-amber-400 text-slate-900 shadow" : "text-white/80 hover:bg-white/10"
    }`;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1 backdrop-blur">
        <button type="button" onClick={() => setTab("prediccion")} className={btn(tab === "prediccion")}>
          ⚽ Predicción
        </button>
        <button type="button" onClick={() => setTab("leaderboard")} className={btn(tab === "leaderboard")}>
          🏆 Leaderboard
        </button>
      </div>
      <div>{tab === "prediccion" ? prediccion : leaderboard}</div>
    </div>
  );
}
