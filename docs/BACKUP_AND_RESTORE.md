# Sauvegardes et restauration de Lumina

## État réel

- L'export **Toutes les œuvres → Exporter** contient les fiches (`works`) avec notes personnelles,
  et les inscriptions aux études de personnes (`person_studies`). Les images ne sont présentes
  que comme URL. L'export ne supprime ni ne modifie aucune donnée.
- Cet export **n'est pas un dump PostgreSQL**. Il ne contient ni schéma ni indexes,
  et Lumina ne propose pas d'import JSON/restauration.
- La rétention des sauvegardes natives de Neon et la sauvegarde réelle des blobs doivent être
  **vérifiées sur les comptes fournisseurs**. Aucune sauvegarde fournisseur n'est présumée active.

## Vérifier un export téléchargé

Depuis une copie locale du dépôt, exécuter :

```bash
node scripts/verify-library-export.mjs ./lumina-bibliotheque-AAAA-MM-JJ.json
```

La sortie contient `valid`, les compteurs, l'empreinte SHA-256 et l'indicateur
`legacyWithoutPersonStudies`. Conserver le JSON et son empreinte hors de Vercel et GitHub.
Ne **jamais** committer l'export : il contient des notes privées.

Cette vérification détecte des incohérences structurelles mais **ne prouve pas**
que toutes les données de production étaient présentes au moment de l'export.

## Sauvegarde complète de PostgreSQL

Depuis un ordinateur de confiance équipé des outils clients PostgreSQL, récupérer
l'URL de connexion **sans la publier dans GitHub ou les journaux**. Utiliser un
utilisateur de base en lecture seule lorsque possible. Exécuter :

```bash
pg_dump --format=custom --no-owner --no-privileges --file=lumina-postgres.backup "$DATABASE_URL"
```

Conserver le fichier dans un espace chiffré, distinct de la base de production.
Il inclut les tables et le schéma accessibles à l'utilisateur DB (dont `works`
et `person_studies`). Vérifier le dump :

```bash
pg_restore --list lumina-postgres.backup
```

Pour tester réellement la restauration : créer d'abord une **base Neon de test
isolée et vide** avec des identifiants différents. Confirmer que
`RESTORE_DATABASE_URL` désigne cette base de test, puis :

```bash
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$RESTORE_DATABASE_URL" lumina-postgres.backup
```

Comparer ensuite les nombres de lignes et plusieurs fiches/notes dans la base de test.
**Ne jamais utiliser la base de production comme destination de ce test.**
Le contrôle du fichier seul n'est pas une restauration éprouvée.

## Sauvegarder les couvertures

Les URL `cover_image` sont des références. Pour disposer d'une restauration indépendante
de Vercel Blob, exporter séparément les objets du stockage Blob vers un espace privé,
en préservant la correspondance entre leurs URL et les fichiers. Les images externes
(TMDB, Open Library, etc.) ne sont pas des objets Blob de Lumina. Vérifier les droits,
les limites de stockage et la possibilité d'export avant toute automatisation.

## Contrôles d'exploitation

1. Confirmer dans Neon la rétention effective des points de restauration, et le type de sauvegarde possible selon le forfait.
2. Télécharger un JSON, valider son format et ranger une copie dans un dossier privé.
3. Produire un dump PostgreSQL, vérifier son inventaire et faire une restauration de test.
4. Tester le téléchargement d'une couverture Vercel Blob et son archivage privé.
5. Programmer une cadence adaptée et consigner la date de la dernière restauration testée.

**Aucune étape ci-dessus ne doit être déclarée accomplie avant une preuve réelle.**
