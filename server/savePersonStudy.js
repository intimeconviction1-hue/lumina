import { createHash } from 'node:crypto';
import { studyProfile, validStudyId } from './personStudies.js';

export async function savePersonStudy(sql, selection, res) {
  const { catalogue, personId, workIds } = selection;
  if (!validStudyId(catalogue, personId) || !Array.isArray(workIds) || !workIds.length
    || workIds.length > 5000 || workIds.some(id => typeof id !== 'string' || id.length > 32)) {
    return res.status(400).json({ error: 'Sélection d’œuvres invalide.' });
  }
  const ids = new Set(workIds);
  const profile = await studyProfile(catalogue, personId);
  const selected = profile.works.filter(work => ids.has(work.id));
  if (selected.length !== ids.size) {
    return res.status(409).json({ error: 'Le catalogue a changé. Recharge la fiche et vérifie la sélection.' });
  }
  const incoming = selected.map(work => ({
    ...work,
    id: createHash('sha256').update(`lumina:person-study:${catalogue}:${work.id}`).digest('hex').slice(0, 24),
    creator: work.roles.some(role => role !== 'acting') ? profile.name : null,
  }));
  const rows = await sql`
    insert into works (id, title, type, status, year, creator, creator_name, description, cover_image,
                       source_url, genre, created_date, updated_date)
    select i.id, i.title, i.type, i.status, i.year, i.creator, i.creator, i.description, i.cover_image,
           i.source_url, case when i.type = 'documentaire' then array['documentaire'] else array[]::text[] end,
           now(), now()
    from jsonb_to_recordset(${JSON.stringify(incoming)}::jsonb)
      as i(id text, title text, type text, status text, year integer, creator text, description text, cover_image text, source_url text)
    where not exists (
      select 1 from works w
      where w.source_url = i.source_url
         or (lower(trim(w.title)) = lower(i.title)
           and ((i.type = 'livre' and w.type = 'livre'
                 and lower(trim(coalesce(nullif(w.creator, ''), w.creator_name))) = lower(i.creator))
             or (i.type <> 'livre' and w.type in ('film', 'série', 'documentaire', 'vidéo')
                 and (w.type = i.type or w.type in ('documentaire', 'vidéo') or i.type = 'documentaire')
                 and i.year is not null and coalesce(w.year, w.released_year) = i.year)))
    )
    on conflict (id) do nothing
    returning id
  `;
  return res.status(201).json({ added: rows.length, skipped: selected.length - rows.length });
}
