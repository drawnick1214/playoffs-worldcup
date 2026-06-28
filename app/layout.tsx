import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiniela Mundial 2026",
  description: "Predice los resultados de los playoffs del Mundial 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
