import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Entity automation: triggered on Works update
// Sets started_at when status → "En cours", finished_at when status → "Visionné"
// Does NOT overwrite finished_at if already set (re-watch protection)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    if (event?.type !== 'update') {
      return Response.json({ skipped: true });
    }

    const workId = event.entity_id;
    const newStatus = data?.status;
    const oldStatus = old_data?.status;

    if (newStatus === oldStatus) {
      return Response.json({ skipped: true, reason: 'status unchanged' });
    }

    const updates = {};
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (newStatus === 'En cours' && !data?.started_at) {
      updates.started_at = today;
    }

    // Migration: "En veille" → "À voir" si jamais une donnée legacy arrive
    if (newStatus === 'En veille') {
      updates.status = 'À voir';
    }

    if (newStatus === 'Visionné' && !data?.finished_at) {
      updates.finished_at = today;
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ skipped: true, reason: 'no date update needed' });
    }

    await base44.asServiceRole.entities.Works.update(workId, updates);

    return Response.json({ success: true, workId, updates });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});