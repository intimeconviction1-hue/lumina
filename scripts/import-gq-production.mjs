import { getSql } from '../api/_lib.js';
import { gqDocumentaries } from '../server/gqDocumentaries.js';
import { saveGqDocumentaries } from '../server/saveGqDocumentaries.js';

if (process.env.VERCEL_ENV !== 'preview') {
  if (process.env.VERCEL_ENV !== 'production' || process.env.VERCEL_GIT_COMMIT_REF !== 'main'
    || process.env.VERCEL_GIT_REPO_ID !== '1278429963'
    || !process.env.VERCEL_GIT_COMMIT_MESSAGE?.startsWith('Compléter les documentaires GQ [import-production]')) {
    throw new Error('Cible de production Lumina non confirmée.');
  }
  try {
    const result = await saveGqDocumentaries(getSql(), gqDocumentaries);
    if (result.present !== gqDocumentaries.length) throw new Error('Import incomplet');
    console.log(`Import GQ confirmé : ${result.present} fiches présentes, ${result.added} ajoutées, ${result.completed} complétées.`);
  } catch (error) {
    console.error('Échec de l’import GQ en production.', error.code || error.name);
    process.exitCode = 1;
  }
}
