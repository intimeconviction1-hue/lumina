import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STATUS_MAP = {
  "terminé":     "Visionné",
  "à découvrir": "À voir",
  "abandonné":   "À voir",
  "done":        "Visionné",
  "en cours":    "En cours",
  "En veille":   "À voir",  // migration principale
};

const OFFICIAL = ["À voir", "En cours", "Visionné", "Pas sorti"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) {}
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const works = await base44.asServiceRole.entities.Works.list("-created_date", 500);
    let migrated = 0;
    let skipped = 0;

    for (const work of works) {
      if (!work.id) continue;
      if (OFFICIAL.includes(work.status)) { skipped++; continue; }
      const normalized = STATUS_MAP[work.status] || "À voir";
      try {
        await base44.asServiceRole.entities.Works.update(work.id, { status: normalized });
        migrated++;
      } catch (_e) { skipped++; }
    }

    return Response.json({ success: true, migrated, skipped, total: works.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});