import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Éclaireur Map — Vérifiez avant d'investir à Dakar",
  description:
    "La carte des projets immobiliers à Dakar : statut, sources et vérifications, zone par zone."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
