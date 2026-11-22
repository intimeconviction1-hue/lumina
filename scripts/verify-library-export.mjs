import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function verifyLibraryExport(data) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, errors: ['Document JSON invalide'] };
  if (data.format !== 'lumina-works-export' || data.version !== 1) errors.push('Format ou version non reconnus');
  if (!Number.isFinite(Date.parse(data.exported_at))) errors.push("Date d'export invalide");
  if (!Array.isArray(data.works)) errors.push('Liste works manquante');
  if (!Number.isSafeInteger(data.count) || data.count < 0) errors.push('Compteur count invalide');
  if (Array.isArray(data.works)) {
    if (data.count !== data.works.length) errors.push("Le compteur d'œuvres ne correspond pas à la liste");
    const ids = new Set();
    for (const [index, work] of data.works.entries()) {
      if (!work || typeof work !== 'object' || typeof work.id !== 'string' || !work.id.trim()) {
        errors.push(`Identifiant d'œuvre invalide à l'index ${index}`);
        continue;
      }
      if (ids.has(work.id)) errors.push(`Identifiant d'œuvre en double à l'index ${index}`);
      ids.add(work.id);
    }
  }
  // Older exports did not include person_studies. They remain verifiable,
  // but are explicitly marked as incomplete for this secondary table.
  const hasStudies = Object.hasOwn(data, 'person_studies');
  if (hasStudies) {
    if (!Array.isArray(data.person_studies)) errors.push('Liste person_studies invalide');
    else if (data.person_studies_count !== data.person_studies.length) errors.push('Compteur person_studies_count incorrect');
  }
  return {
    valid: errors.length === 0,
    errors,
    counts: {
      works: Array.isArray(data.works) ? data.works.length : null,
      personStudies: hasStudies && Array.isArray(data.person_studies) ? data.person_studies.length : null,
    },
    legacyWithoutPersonStudies: !hasStudies,
  };
}

async function main() {
  const filename = process.argv[2];
  if (!filename) {
    console.error('Usage: node scripts/verify-library-export.mjs <fichier.json>');
    process.exitCode = 2;
    return;
  }
  const bytes = await readFile(filename);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const result = verifyLibraryExport(JSON.parse(bytes.toString('utf8')));
  console.log(JSON.stringify({ ...result, sha256 }, null, 2));
  if (!result.valid) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error('Vérification impossible :', error.message);
    process.exitCode = 1;
  });
}
