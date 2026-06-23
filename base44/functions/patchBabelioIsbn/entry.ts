import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { csvUrl } = await req.json();
  if (!csvUrl) return Response.json({ error: 'csvUrl required' }, { status: 400 });

  const resp = await fetch(csvUrl);
  const buffer = await resp.arrayBuffer();
  const decoder = new TextDecoder('iso-8859-1');
  const text = decoder.decode(buffer);

  const lines = text.split('\n').filter(l => l.trim());
  const dataLines = lines.slice(1);

  const parseLine = (line) => {
    const fields = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ';' && !inQuote) { fields.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    fields.push(current.trim());
    return fields;
  };

  // Build a map: title -> isbn
  const isbnMap = {};
  for (const line of dataLines) {
    if (!line.trim()) continue;
    const fields = parseLine(line);
    const isbn = (fields[0] || '').replace(/[^\d]/g, '');
    const title = fields[1] || '';
    if (isbn.match(/^\d{10,13}$/) && title) {
      isbnMap[title.trim()] = isbn;
    }
  }

  // Get all books without source_url (ISBN)
  const allWorks = await base44.asServiceRole.entities.Works.filter({ type: 'livre' }, 'created_date', 300);
  const toUpdate = allWorks.filter(w => !w.source_url || !w.source_url.startsWith('isbn:'));

  let patched = 0;
  for (const work of toUpdate) {
    const isbn = isbnMap[work.title?.trim()];
    if (isbn) {
      await base44.asServiceRole.entities.Works.update(work.id, { source_url: `isbn:${isbn}` });
      patched++;
    }
  }

  return Response.json({
    message: `Patched ${patched} books with ISBN`,
    patched,
    total: toUpdate.length,
    isbnMapSize: Object.keys(isbnMap).length
  });
});