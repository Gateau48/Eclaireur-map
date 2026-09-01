# Brief technique — Éclaireur Map (pour l'agent de code)

*Ce document contient uniquement ce qui est nécessaire pour construire le produit. Chaque point est traduit en spécification de code concrète, avec les garde-fous contre les erreurs classiques — ce n'est pas une description visuelle ou fonctionnelle abstraite.*

## Nom du produit : Éclaireur Map

---

## 1. Description technique du produit
Une web app Next.js (App Router) à 4 types de routes :
- `/[edition]` — page de vente publique (non protégée)
- `/[edition]` — la carte elle-même, contenu protégé (même URL, contenu différent selon session — voir Partie 6)
- `/connexion` — connexion Google
- `/tableau-de-bord` — liste des éditions possédées/non possédées

Le cœur technique du produit est une carte MapLibre GL JS affichant des points géolocalisés colorés (vert/jaune/rouge), avec recherche, panneau de détail au clic, et affichage progressif par zoom.

---

## 2. Fonctionnalités principales — implémentation exacte

### 2.1 Rendu des marqueurs — utiliser mapcn, ne pas coder les marqueurs à la main
**Installer la librairie mapcn** (gratuite, open-source, style shadcn/ui, construite sur MapLibre GL — exactement notre stack) :
```bash
npx shadcn@latest add @mapcn/map
```
Elle fournit `Map`, `MapControls`, `MapMarker`, `MarkerContent`, `MarkerPopup`, `MarkerTooltip`, `MarkerLabel`, déjà stylés et compatibles mode sombre/clair automatique — ne pas reconstruire ces éléments à la main.

```tsx
import { Map, MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";

<Map center={[zoneData.zone_center.lng, zoneData.zone_center.lat]} zoom={12}>
  {points.map((point) => (
    <MapMarker key={point.id} longitude={point.coordinates.lng} latitude={point.coordinates.lat}>
      <MarkerContent>
        <div
          onClick={() => openDetailPanel(point)}
          className={cn(
            "size-4 rounded-full border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-110",
            point.status === 'agree' && "bg-emerald-400",
            point.status === 'rumeur' && "bg-amber-400",
            point.status === 'confirme' && "bg-red-400"
          )}
        />
      </MarkerContent>
      <MarkerTooltip>{point.name}</MarkerTooltip>
    </MapMarker>
  ))}
</Map>
```
**Garde-fou de performance (confirmé par la doc mapcn)** : `MapMarker` est basé sur le DOM et convient bien jusqu'à quelques centaines de marqueurs — largement suffisant pour le nombre de points par sous-zone dans ce projet. Ne PAS utiliser cette approche si un jour une édition dépasse plusieurs milliers de points ; dans ce cas seulement, passer à une source GeoJSON + layer (voir doc mapcn, section "Advanced/GeoJSON").

**Ne pas utiliser `MarkerPopup` de mapcn pour le détail** : ce composant est pensé pour un contenu court (info-bulle). Le détail complet (statut, résumé, sources) est géré par notre propre panneau Vaul (voir Partie 4), déclenché par le `onClick` sur le contenu du marqueur, pas par le popup intégré de mapcn.

### 2.2 Affichage progressif par zoom — avec le hook `useMap` de mapcn
Comme les marqueurs sont maintenant des composants React (`MapMarker`), l'affichage progressif se fait en filtrant le tableau de points avant de le mapper, à partir du zoom courant exposé par mapcn (`useMap`) — pas en ajoutant des layers MapLibre manuels :

```tsx
import { useMap } from "@/components/ui/map";

function ZonePoints({ points }: { points: Point[] }) {
  const { zoom } = useMap(); // valeur de zoom actuelle, mise à jour par mapcn

  const visiblePoints = points.filter(p => zoom >= p.zoom_min_marker);

  return visiblePoints.map((point) => (
    <MapMarker key={point.id} longitude={point.coordinates.lng} latitude={point.coordinates.lat}>
      <MarkerContent>{/* ... */}</MarkerContent>
      {zoom >= point.zoom_min_label && <MarkerLabel position="bottom">{point.name}</MarkerLabel>}
    </MapMarker>
  ));
}
```
**Garde-fou** : si `useMap` déclenche un re-render à chaque pixel de zoom (comportement à vérifier dans la doc au moment du build), throttle la valeur utilisée pour le filtrage (ex. arrondir `zoom` à l'entier le plus proche avant de filtrer) pour éviter des re-renders excessifs pendant un pincement de zoom continu.

### 2.3 Clic sur un point
Déjà couvert dans l'exemple de 2.1 : le `onClick` est posé directement sur le contenu du marqueur (`MarkerContent`), pas sur un layer MapLibre bas niveau — mapcn gère la délégation d'événement en interne. Le curseur `pointer` au survol est déjà géré par la classe `cursor-pointer` de l'exemple.

### 2.4 Barre de recherche — garde-fous fonctionnels
- **Debounce obligatoire** : ne pas relancer la recherche à chaque frappe sans délai — utiliser un debounce de 150-200ms, sinon l'interface rame sur mobile bas de gamme.
- **Recherche insensible à la casse ET aux accents** : "almadies" doit matcher "Almadies", et une recherche sans accent doit matcher un nom accentué. Normaliser les deux chaînes avant comparaison :
```js
function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
// puis : normalize(query) est comparé à normalize(point.name)
```
- La recherche filtre sur `name` (promoteur/projet) ET sur `zone_name` — un utilisateur peut chercher par l'un ou l'autre.
- Résultat de recherche cliqué → `map.flyTo({ center: [lng, lat], zoom: 15 })` puis ouverture du panneau de détail du point correspondant.

### 2.5 Panneau de détail — contenu exact à afficher
Champs du JSON (Partie 3) à afficher, dans cet ordre, aucun champ omis :
1. `name`
2. Badge de statut coloré, avec le libellé exact : "Agréé" (vert), "Rumeur non confirmée" (jaune), "Confirmé" (rouge) — jamais afficher la valeur brute `agree`/`rumeur`/`confirme`
3. `summary`
4. Liste des `sources` : chaque source est un lien cliquable (`<a href={source.url} target="_blank" rel="noopener noreferrer">`) affichant `source.title`, avec une icône différente selon `source.type` (presse/justice/officiel)
5. `last_verified`, affiché en format lisible (ex. "Vérifié le 30 août 2026"), pas la chaîne ISO brute

---

## 3. Format des données — chargement et garde-fous de validation

### 3.1 Chargement statique, pas de fetch réseau
```ts
import almadiesData from '@/data/dakar/almadies.json';
import diamniadioData from '@/data/dakar/diamniadio.json';
import rufisqueData from '@/data/dakar/rufisque.json';
```
Import direct en haut du fichier, jamais un `fetch('/data/almadies.json')` côté client — les données sont statiques et connues au build.

### 3.2 Schéma (à valider avec zod ou équivalent, pas juste supposé correct)
```ts
import { z } from 'zod';

const SourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  date: z.string(),
  type: z.enum(['presse', 'justice', 'officiel'])
});

const PointSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal('promoteur'),
  coordinates: z.object({ lat: z.number(), lng: z.number() }),
  status: z.enum(['agree', 'rumeur', 'confirme']),
  zoom_min_marker: z.number(),
  zoom_min_label: z.number(),
  summary: z.string(),
  sources: z.array(SourceSchema).min(1), // GARDE-FOU : jamais de point sans source
  last_verified: z.string()
});

const ZoneDataSchema = z.object({
  zone_id: z.string(),
  zone_name: z.string(),
  zone_center: z.object({ lat: z.number(), lng: z.number() }),
  points: z.array(PointSchema)
});
```
**Garde-fou explicite** : valider chaque fichier de zone avec ce schéma au démarrage (ou en test), et faire échouer le build si un point n'a aucune source — un point sans source ne doit jamais pouvoir s'afficher (rappel du risque de diffamation évoqué dans le document business).

### 3.3 Conversion en GeoJSON (fonction utilitaire attendue)
```ts
function geojsonFromZoneData(zoneData: ZoneData): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: zoneData.points.map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.coordinates.lng, p.coordinates.lat] },
      properties: { ...p, coordinates: undefined } // éviter de dupliquer l'objet imbriqué dans properties
    }))
  };
}
```

---

## 4. Modèle technique de l'interface — couches CSS (lire avant de coder le visuel)

### Le modèle mental : ce n'est PAS une page qui défile
Une interface de type carte (Google Maps, et donc Éclaireur Map) est **un empilement de 3 couches CSS indépendantes, superposées avec `position` et `z-index`** :
- Couche 0 (la carte) remplit tout l'écran, ne bouge jamais dans le flux du document
- Couches au-dessus flottent PAR-DESSUS, sans jamais pousser ni redimensionner la carte
- Chaque couche a une position, un z-index et une taille définis en dur

### Couche 0 — Le canevas carte, via le composant `Map` de mapcn
```
absolute inset-0 z-0
```
```tsx
<div className="absolute inset-0 z-0">
  <Map center={[zoneData.zone_center.lng, zoneData.zone_center.lat]} zoom={12}>
    {/* MapMarker etc., voir 2.1 */}
  </Map>
</div>
```
Le composant `Map` de mapcn gère lui-même l'import CSS et l'initialisation MapLibre en interne. **Sans `styles` défini, mapcn charge par défaut un fond de carte CARTO gratuit, sans clé API, déjà adapté automatiquement au mode sombre/clair** — ne pas ajouter de style personnalisé sauf si un rendu visuel différent est explicitement voulu (dans ce cas, passer une URL via la prop `styles`, ex. `https://tiles.openfreemap.org/styles/positron`).

`<html>`/`<body>` : `height: 100%; overflow: hidden` sur les routes `/[edition]` — jamais de scroll de page, la carte gère son propre déplacement via ses gestes.

### Couche 1 — Contrôles flottants, via `MapControls` de mapcn
```tsx
import { MapControls } from "@/components/ui/map";

<Map center={...} zoom={12}>
  <MapControls className="absolute bottom-6 right-4 z-10" position="bottom-right" />
  {/* SearchBar en composant séparé, positionné manuellement */}
</Map>
```
`MapControls` fournit déjà les boutons zoom (+/-) stylés — ne pas les recoder à la main. La barre de recherche reste un composant maison (elle doit interroger nos données JSON, pas une fonctionnalité native de mapcn) :
```
Barre de recherche : absolute top-4 left-1/2 -translate-x-1/2 z-10, max-w-md (pas 100% sur desktop)
```

### Couche 2 — Panneau de détail : NE PAS coder le glissement à la main, utiliser Vaul
**Ne pas implémenter la physique du glissement manuellement** (calculs de `touchstart`/`touchmove`/vélocité) — utiliser la librairie **Vaul** (gratuite, open-source, MIT, ~7kB), faite exactement pour ce cas d'usage. Elle gère nativement le drag, la vélocité, les points d'accroche (snap points) et l'accessibilité — un agent qui recode cette physique à la main produit presque toujours un résultat qui "ne se sent pas" fluide au toucher.

**Avantage clé** : Vaul supporte un prop `direction` (`bottom`, `right`, `left`, `top`) — un seul composant sert de feuille du bas sur mobile ET de panneau latéral sur desktop, juste en changeant `direction` selon la largeur d'écran :

```jsx
import { Drawer } from 'vaul';

<Drawer.Root
  direction={isDesktop ? 'right' : 'bottom'}
  snapPoints={isDesktop ? undefined : [0.15, 0.5, 0.92]}
  activeSnapPoint={snap}
  setActiveSnapPoint={setSnap}
  modal={false} // GARDE-FOU : pas d'overlay sombre, la carte reste visible/interactive derrière — comportement Google Maps, pas un modal classique
>
  <Drawer.Portal>
    <Drawer.Content className={cn(glass, "rounded-t-[28px] md:rounded-l-[28px] md:rounded-t-none md:w-[400px]")}>
      <Drawer.Handle className="mx-auto mt-2 h-1 w-9 rounded-full bg-neutral-300 md:hidden" />
      {/* contenu défini en 2.5 */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```
Un seul composant — jamais deux implémentations séparées "PanelMobile"/"PanelDesktop".

### Points d'accroche mobile, calqués sur le comportement réel de Google Maps
| État | Hauteur | Contenu visible |
|---|---|---|
| Peek (0.15) | ~15% de l'écran | Poignée + nom + badge de statut uniquement |
| Mi-hauteur (0.5) | 50% de l'écran | + résumé |
| Plein (0.92) | 92% (jamais 100% — garder une fine bande de carte visible en haut) | Tout, y compris les sources |

- **Vélocité, pas seulement distance** : un flick rapide doit pouvoir sauter directement au point d'accroche suivant même sur une petite distance — comportement par défaut de Vaul, ne pas le désactiver (ne pas utiliser `snapToSequentialPoint`).
- **Synchroniser la carte avec le panneau** : quand le point d'accroche change, ajuster le padding de la carte pour garder le point sélectionné visible au-dessus du panneau, pas cette étape n'est pas optionnelle :
```js
map.easeTo({ padding: { bottom: currentSheetHeightPx }, duration: 300 });
```
Appeler ceci à chaque changement de snap point (callback `setActiveSnapPoint`), pas une seule fois à l'ouverture.

**⚠️ Point à trancher — Google Maps desktop met son panneau à GAUCHE, pas à droite.** Sur le vrai Google Maps, le panneau de détail remplace la barre latérale de recherche à gauche ; il ne flotte pas par-dessus la carte à droite. La spec actuelle de ce document (panneau flottant à droite, style verre) est un choix esthétique déjà pris plus tôt dans le projet, pas une reproduction littérale de Google Maps. Si tu veux vraiment du "millimètre" jusque dans ce détail sur desktop, il faudrait passer à un panneau ancré à gauche qui pousse la carte plutôt qu'un panneau flottant — je ne fais pas ce changement sans confirmation, puisqu'il contredit une décision déjà prise.

### Règles de gestes sur la carte, par plateforme
| Geste | Mobile/Tablette | Desktop |
|---|---|---|
| Déplacer (pan) | 1 doigt | Clic-glisser |
| Zoomer | Pincement 2 doigts | Molette (avec `cooperativeGestures`, qui affiche automatiquement une info-bulle "Ctrl + molette pour zoomer") |
| Rotation | **Désactivée volontairement** — carte toujours orientée nord, plus prévisible pour ce cas d'usage | Désactivée également |

```js
map.touchZoomRotate.disableRotation();
map.dragRotate.disable();
```

### Barre de recherche — plein écran sur mobile, comme Google Maps
- Desktop/tablette : champ flottant classique, liste de suggestions déroulante sous le champ
- Mobile : au tap sur le champ, la recherche passe en **plein écran** (`fixed inset-0 z-40 bg-white`), avec une flèche de retour à gauche pour fermer et revenir à la carte, liste de résultats qui se remplit sous le champ au fur et à mesure de la frappe — une simple liste déroulante étroite est trop peu lisible sur mobile

### La "classe verre" — une seule définition, réutilisée partout
```
glass = "bg-white/65 dark:bg-neutral-900/65 backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
```
Appliquée identique à : nav au scroll, barre de recherche, boutons de zoom, panneau de détail, cartes du tableau de bord.

### Garde-fous d'initialisation — CAUSE FRÉQUENTE DE CARTE BLANCHE, à vérifier dans cet ordre exact
1. **Le composant `Map` de mapcn gère déjà l'import CSS MapLibre en interne** — ne pas chercher à l'importer séparément, mais vérifier que l'installation via `npx shadcn@latest add @mapcn/map` s'est bien terminée sans erreur.
2. **Le conteneur parent doit avoir une hauteur explicite AVANT que la carte s'y monte** — `absolute inset-0` ne fonctionne que si un ancêtre a déjà `height: 100%` ou `h-screen`. Vérifier concrètement que `<html>`, `<body>`, et tout wrapper intermédiaire ont bien une hauteur définie, pas seulement `height: auto`. **C'est la cause la plus probable si la carte reste blanche même avec mapcn installé.**
3. **Style par défaut suffisant** : sans prop `styles`, `<Map>` charge un fond CARTO gratuit et thématisé automatiquement — ne pas ajouter de style personnalisé sauf besoin visuel spécifique (option : `styles="https://tiles.openfreemap.org/styles/positron"` pour un rendu plus épuré si le défaut ne convient pas).
### Table de correspondance responsive (résumé)
| Élément | < 768px | ≥ 768px |
|---|---|---|
| Panneau de détail | Vaul, `direction="bottom"`, snap points 0.15/0.5/0.92 | Vaul, `direction="right"`, largeur fixe 400px |
| Barre de recherche | plein écran au focus | champ flottant + liste déroulante |
| Boutons de zoom | 44x44px minimum (tactile) | 36x36px possible |
| Rotation carte | désactivée | désactivée |

---

## 5. Direction artistique — pages et composants (code exact)

### Références visuelles obligatoires
apple.com (page produit récente) et chariow.com (accueil) — standards à égaler, pas une inspiration vague.

### 5.A Page de vente `/[edition]` (route publique, distincte du contenu carte protégé)
Structure de fichiers :
```
app/[edition]/page.tsx           → redirige vers vente OU carte selon accès (voir Partie 6)
app/[edition]/vente/page.tsx     → la page de vente elle-même (composants ci-dessous)
```

Ordre des sections, chacune un composant séparé :
```
app/[edition]/vente/
  ├── Nav.tsx
  ├── Hero.tsx
  ├── ProofStats.tsx
  ├── HowItWorks.tsx
  ├── ProductPreview.tsx
  ├── PricingCTA.tsx   → contient le widget Snap
  └── Footer.tsx
```

**Nav.tsx** — garde-fou : état de scroll géré par un seul listener passif, pas un re-render par pixel scrollé :
```jsx
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, []);
```
Classes : `fixed top-0 inset-x-0 z-30 transition-colors duration-300`, avec `bg-transparent` si `!scrolled`, sinon la classe `glass`.

**Hero.tsx** :
```jsx
<section className="py-24 md:py-32 max-w-6xl mx-auto px-6 text-center">
  <h1 className="text-5xl md:text-7xl font-semibold tracking-tight">
    Vérifiez avant d'investir à Dakar
  </h1>
  <p className="mt-4 text-lg md:text-xl text-neutral-500">
    Un sous-titre d'une phrase, pas un paragraphe.
  </p>
  <button className="mt-8 ...">Débloquer l'édition</button>
  <div className="mt-16 rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] overflow-hidden">
    {/* capture réelle de la carte, pas une image stock */}
  </div>
</section>
```

**ProofStats.tsx** : `grid grid-cols-1 md:grid-cols-3 gap-8`, chaque chiffre en `text-4xl md:text-6xl font-semibold`.

**PricingCTA.tsx** — intégration Snap, garde-fou important :
```jsx
useEffect(() => {
  // Le script Snap de Chariow s'initialise sur un élément avec un id précis
  // fourni par le tableau de bord Chariow — ne jamais recréer ce comportement
  // manuellement, utiliser le snippet officiel tel quel dans ce composant.
}, []);

<div id="chariow-widget" data-product-id={editionProductId} data-email={session?.user?.email} />
```
**Garde-fou** : pré-remplir `data-email` avec l'email de la session Google active (voir Partie 6) pour éviter le décalage email Google / email de paiement identifié plus tôt.

### 5.B La carte `/[edition]` (contenu protégé)
Couvert en détail Partie 4. Rappel : contrôles de zoom minimalistes (2 boutons uniquement), pas de barre d'outils chargée.

### 5.C Tableau de bord `/tableau-de-bord`
```jsx
<h1 className="text-3xl font-semibold px-6 pt-12">Vos éditions</h1>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
  {editions.map(edition => (
    <EditionCard key={edition.id} edition={edition} owned={ownedEditionIds.includes(edition.id)} />
  ))}
</div>
```
`EditionCard.tsx` — garde-fou : jamais un tableau de données brut, toujours une carte visuelle avec miniature en fond :
```jsx
<div className="relative rounded-3xl overflow-hidden aspect-[4/3] group cursor-pointer
                 transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
  <img src={edition.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
  <div className="absolute bottom-4 left-4 text-white font-semibold text-lg">{edition.name}</div>
  {owned
    ? <span className="absolute top-4 right-4 ...badge...">Débloqué</span>
    : <button className="absolute top-4 right-4 ...">Débloquer</button>}
</div>
```

### Style visuel — verre liquide (rappel des valeurs exactes)
- `backdrop-filter: blur(24-32px) saturate(180%)`
- Clair : `rgba(255,255,255,0.65)` — Sombre : `rgba(28,28,30,0.65)`, piloté par `prefers-color-scheme`
- Bordure : `1px solid rgba(255,255,255,0.3)`
- Coins arrondis 20-28px, jamais d'angle droit
- Ombres douces et diffuses uniquement

### Typographie
- `-apple-system, BlinkMacSystemFont`, repli **Inter**
- 2-3 poids max, texte courant ≥15px sur mobile

### Ce qu'on NE construit PAS pour le MVP
- Pas de clustering algorithmique (le seuil de zoom en 2.2 suffit)
- Pas de tableau de bord d'administration (données modifiées dans le code, redéployées)
- Pas de multi-langue (français uniquement)
- Pas de mode hors-ligne

---

## 6. Compte utilisateur & accès (Google + base de données) — flux et garde-fous exacts

### Architecture
- **Auth** : NextAuth.js, provider Google, stratégie de session **JWT** (pas de session base de données — plus simple, et compatible Edge Runtime pour le middleware)
- **Base de données** : Supabase (tier gratuit), une seule table

```sql
create table purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  edition_id text not null,
  chariow_sale_id text not null unique, -- GARDE-FOU : contrainte unique pour l'idempotence
  status text not null check (status in ('active', 'refunded')),
  created_at timestamptz default now()
);

create index on purchases (email, edition_id);
```

### 6.1 Webhook Chariow — garde-fous de sécurité et d'idempotence
```ts
// app/api/webhooks/chariow/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('x-chariow-signature');
  const rawBody = await req.text();

  // GARDE-FOU 1 : vérifier la signature AVANT de parser/faire confiance au contenu
  if (!verifySignature(rawBody, signature, process.env.CHARIOW_WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === 'sale.completed') {
    // GARDE-FOU 2 : idempotence — un webhook peut être envoyé plusieurs fois
    // (retry réseau) ; ne jamais insérer en double, utiliser un upsert sur
    // chariow_sale_id (contrainte unique définie dans le schéma SQL)
    await supabase.from('purchases').upsert({
      email: event.data.customer.email,
      edition_id: event.data.custom_metadata.edition_id, // transmis à l'achat, voir 6.2
      chariow_sale_id: event.data.sale.id,
      status: 'active'
    }, { onConflict: 'chariow_sale_id' });
  }

  if (event.type === 'sale.refunded') {
    await supabase.from('purchases')
      .update({ status: 'refunded' })
      .eq('chariow_sale_id', event.data.sale.id);
  }

  // GARDE-FOU 3 : toujours répondre 200 rapidement une fois le traitement fait,
  // sinon Chariow réessaiera indéfiniment
  return new Response('OK', { status: 200 });
}
```

### 6.2 Lier l'édition à l'achat
Au moment de créer la session de paiement (ou dans la config du widget Snap), transmettre `custom_metadata: { edition_id: 'dakar' }` — c'est ce champ qui revient dans le webhook et permet de savoir quelle édition a été achetée (un seul produit Chariow peut donc, si besoin, servir plusieurs éditions, ou un produit par édition — dans tous les cas, `edition_id` doit être présent dans les métadonnées).

### 6.3 Connexion et lecture des accès
```ts
// middleware.ts — Edge Runtime, donc utiliser le client Supabase compatible fetch, pas un driver Postgres direct
export async function middleware(req: NextRequest) {
  const session = await getToken({ req }); // NextAuth JWT

  const edition = extractEditionFromPath(req.nextUrl.pathname);
  if (edition && requiresAccess(req.nextUrl.pathname)) {
    if (!session) return NextResponse.redirect(new URL('/connexion', req.url));

    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('email', session.email)
      .eq('edition_id', edition)
      .eq('status', 'active')
      .maybeSingle();

    if (!data) return NextResponse.redirect(new URL(`/${edition}/vente`, req.url));
  }

  return NextResponse.next();
}
```
**Garde-fou** : `requiresAccess` doit exclure explicitement `/[edition]/vente` de la protection — c'est la route publique, seule `/[edition]` (la carte) est protégée.

### 6.4 Variables d'environnement attendues (à ne pas oublier)
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CHARIOW_API_KEY
CHARIOW_WEBHOOK_SECRET
```

### Structure de fichiers
```
lib/auth/config.ts
lib/db/client.ts
lib/license/verifySignature.ts
app/api/webhooks/chariow/route.ts
app/connexion/page.tsx
app/tableau-de-bord/page.tsx
app/[edition]/page.tsx
app/[edition]/vente/page.tsx
middleware.ts
data/dakar/almadies.json
data/dakar/diamniadio.json
data/dakar/rufisque.json
```

---

## 7. Stack technique — dépendances exactes
- **Next.js** (App Router) — Vercel (gratuit)
- **mapcn** — composants de carte prêts à l'emploi (Map, MapControls, MapMarker...), installés via `npx shadcn@latest add @mapcn/map` — construit sur MapLibre GL en interne, ne pas installer/coder MapLibre séparément à côté
- **vaul** — panneau de détail (feuille mobile / panneau desktop), gestion native du drag et des points d'accroche
- **zod** — validation des données statiques (Partie 3.2)
- **next-auth** — auth Google
- **@supabase/supabase-js** — client compatible Edge Runtime
- **clsx** ou **tailwind-merge** (fonction `cn`) — composition de classes conditionnelles (utilisée partout en Partie 4-5)

*Ces choix doivent être revérifiés au moment du build (tarifs/limites des tiers gratuits, versions des librairies évoluent).*