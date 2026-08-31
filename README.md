# L'Éclaireur Map

Carte interactive des promoteurs immobiliers au Sénégal.

## Stack

- Next.js 14 + React 18 + TypeScript
- MapLibre GL JS (open source, gratuit)
- OpenFreeMap (tiles gratuites, sans clé API)
- Tailwind CSS 3
- Chariow (licences + paiements)

## Fonctionnalités

- Carte interactive plein écran avec zoom progressif
- Marqueurs colorés par statut (agrégé / rumeur / confirmé)
- Barre de recherche par nom de zone ou promoteur
- Panneau de détail (desktop: droite / mobile: bottom sheet)
- Design glassmorphism (clair/sombre automatique)
- Système de licence par édition via Chariow

## Lancement

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000

## Déploiement Vercel

```bash
npm i -g vercel
verbal login
verbal --prod
```

Configurer les variables d'env :
- `CHARIOW_API_KEY` — clé API Chariow
- `SESSION_SECRET` — secret pour signer les JWT
