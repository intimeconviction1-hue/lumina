import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Récupère tous les works sans filtre, par lots de 500
  const allWorks = await base44.asServiceRole.entities.Works.list('-created_date', 2000);

  const nonBooks = allWorks
    .filter(w => w.type !== 'livre')
    .map(w => ({
      titre: w.title,
      type: w.type,
      statut: w.status,
      année: w.year || w.released_year || null,
      créateur: w.creator || w.creator_name || null,
    }))
    .sort((a, b) => {
      if (a.type < b.type) return -1;
      if (a.type > b.type) return 1;
      return (a.titre || '').localeCompare(b.titre || '', 'fr');
    });

  return Response.json({
    total: nonBooks.length,
    works: nonBooks,
  });
});