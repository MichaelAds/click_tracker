import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Click Tracker",
  description: "Rastreador de cliques com exportação para Excel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg text-white antialiased">{children}</body>
    </html>
  );
}
