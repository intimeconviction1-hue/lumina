# CLAUDE.md — Lumina (« Ma Culture »)

> Ce fichier est lu automatiquement par Claude Code à l'ouverture du projet.
> Il donne tout le contexte pour travailler sur l'app sans repartir de zéro.
> **Écris tes réponses et tes commentaires de code en français.**

## 1. C'est quoi

Lumina est une **bibliothèque personnelle de suivi d'œuvres** (films, séries, livres,
documentaires, podcasts, vidéos, articles). Usage privé (2 personnes). On y range ce
qu'on veut voir/lire, ce qu'on a en cours, ce qu'on a terminé, avec notes, tags,
favoris, priorités, filtres et suggestions.

Projet migré de la plateforme **Base44** vers un backend maison. Il n'y a **pas de
compte / pas d'authentification** : utilisateur unique toujours connecté
(`src/lib/AuthContext.jsx` est un stub volontaire). Ne pas reconstruire d'auth sans
qu'on le demande.

## 2. Stack

- **Front** : React 18 + Vite 6, React Router v6, TanStack Query v5, Tailwind + shadcn/ui
  (les primitives sont dans `src/components/ui/`), Framer Motion, Recharts, lucide-react.
- **Données** : fonctions serverless Vercel sous `api/`, base **Neon (Postgres)** via
  `@neondatabase/serverless`. Le front parle à `/api/works` (façade dans `src/api/works.js`).
- **Images** : Vercel Blob (`api/upload.js`), couvertures livres via `api/cover.js`.
- **Déploiement** : le dépôt est sur GitHub ; l'utilisateur pousse via **GitHub Desktop**
  et **Vercel redéploie automatiquement** à chaque push. Pas de CI/CD à gérer.

## 3. Lancer en local

```bash
npm install
npm run dev        # front Vite (les routes /api ne répondent PAS avec vite seul)
vercel dev         # pour tester aussi les fonctions serverless /api
npm run build      # build de prod (doit toujours passer avant de livrer)
npm run lint       # ESLint — doit rester à 0 erreur
```

Variables d'environnement (fichier `.env.local` en local, et Settings Vercel en prod) :

```
DATABASE_URL=postgres://…            # chaîne Neon (requise par /api/works)
BLOB_READ_WRITE_TOKEN=vercel_blob_…  # requise par /api/upload (couvertures)
```

⚠️ En local sans `DATABASE_URL`, l'app s'affiche mais reste vide (aucune donnée).
Pour voir de vraies données, utiliser le déploiement Vercel.

## 4. Architecture (repères)

- `src/pages.config.js` — **source unique des routes**. Une entrée dans `PAGES`
  (clé = chemin d'URL) = une `<Route>` générée dans `src/App.jsx`. Les pages sont
  **chargées à la demande** (`React.lazy`) ; la frontière `<Suspense>` est dans `Layout.jsx`.
  Pour ajouter une page : créer le fichier dans `src/pages/`, l'importer en `lazy()` ici,
  l'ajouter à `PAGES`.
- `src/Layout.jsx` — enveloppe commune (sidebar, header, bottom nav, modale d'ajout,
  panneau de filtres). Il **injecte les props** dans la page courante via
  `React.cloneElement(children, childProps)` : `searchQuery`, `filters`, `onFiltersChange`,
  `onEditWork`, `onAddWork`. Une page reçoit donc ces props sans que App les passe.
- `src/hooks/useWorks.js` — lecture (`useQuery`, clé `WORKS_KEY = ["works"]`, charge
  jusqu'à 5000 œuvres et filtre côté client).
- `src/hooks/useWorkMutations.js` — **toutes les écritures** (create/update/delete) avec
  mise à jour optimiste, rollback + toast en cas d'échec, invalidation. **Toujours passer
  par ce hook**, ne pas refaire de `setQueryData`/`await`/`invalidate` à la main.
- `src/lib/statusActions.js` — **source unique de la logique de statuts** (voir §6, critique).
- `src/api/works.js` — façade `fetch` (list/get/create/update/remove) vers `/api/works`.
- `api/` — fonctions serverless. `api/_lib.js` mutualise SQL + colonnes autorisées ;
  `api/works.js` (GET liste / POST) et `api/works/[id].js` (GET/PATCH/DELETE) = CRUD.
  Autres endpoints utilitaires : `cover.js`, `upload.js`, `enrich-films.js`, `import-*.js`,
  `clean-genres.js`, `migrate-tags.js`.

## 5. Conventions à respecter

- **Thème (clair/sombre)** : les couleurs viennent de tokens CSS définis dans
  `src/globals.css` (`:root` = clair, `[data-theme="dark"]` = sombre). **Ne JAMAIS coder
  une couleur de fond/texte en dur** (`#fff`, `bg-gray-50`, `text-gray-900`…). Utiliser
  `var(--bg)`, `var(--surface)`, `var(--card-bg)`, `var(--text-primary)`,
  `var(--text-secondary)`, `var(--text-muted)`, `var(--border)`, `var(--border-subtle)`.
  Exception : du texte blanc (`#fff`) posé sur un fond de couleur pleine est OK.
- **Statuts** : ne jamais comparer `work.status` brut. Toujours passer par les helpers de
  `statusActions.js` (voir §6).
- **Écritures BD** : toujours via `useWorkMutations`.
- Commentaires et messages en **français**.
- Après toute modif : `npm run build` **et** `npm run lint` doivent passer (0 erreur).

## 6. Modèle de statuts — LE point à comprendre (déjà source de bugs)

Un même statut « logique » s'affiche différemment selon le **type** d'œuvre. La règle est
centralisée dans `statusActions.js`. **Ne dupliquez jamais cette logique ailleurs.**

Valeurs **stockées** en base : `"À voir"`, `"En cours"`, `"Visionné"`, `"Pas sorti"`,
`"Envie de lire"`, plus un legacy `"Lu"` (livres) et de vieux statuts à nettoyer
(`"En veille"`, `"terminé"`, `"done"`, `"à découvrir"`, `"abandonné"`).

Le **formulaire** stocke un livre terminé comme `"Visionné"` (pas `"Lu"`) et un livre
à lire comme `"Envie de lire"`.

Fonctions à utiliser :

- `effectiveStatus(work)` → **statut logique**, tenant compte du type :
  - livre : à lire → `"Envie de lire"`, terminé → `"Lu"`.
  - autres : terminé → `"Visionné"`. (un `"Lu"` sur un non-livre est ramené à `"Visionné"`.)
  - applique aussi les alias legacy (`"En veille"` → `"À voir"`, etc.).
- `filterStatus` = alias de `effectiveStatus`.
- `matchesStatusFilter(work, selectedArray)` → pour filtrer une liste.
- `isFinished(work)` → vrai si vu OU lu.
- `normalizeNavStatus(status)` → normalise une valeur venant d'un lien de nav / d'une URL
  (legacy → courant) **en préservant** `"Lu"` et `"Envie de lire"`.
- `STATUS_CONFIG` (couleurs/labels par statut), `STATUS_ACTIONS` (actions contextuelles),
  `STATUSES` (liste pour le formulaire — **ne contient pas `"Lu"`** ; c'est voulu).

Conséquence clé : **un livre terminé n'apparaît PAS dans « Visionnés » (films/séries)** ;
il est dans « Lus ». Les deux vocabulaires (voir/lire) coexistent via le type.

## 7. Ce qui a été fait récemment

- Sortie de Base44 : backend Neon/Vercel, dépendances inutilisées retirées, dossier
  `base44/` supprimé, backend factorisé (`api/_lib.js`).
- Mutations unifiées dans `useWorkMutations` (optimistic + rollback + toast).
- Routing réconcilié (toutes les pages dans `pages.config.js`).
- **Cohérence des statuts** : logique centralisée, livres séparés des « Visionnés »
  (nouveau « Lus »), toutes les comparaisons brutes remplacées par les helpers.
- **Dark mode** : formulaire d'ajout/édition et Header réparés (étaient figés en clair).
- **Perf** : code-splitting par page (bundle principal 665 ko → 358 ko).

## 8. Pistes restantes (non faites)

1. **Audit « actif »** : la page `Audit.jsx` ne fait que *signaler* (doublons, statuts
   legacy, champs manquants). Ajouter des boutons pour corriger en 1 clic
   (fusionner/supprimer doublons, convertir les vieux statuts).
2. **Couvertures films/séries** : `Enrichissement.jsx` + `api/cover.js` ne gèrent que les
   livres. Étendre aux films/séries (API type TMDB).
3. **Revue dark mode complète** : re-vérifier chaque écran en sombre (captures).
4. **« Supprimer mon compte »** (`Sidebar.jsx`) : efface tout mais par lots de 500 et sans
   confirmation chiffrée ; à fiabiliser ou retirer.
5. (Optionnel, refusé jusqu'ici) **Sécuriser `/api`** : les endpoints sont ouverts, sans
   jeton — n'importe qui connaissant l'URL peut lire/écrire/supprimer la base.

## 9. Méthode de travail attendue

- Faire des changements ciblés, vérifiés (`build` + `lint`), et expliquer en français.
- Pour livrer : soit éditer directement les fichiers si tu es dans le dépôt cloné (l'utilisateur
  commit/push via GitHub Desktop, Vercel déploie), soit indiquer précisément les fichiers touchés.
- Ne pas introduire de nouvelle dépendance sans raison ; préférer l'existant (shadcn/ui, lucide, framer-motion).
