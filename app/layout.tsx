import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "L'Éclaireur Map",
  description: "Carte interactive des promoteurs immobiliers au Sénégal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
