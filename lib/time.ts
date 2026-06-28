const TZ = "America/Bogota";

const dateFmt = new Intl.DateTimeFormat("es-CO", {
  timeZone: TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** Format an ISO/UTC timestamp for display in Bogotá time. */
export function formatBogota(iso: string | null): string {
  if (!iso) return "Fecha por definir";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Fecha por definir";
  return dateFmt.format(d);
}

/** A prediction is locked once the match has kicked off. */
export function isLocked(kickoffIso: string | null, now: Date = new Date()): boolean {
  if (!kickoffIso) return false; // teams/date not set yet -> not lockable
  const k = new Date(kickoffIso);
  if (isNaN(k.getTime())) return false;
  return now.getTime() >= k.getTime();
}
