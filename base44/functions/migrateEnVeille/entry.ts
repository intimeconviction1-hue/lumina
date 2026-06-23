import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Migration one-shot: "En veille" → "À voir"
// Appelé en service role depuis le backend

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all works with status "En veille"
    const works = await base44.asServiceRole.entities.Works.filter({ status: "En veille" }, "-created_date", 500);
    let migrated = 0;

    for (const work of works) {
      if (!work.id) continue;
      await base44.asServiceRole.entities.Works.update(work.id, { status: "À voir" });
      migrated++;
    }

    return Response.json({ success: true, migrated, total: works.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});