// api/enrich-films.js
// Enrichissement automatique des films / séries / documentaires via TMDB.
// - Non destructif : ne remplit QUE les champs vides.
// - Modes : "dry" (test, n'écrit rien) et "run" (écrit, paginé par curseur).
// - Piloté depuis le navigateur : ouvrir /api/enrich-films pour le panneau.
//
// Variables d'environnement Vercel requises :
//   DATABASE_URL    -> chaîne de connexion Neon (déjà présente)
//   TMDB_API_KEY    -> clé API v3 (32 caractères) de themoviedb.org

import { neon } from '@neondatabase/serverless';

const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

// Filtre SQL commun : œuvres film/série/doc à qui il manque au moins un champ.
const TYPE_FILTER = "lower(type) IN ('film', 'série', 'serie', 'documentaire', 'documentary')";
const MISSING_FILTER = `(
  genre IS NULL OR cardinality(genre) = 0
  OR duration_minutes IS NULL
  OR year IS NULL OR released_year IS NULL
  OR cover_image IS NULL OR cover_image = ''
  OR description IS NULL OR description = ''
)`;

function norm(s) {
  return (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

// Nettoie un titre pour une 2e tentative : retire (parenthèses), points de
// suspension, et suffixes de métadonnées collés du genre "· 1 saison", "2025".
function cleanTitle(t) {
  return (t || '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\.\.\.|…/g, ' ')
    .replace(/[·|–—-]\s*\d+\s*saisons?.*/i, ' ')
    .replace(/[·|–—-]\s*saison\s*\d+.*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tmdbJSON(path, key, params = {}) {
  const url = new URL(TMDB + path);
  url.searchParams.set('api_key', key);
  url.searchParams.set('language', 'fr-FR');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const r = await fetch(url.toString());
  if (!r.ok) throw new Error('TMDB ' + r.status + ' sur ' + path);
  return r.json();
}

function searchKind(type) {
  const t = norm(type);
  if (t === 'film') return 'movie';
  if (t === 'serie') return 'tv';
  return 'multi';
}

async function findOnTmdb(title, type, key) {
  const kind = searchKind(type);
  async function runSearch(q) {
    if (!q) return null;
    const data = await tmdbJSON('/search/' + kind, key, { query: q, include_adult: 'false' });
    let results = data.results || [];
    if (kind === 'multi') results = results.filter((x) => x.media_type === 'movie' || x.media_type === 'tv');
    return results[0] || null;
  }
  let hit = await runSearch(title);
  if (!hit) {
    const cleaned = cleanTitle(title);
    if (cleaned && cleaned !== title) hit = await runSearch(cleaned);
  }
  if (!hit) return null;

  const media = kind === 'multi' ? hit.media_type : kind;
  const d = await tmdbJSON('/' + media + '/' + hit.id, key);
  const date = media === 'movie' ? d.release_date : d.first_air_date;
  const yr = date ? parseInt(date.slice(0, 4), 10) : null;
  const runtime = media === 'movie'
    ? (d.runtime || null)
    : (Array.isArray(d.episode_run_time) && d.episode_run_time.length ? d.episode_run_time[0] : null);

  return {
    tmdbTitle: d.title || d.name || hit.title || hit.name || '?',
    year: Number.isFinite(yr) ? yr : null,
    duration: runtime && runtime > 0 ? runtime : null,
    genres: (d.genres || []).map((g) => g.name).filter(Boolean),
    poster: d.poster_path ? IMG + d.poster_path : null,
    overview: (d.overview || '').trim() || null,
  };
}

function emptyArr(a) { return a == null || (Array.isArray(a) && a.length === 0); }
function emptyStr(s) { return s == null || String(s).trim() === ''; }

// Construit l'objet "ce qu'il faut remplir" pour une ligne donnée.
function planFill(w, info) {
  const sets = [];
  const params = [];
  const fills = [];
  let i = 1;
  if (emptyArr(w.genre) && info.genres.length) { sets.push('genre = $' + i + '::text[]'); params.push(info.genres); i++; fills.push('genre'); }
  if (w.duration_minutes == null && info.duration != null) { sets.push('duration_minutes = $' + i); params.push(info.duration); i++; fills.push('durée'); }
  if (w.year == null && info.year != null) { sets.push('year = $' + i); params.push(info.year); i++; fills.push('année'); }
  if (w.released_year == null && info.year != null) { sets.push('released_year = $' + i); params.push(info.year); i++; fills.push('released_year'); }
  if (emptyStr(w.cover_image) && info.poster) { sets.push('cover_image = $' + i); params.push(info.poster); i++; fills.push('affiche'); }
  if (emptyStr(w.description) && info.overview) { sets.push('description = $' + i); params.push(info.overview); i++; fills.push('résumé'); }
  return { sets, params, fills, nextIdx: i };
}

export default async function handler(req, res) {
  const action = (req.query.action || '').toString();

  if (!action) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(PANEL_HTML);
  }

  const key = process.env.TMDB_API_KEY;
  const dbUrl = process.env.DATABASE_URL;
  if (!key) return res.status(500).json({ ok: false, error: "TMDB_API_KEY manquante dans Vercel." });
  if (!dbUrl) return res.status(500).json({ ok: false, error: 'DATABASE_URL manquante.' });

  const sql = neon(dbUrl);
  const dry = action === 'dry';
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = dry ? 10 : 6;
  if (limit > 25) limit = 25;

  try {
    // ---------------- MODE TEST (dry) : échantillon récent, aucune écriture ----------------
    if (dry) {
      const rows = await sql`
        SELECT id, title, type, genre, duration_minutes, year, released_year, cover_image, description
        FROM works
        WHERE lower(type) IN ('film', 'série', 'serie', 'documentaire', 'documentary')
          AND (genre IS NULL OR cardinality(genre) = 0 OR duration_minutes IS NULL
               OR year IS NULL OR released_year IS NULL
               OR cover_image IS NULL OR cover_image = ''
               OR description IS NULL OR description = '')
        ORDER BY created_date DESC
        LIMIT ${limit}`;
      const totalRows = await sql`
        SELECT count(*)::int AS n FROM works
        WHERE lower(type) IN ('film', 'série', 'serie', 'documentaire', 'documentary')
          AND (genre IS NULL OR cardinality(genre) = 0 OR duration_minutes IS NULL
               OR year IS NULL OR released_year IS NULL
               OR cover_image IS NULL OR cover_image = ''
               OR description IS NULL OR description = '')`;
      const details = [];
      let notFound = 0;
      for (const w of rows) {
        let info = null;
        try { info = await findOnTmdb(w.title, w.type, key); }
        catch (e) { details.push({ title: w.title, status: 'erreur', message: String(e.message || e) }); continue; }
        if (!info) { notFound++; details.push({ title: w.title, status: 'introuvable' }); continue; }
        const plan = planFill(w, info);
        const label = info.tmdbTitle + (info.year ? ' (' + info.year + ')' : '');
        details.push({ title: w.title, status: plan.fills.length ? 'à remplir' : 'rien à remplir', match: label, fields: plan.fills });
      }
      return res.status(200).json({ ok: true, mode: 'dry', processed: rows.length, updated: 0, notFound, remaining: totalRows[0] ? totalRows[0].n : 0, details });
    }

    // ---------------- MODE RUN : pagination par curseur (created_date, id) ----------------
    const before = req.query.before ? String(req.query.before) : null;
    const beforeId = req.query.beforeId ? String(req.query.beforeId) : null;

    // Total à traiter renvoyé uniquement au 1er appel (curseur vide).
    let total = null;
    if (!before) {
      const t = await sql`
        SELECT count(*)::int AS n FROM works
        WHERE lower(type) IN ('film', 'série', 'serie', 'documentaire', 'documentary')
          AND (genre IS NULL OR cardinality(genre) = 0 OR duration_minutes IS NULL
               OR year IS NULL OR released_year IS NULL
               OR cover_image IS NULL OR cover_image = ''
               OR description IS NULL OR description = '')`;
      total = t[0] ? t[0].n : 0;
    }

    const selectText =
      'SELECT id, title, type, genre, duration_minutes, year, released_year, cover_image, description, created_date ' +
      'FROM works ' +
      'WHERE ' + TYPE_FILTER + ' AND ' + MISSING_FILTER + ' ' +
      'AND ($1::timestamptz IS NULL OR (created_date, id) < ($1::timestamptz, $2::text)) ' +
      'ORDER BY created_date DESC, id DESC ' +
      'LIMIT $3';
    const rows = await sql.query(selectText, [before, beforeId, limit]);

    const details = [];
    let updated = 0;
    let notFound = 0;
    for (const w of rows) {
      let info = null;
      try { info = await findOnTmdb(w.title, w.type, key); }
      catch (e) { details.push({ title: w.title, status: 'erreur', message: String(e.message || e) }); continue; }
      if (!info) { notFound++; details.push({ title: w.title, status: 'introuvable' }); continue; }
      const plan = planFill(w, info);
      const label = info.tmdbTitle + (info.year ? ' (' + info.year + ')' : '');
      if (!plan.sets.length) { details.push({ title: w.title, status: 'rien à remplir', match: label }); continue; }
      plan.params.push(w.id);
      const text = 'UPDATE works SET ' + plan.sets.join(', ') + ', updated_date = now() WHERE id = $' + plan.nextIdx;
      await sql.query(text, plan.params);
      updated++;
      details.push({ title: w.title, status: 'rempli', match: label, fields: plan.fills });
    }

    const last = rows.length ? rows[rows.length - 1] : null;
    const cursor = last ? { d: last.created_date, id: last.id } : null;
    const done = rows.length < limit;

    return res.status(200).json({ ok: true, mode: 'run', processed: rows.length, updated, notFound, cursor, done, total, details });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}

// ---------------------------------------------------------------------------
// Panneau de contrôle (HTML autonome servi par cette même fonction).
// ---------------------------------------------------------------------------
const PANEL_HTML = [
'<!doctype html><html lang="fr"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width, initial-scale=1">',
'<title>Lumina — Enrichissement films</title>',
'<style>',
':root{color-scheme:dark}',
'body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0e1116;color:#e6e9ef}',
'.wrap{max-width:820px;margin:0 auto;padding:32px 20px 64px}',
'h1{font-size:20px;margin:0 0 4px}.sub{color:#9aa4b2;margin:0 0 24px;font-size:13px}',
'.btns{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px}',
'button{cursor:pointer;border:0;border-radius:10px;padding:11px 16px;font-size:14px;font-weight:600}',
'button:disabled{opacity:.5;cursor:default}',
'.test{background:#1f2937;color:#e6e9ef}.go{background:#6d5efc;color:#fff}',
'.bar{height:10px;background:#1b2230;border-radius:99px;overflow:hidden;margin:8px 0 16px}',
'.bar>i{display:block;height:100%;width:0;background:linear-gradient(90deg,#6d5efc,#a78bfa);transition:width .3s}',
'.stat{font-size:13px;color:#9aa4b2;margin-bottom:16px}',
'table{width:100%;border-collapse:collapse;font-size:13px}',
'th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #1b2230;vertical-align:top}',
'th{color:#9aa4b2;font-weight:600}',
'.tag{display:inline-block;padding:1px 7px;border-radius:99px;font-size:11px;margin:1px 3px 1px 0}',
'.ok{background:#10331f;color:#5fe39a}.warn{background:#3a2a10;color:#ffce6b}.err{background:#3a1414;color:#ff8a8a}',
'.muted{color:#6b7280}',
'</style></head><body><div class="wrap">',
'<h1>Lumina — Enrichissement films (TMDB)</h1>',
'<p class="sub">Non destructif : ne remplit que les champs vides (genre, durée, année, affiche, résumé). Teste d\'abord, puis lance. La progression reprend toute seule en cas de lenteur réseau.</p>',
'<div class="btns">',
'<button class="test" id="bTest">Tester sur 10 (n\'écrit rien)</button>',
'<button class="go" id="bRun">Lancer l\'enrichissement complet</button>',
'</div>',
'<div class="bar"><i id="bar"></i></div>',
'<div class="stat" id="stat">Prêt.</div>',
'<table><thead><tr><th>Titre Lumina</th><th>Correspondance TMDB</th><th>Champs</th><th>État</th></tr></thead><tbody id="rows"></tbody></table>',
'<script>',
'var bTest=document.getElementById("bTest"),bRun=document.getElementById("bRun");',
'var bar=document.getElementById("bar"),stat=document.getElementById("stat"),rowsEl=document.getElementById("rows");',
'function esc(s){return (s==null?"":String(s)).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});}',
'function badge(st){var c="warn";if(st==="rempli"||st==="à remplir")c="ok";if(st==="erreur"||st==="introuvable")c="err";return "<span class=\\"tag "+c+"\\">"+esc(st)+"</span>";}',
'function fieldsTags(f){if(!f||!f.length)return "<span class=\\"muted\\">—</span>";return f.map(function(x){return "<span class=\\"tag\\">"+esc(x)+"</span>";}).join("");}',
'function addRows(d){d.forEach(function(r){var tr=document.createElement("tr");tr.innerHTML="<td>"+esc(r.title)+"</td><td>"+(r.match?esc(r.match):"<span class=\\"muted\\">—</span>")+"</td><td>"+fieldsTags(r.fields)+"</td><td>"+badge(r.status)+(r.message?" <span class=\\"muted\\">"+esc(r.message)+"</span>":"")+"</td>";rowsEl.appendChild(tr);});}',
'function disable(v){bTest.disabled=v;bRun.disabled=v;}',
// fetch avec délai d abandon (25 s) pour ne jamais rester bloqué
'function callJSON(url){var ctrl=new AbortController();var to=setTimeout(function(){ctrl.abort();},25000);return fetch(url,{signal:ctrl.signal}).then(function(r){clearTimeout(to);return r.json();}).catch(function(e){clearTimeout(to);throw e;});}',
// TEST
'bTest.onclick=function(){disable(true);rowsEl.innerHTML="";bar.style.width="0";stat.textContent="Test en cours…";callJSON("?action=dry&limit=10").then(function(j){if(!j.ok){stat.textContent="Erreur : "+j.error;disable(false);return;}addRows(j.details);stat.textContent="Test : "+j.processed+" analysés, "+j.remaining+" restants au total. Rien n\'a été écrit.";disable(false);}).catch(function(e){stat.textContent="Erreur réseau : "+e+" (réessaie).";disable(false);});};',
// RUN paginé par curseur, avec reprise auto du même lot en cas d échec
'bRun.onclick=function(){disable(true);rowsEl.innerHTML="";var done=0,total=0,cursor=null,fails=0;',
'function finish(msg){stat.textContent=msg;disable(false);}',
'function step(){var url="?action=run&limit=6";if(cursor){url+="&before="+encodeURIComponent(cursor.d)+"&beforeId="+encodeURIComponent(cursor.id);}callJSON(url).then(function(j){if(!j.ok){finish("Erreur : "+j.error);return;}fails=0;if(j.total!=null&&total===0)total=j.total;addRows(j.details);done+=j.updated;var pct=total?Math.min(100,Math.round(100*rowsEl.children.length/total)):100;bar.style.width=pct+"%";stat.textContent=done+" enrichis · "+pct+"% parcouru";cursor=j.cursor;if(j.done||!j.cursor){finish("Terminé : "+done+" œuvres enrichies sur "+total+" analysées. Les non-trouvées (titres trop approximatifs) sont restées vides.");}else{setTimeout(step,200);}}).catch(function(e){fails++;if(fails<=4){stat.textContent="Lenteur réseau, reprise du lot ("+fails+"/4)…";setTimeout(step,800*fails);}else{finish("Arrêt après plusieurs échecs réseau. "+done+" déjà enrichis — relance \\"Lancer l\'enrichissement complet\\" pour reprendre où ça s\'est arrêté.");}});}',
// compteur d avancement basé sur le nombre de lignes déjà affichées
'step();};',
'</script>',
'</div></body></html>',
].join('\n');
