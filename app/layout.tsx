import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polla Playoffs del Mundial",
  description: "Predice los resultados de los playoffs del Mundial 2026 y compite con tus amigos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-screen bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 bg-fixed text-white">
        {children}
      </body>
    </html>
  );
}
