# Éclaireur Map

Web app Next.js (App Router) — carte des projets immobiliers à Dakar, avec
statut vérifié, sources, et accès payant par édition via Chariow.

## Démarrage

```bash
npm install
cp .env.example .env.local   # puis remplir les variables
npm run validate-data        # valide data/dakar/*.json avec zod
npm run dev
```

## Parcours d'achat (implémenté selon la doc officielle chariow.dev)

1. Sur `/[edition]/vente`, le prix affiché est le **vrai prix Chariow**,
   récupéré côté serveur via `GET /v1/products/{id}` (`lib/chariow.ts`,
   `getChariowProduct`). Si le produit est en promo, la date de fin
   (`on_sale_until`) s'affiche comme bandeau d'urgence.
2. Le bouton de paiement exige une **session Google active** :
   - non connecté → bouton "Se connecter avec Google pour continuer"
     (`signIn('google', { callbackUrl: .../vente#debloquer })`) ;
   - connecté → petit formulaire (prénom/nom pré-remplis, téléphone),
     requis par l'API Chariow (`POST /v1/checkout`).
3. La soumission appelle `app/api/checkout/init/route.ts` (serveur, avec la
   clé secrète `CHARIOW_API_KEY`), qui initie la session de paiement avec
   `email` = email de la session Google et `custom_metadata.edition_id`,
   puis redirige le navigateur vers le `checkout_url` renvoyé par Chariow.
4. Après paiement, Chariow redirige vers `/[edition]/paiement-reussi`, qui
   attend (polling sur `/api/access/[edition]`) que le Pulse
   `successful.sale` ait été traité, puis redirige vers `/[edition]`.
   Chariow envoie lui-même l'e-mail de confirmation — c'est externe à
   l'app.
5. `app/api/webhooks/chariow/route.ts` reçoit le Pulse `successful.sale`,
   vérifie la signature (`lib/license/verifySignature.ts`, HMAC-SHA256 sur
   le corps brut, conforme à
   [Pulse Security](https://chariow.dev/en/guides/pulse-security)),
   dédoublonne sur `x-pulse-delivery-id`, puis upsert la ligne `purchases`
   (email + edition_id).
6. `middleware.ts` protège `/[edition]` (jamais `/[edition]/vente`) en
   vérifiant qu'une ligne `purchases` active existe pour l'email de la
   session — c'est ce qui donne accès à la carte, sans lien avec l'e-mail
   externe de Chariow.

## Points à finaliser avant mise en production

1. **mapcn** : `components/ui/map.tsx` est une implémentation de secours
   (MapLibre GL brut) respectant l'API mapcn attendue. Lancer
   `npx shadcn@latest add @mapcn/map` pour la vraie lib si disponible —
   rien d'autre n'a besoin de changer.
2. **Images** : les chemins `/promoteurs/*.jpg`, `/projets/*.jpg` et
   `/editions/*.jpg` sont des placeholders — déposer les vraies images
   dans `public/` aux mêmes chemins.
3. **Chariow — configuration dashboard** :
   - créer un produit (type `downloadable`, `course`, `license` ou
     `bundle` — pas `service`/`coaching`/pay-what-you-want, non supportés
     par l'API de checkout) pour chaque édition ; renseigner son id/slug
     dans `NEXT_PUBLIC_CHARIOW_DAKAR_PRODUCT_ID` ;
   - créer une clé API (**Settings → API**) → `CHARIOW_API_KEY` ;
   - créer un Pulse (**Automations → Pulses**) pointant vers
     `https://<votre-domaine>/api/webhooks/chariow`, événement
     **Successful Sale** au minimum, et copier son secret de signature
     (`whsec_...`) → `CHARIOW_PULSE_SECRET`.
4. **Supabase** : exécuter `lib/db/schema.sql` dans le SQL editor du projet
   Supabase avant le premier déploiement (tables `purchases` et
   `pulse_deliveries`).
5. **Google OAuth** : créer les identifiants OAuth (type "Web application")
   dans Google Cloud Console, avec
   `NEXTAUTH_URL/api/auth/callback/google` comme URI de redirection
   autorisée.

## Style visuel

Verre liquide façon Apple (`backdrop-blur-2xl backdrop-saturate-150`,
coins 20-28px, ombres douces — classe `.glass` dans `app/globals.css`),
avec les interactions gestuelles façon Google Maps (feuille du bas Vaul à
3 points d'accroche sur mobile, panneau latéral sur desktop, carte jamais
recouverte par un overlay sombre).

## Structure

Voir Partie 6.4 du brief produit pour l'arborescence complète et les
variables d'environnement attendues.
