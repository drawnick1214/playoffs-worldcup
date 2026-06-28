"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }
  return (
    <button
      onClick={logout}
      className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
    >
      Salir
    </button>
  );
}
