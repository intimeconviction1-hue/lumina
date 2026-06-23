import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Migration maps
const STATUS_MAP = {
  "en veille": "En veille", "enveille": "En veille",
  "visionné": "Visionné", "visionne": "Visionné", "terminé": "Visionné", "termine": "Visionné",
  "en cours": "En cours", "encours": "En cours",
  "pas sorti": "Pas sorti", "passorti": "Pas sorti",
  "à découvrir": "En veille", "adécouvrir": "En veille",
  "priorité": "En veille", "priorite": "En veille",
  "abandonné": "En veille",
};

const PLATFORM_MAP = {
  "netflix": "Netflix", "arte": "Arte", "apple": "Apple",
  "francetv": "FranceTV", "france tv": "FranceTV", "france.tv": "FranceTV",
  "ciné": "Ciné", "cine": "Ciné", "cinéma": "Ciné",
  "onedrive": "OneDrive", "one drive": "OneDrive",
  "yggtorrent": "Yggtorrent", "ygg": "Yggtorrent",
  "okru": "OKRU", "ok.ru": "OKRU",
  "khan israël": "Khan Israël", "khan israel": "Khan Israël", "khan": "Khan Israël",
  "ikromi": "IKROMI",
  "lenny": "Lenny",
};

const GENRE_MAP = {
  "polar": "polar", "thriller": "thriller", "drame": "drame", "drama": "drame",
  "comédie": "comédie", "comedie": "comédie", "comedy": "comédie",
  "psychologique": "psychologique", "psychological": "psychologique",
  "famille": "famille", "family": "famille",
  "manipulation": "thriller",
  "enquête": "enquête", "enquete": "enquête",
  "procès": "procès", "proces": "procès",
  "justice": "justice",
  "morale": "drame",
  "politique": "politique", "political": "politique",
  "société": "société", "societe": "société", "social": "société",
  "relations": "société",
  "satire": "satire",
  "religion": "religion",
  "survie": "drame",
  "huis clos": "huis clos", "huisclos": "huis clos",
  "éducation": "éducation", "education": "éducation",
  "institutions": "institutions",
  "classique": "classique", "classic": "classique",
  "contemporain": "société",
  "guerre": "guerre", "war": "guerre",
  "résistance": "résistance", "resistance": "résistance",
};

const COUNTRY_MAP = {
  "israël": "Israël", "israel": "Israël",
  "france": "France",
  "italie": "Italie", "italy": "Italie",
};

const ALL_PLATFORMS = new Set(Object.values(PLATFORM_MAP));
const ALL_STATUSES = new Set(Object.values(STATUS_MAP));

function normalizeTag(t) {
  return t.toLowerCase().trim().replace(/\s+/g, ' ');
}

function migrateWork(work) {
  const tags = work.tags || [];
  const updates = {};

  // Skip if already migrated (has new status AND no legacy tags)
  const newStatuses = ["Visionné", "En veille", "En cours", "Pas sorti"];
  const alreadyMigrated = newStatuses.includes(work.status) && !tags.length;
  if (alreadyMigrated) return null;

  // Force normalize status even if no tags (handles bare legacy statuses)
  if (!tags.length && work.status) {
    const norm = normalizeTag(work.status);
    const mapped = STATUS_MAP[norm];
    if (mapped) return { status: mapped };
    return null;
  }

  const genres = new Set(work.genre || []);
  const platforms = new Set(work.platform || []);
  let status = null;
  let year = work.year || work.released_year || null;
  let country = work.country || null;
  let language = work.language || null;

  for (const tag of tags) {
    const n = normalizeTag(tag);

    // Status
    if (STATUS_MAP[n]) { status = STATUS_MAP[n]; continue; }

    // Platform
    if (PLATFORM_MAP[n]) { platforms.add(PLATFORM_MAP[n]); continue; }

    // Genre
    if (GENRE_MAP[n]) { genres.add(GENRE_MAP[n]); continue; }

    // Country
    if (COUNTRY_MAP[n]) { country = COUNTRY_MAP[n]; continue; }

    // Year (4-digit number)
    if (/^\d{4}$/.test(n)) { year = parseInt(n); continue; }

    // Language
    if (n === "vo") { language = "VO"; continue; }
    if (n === "vf") { language = "VF"; continue; }
  }

  // Normalize existing status if old format
  if (!status) {
    const existingNorm = normalizeTag(work.status || "");
    status = STATUS_MAP[existingNorm] || "En veille";
  }

  updates.status = status;
  updates.genre = [...genres];
  updates.platform = [...platforms];
  updates.tags = []; // clear tags after migration
  if (year) updates.year = year;
  if (country) updates.country = country;
  if (language) updates.language = language;

  return updates;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const works = await base44.asServiceRole.entities.Works.list('-created_date', 1000);
  const results = { migrated: 0, skipped: 0, errors: [] };

  for (const work of works) {
    const updates = migrateWork(work);
    if (!updates) { results.skipped++; continue; }
    await base44.asServiceRole.entities.Works.update(work.id, updates);
    results.migrated++;
  }

  return Response.json({ success: true, ...results, total: works.length });
});