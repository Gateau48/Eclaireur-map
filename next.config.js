/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // GARDE-FOU : liste blanche explicite plutôt qu'un wildcard "**" total
    // (moins de surface d'abus via l'optimiseur d'images Next.js). picsum
    // fournit des photos d'illustration ; dicebear génère des avatars
    // "initiales" pour les promoteurs (aucune vraie photo de personne réelle
    // n'est utilisée pour des identités fictives). Ajouter ici le domaine
    // de vos vraies photos une fois disponibles (voir README).
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "api.dicebear.com" }
    ]
  }
};

module.exports = nextConfig;