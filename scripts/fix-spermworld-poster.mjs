import { readFile } from 'node:fs/promises';
import { getSql } from '../api/_lib.js';
import { gqDocumentaries } from '../server/gqDocumentaries.js';

if (process.env.VERCEL_ENV !== 'preview') {
  if (process.env.VERCEL_ENV !== 'production' || process.env.VERCEL_GIT_COMMIT_REF !== 'main'
    || process.env.VERCEL_GIT_REPO_ID !== '1278429963'
    || !process.env.VERCEL_GIT_COMMIT_MESSAGE?.startsWith('Corriger l’affiche de Spermworld [production]')) {
    throw new Error('Cible de production Lumina non confirmée.');
  }

  try {
    const work = gqDocumentaries.find(entry => entry.id === 'spermworld');
    const image = await readFile(new URL(`../dist${work.cover_image}`, import.meta.url));
    if (image.toString('ascii', 8, 12) !== 'WEBP') throw new Error('Affiche absente du build');
    const sql = getSql();
    const rows = await sql`
      update works
      set cover_image = ${work.cover_image},
          updated_date = case when cover_image is distinct from ${work.cover_image} then now() else updated_date end
      where lower(trim(title)) = lower(${work.title})
        and (coalesce(year, released_year) is null or coalesce(year, released_year) = ${work.year})
        and type in ('film', 'documentaire', 'vidéo')
      returning cover_image
    `;
    if (!rows.length || rows.some(row => row.cover_image !== work.cover_image)) {
      throw new Error('Fiche Spermworld introuvable');
    }
    console.log('Affiche de Spermworld confirmée en production.');
  } catch (error) {
    console.error('Échec de la correction de l’affiche de Spermworld.', error.code || error.name);
    process.exitCode = 1;
  }
}
