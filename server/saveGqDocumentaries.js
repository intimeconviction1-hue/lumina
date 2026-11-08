import { createHash } from 'node:crypto';
import { norm } from '../api/_lib.js';

export async function saveGqDocumentaries(sql, movies) {
  const results = await sql.transaction(tx => movies.map(work => {
    const id = createHash('sha256').update(`lumina:gq-documentaries:${work.id}`).digest('hex').slice(0, 24);
    const genres = norm('genre', work.genre);
    return tx`
      with matching as (
        select id from works
        where id = ${id} or (
          lower(trim(title)) = lower(${work.title})
          and coalesce(year, released_year) = ${work.year}
          and type in ('film', 'documentaire', 'vidéo')
        )
        order by (id = ${id}) desc, id limit 1
      ), completed as (
        update works
        set creator = coalesce(nullif(trim(creator), ''), nullif(trim(creator_name), ''), ${work.creator}),
            creator_name = coalesce(nullif(trim(creator_name), ''), nullif(trim(creator), ''), ${work.creator}),
            description = coalesce(nullif(trim(description), ''), ${work.description}),
            cover_image = coalesce(nullif(trim(cover_image), ''), ${work.cover_image}),
            country = coalesce(nullif(trim(country), ''), ${work.country}),
            duration_minutes = coalesce(duration_minutes, ${work.duration_minutes}),
            genre = case when coalesce(cardinality(genre), 0) = 0 then ${genres}::text[] else genre end,
            source_url = coalesce(nullif(trim(source_url), ''), ${work.source_url}),
            updated_date = now()
        where id = (select id from matching)
          and (nullif(trim(creator), '') is null or nullif(trim(creator_name), '') is null
            or nullif(trim(description), '') is null or nullif(trim(cover_image), '') is null
            or nullif(trim(country), '') is null or duration_minutes is null
            or coalesce(cardinality(genre), 0) = 0 or nullif(trim(source_url), '') is null)
        returning id
      ), inserted as (
        insert into works (id, title, type, status, year, creator, creator_name, description, cover_image,
                           source_url, country, duration_minutes, genre, created_date, updated_date)
        select ${id}, ${work.title}, ${work.type}, ${work.status}, ${work.year}, ${work.creator}, ${work.creator},
               ${work.description}, ${work.cover_image}, ${work.source_url}, ${work.country},
               ${work.duration_minutes}, ${genres}::text[], now(), now()
        where not exists (select 1 from matching)
        on conflict (id) do nothing
        returning id
      )
      select exists(select 1 from inserted) as added,
             exists(select 1 from completed) as completed,
             exists(select 1 from matching) or exists(select 1 from inserted) as present
    `;
  }));
  const counts = results.map(([row]) => row);
  const added = counts.filter(row => row.added).length;
  const completed = counts.filter(row => row.completed).length;
  return { added, completed, skipped: movies.length - added - completed, present: counts.filter(row => row.present).length };
}
