import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { csvUrl } = await req.json();
  if (!csvUrl) return Response.json({ error: 'csvUrl required' }, { status: 400 });

  // Fetch CSV file
  const resp = await fetch(csvUrl);
  if (!resp.ok) return Response.json({ error: 'Failed to fetch CSV' }, { status: 500 });

  const buffer = await resp.arrayBuffer();

  // Try decoding with latin-1 (ISO-8859-1) which is common for French exports
  const decoder = new TextDecoder('iso-8859-1');
  const text = decoder.decode(buffer);

  const lines = text.split('\n').filter(l => l.trim());
  // Skip header
  const dataLines = lines.slice(1);

  const parseLine = (line) => {
    // CSV uses ; as delimiter and " as quote
    const fields = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ';' && !inQuote) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const works = [];
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const fields = parseLine(line);
    // Fields: ISBN; Titre; Auteur; Editeur; Date de publication; Date d`entre; Statut; Note
    const title = fields[1] || '';
    const author = fields[2] || '';
    const year = fields[4] ? parseInt(fields[4].substring(0, 4)) : null;
    const rating = fields[7] ? parseFloat(fields[7]) : 0;

    if (!title) continue;

    const isbn = (fields[0] || '').trim().replace(/[^\d]/g, '');

    const work = {
      title,
      type: 'livre',
      creator: author,
      status: 'À voir',
      year: year && year > 0 && year < 2100 ? year : null,
      rating: rating > 0 ? Math.min(5, Math.round(rating)) : null,
      source_url: isbn && isbn.match(/^\d{10,13}$/) ? `isbn:${isbn}` : null,
    };

    works.push(work);
  }

  if (works.length === 0) {
    return Response.json({ message: 'No works found in CSV', count: 0 });
  }

  // Bulk create in batches of 50
  let created = 0;
  const batchSize = 50;
  for (let i = 0; i < works.length; i += batchSize) {
    const batch = works.slice(i, i + batchSize);
    await base44.entities.Works.bulkCreate(batch);
    created += batch.length;
  }

  return Response.json({ message: `Imported ${created} books`, count: created });
});