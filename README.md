# Lumina

Bibliothèque personnelle de suivi d'œuvres — films, séries, livres, documentaires,
podcasts, etc. On y range ce qu'on veut voir/lire, ce qu'on a en cours et ce qu'on
a terminé, avec notes, tags, favoris, filtres et priorités.

Projet migré de Base44 vers un backend maison : **Neon (Postgres)** exposé par des
**fonctions serverless Vercel**, front **React + Vite + Tailwind**.

## Stack

- **Front** : React 18, Vite, React Router, TanStack Query, Tailwind + shadcn/ui, Framer Motion.
- **Données** : `/api/works` (fonctions serverless Vercel) → base Neon via `@neondatabase/serverless`.
- **Stockage images** : Vercel Blob (`/api/upload`).

## Prérequis

1. Cloner le dépôt puis se placer dans le dossier.
2. Installer les dépendances : `npm install`.
3. Créer un fichier `.env.local` (dev local) et/ou configurer les variables sur Vercel :

```
# Chaîne de connexion Neon (Postgres) — utilisée par les fonctions /api
DATABASE_URL=postgres://user:password@host/db?sslmode=require

# Jeton Vercel Blob — nécessaire pour l'upload de couvertures (/api/upload)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

## Lancer en local

```
npm run dev        # serveur de dev Vite
npm run build      # build de production
npm run preview    # prévisualiser le build
npm run lint       # ESLint
```

> Les routes `/api/*` sont des fonctions serverless Vercel : en dev local, utilise
> `vercel dev` (ou déploie sur Vercel) pour qu'elles répondent, car `vite` seul ne
> sert que le front.

## Structure

- `src/pages/` : une page = une route. Les pages sont déclarées dans `src/pages.config.js`
  (clé = chemin d'URL), et `src/App.jsx` génère une `<Route>` par entrée.
- `src/components/` : UI (`ui/` = primitives shadcn, `layout/`, `home/`, `works/`).
- `src/hooks/` : `useWorks` (lecture) et `useWorkMutations` (create/update/delete
  avec mise à jour optimiste, rollback et toast d'erreur).
- `src/lib/statusActions.js` : source unique de la logique de statuts (config, alias
  legacy, mapping livres).
- `src/api/works.js` : façade `fetch` vers `/api/works`.
- `api/` : fonctions serverless (`_lib.js` mutualise SQL/colonnes ; `works.js` et
  `works/[id].js` = CRUD).

## Note

L'authentification est volontairement neutralisée (`src/lib/AuthContext.jsx` : utilisateur
unique, toujours connecté) — Lumina est une bibliothèque perso.

## Export de la bibliothèque

Depuis **Toutes les œuvres**, le bouton **Exporter** télécharge un fichier JSON
contenant toutes les fiches retournées par l’API (y compris les notes personnelles
et descriptions), ainsi que les inscriptions aux études de personnes. L’export
effectue uniquement une lecture de la base.

Important :
- Les couvertures ne sont pas copiées : seules leurs URL sont conservées.
- Ce fichier ne remplace pas les sauvegardes Neon et Vercel Blob.
- Aucune fonction de restauration/import de ce JSON n’est encore fournie.
- Vérifier le téléchargement, son nombre d’œuvres et conserver le fichier hors du site.
- Si la limite de 10 000 œuvres est atteinte, l’export refuse de produire un fichier
  potentiellement incomplet.

La procédure de vérification, sauvegarde PostgreSQL et restauration de test se trouve dans [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md).
