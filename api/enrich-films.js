// api/enrich-films.js
// Enrichissement automatique des films / séries / documentaires via TMDB.
// - Non destructif : ne remplit QUE les champs vides.
// - Deux modes : "dry" (test, n'écrit rien) et "run" (écrit en base).
// - Piloté depuis le navigateur : ouvrir /api/enrich-films pour le panneau de contrôle.
//
// Variables d'environnement requises (Vercel) :
//   DATABASE_URL    -> chaîne de connexion Neon (déjà présente)
//   TMDB_API_KEY    -> clé API v3 (32 caractères) de themoviedb.org

import { neon } from '@neondatabase/serverless';

const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

// Normalise un type ("Série" -> "serie") pour comparer sans accent ni casse.
function norm(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Nettoie un titre pour une 2e tentative de recherche si la 1re échoue.
function cleanTitle(t) {
  return (t || '')
    .replace(/\([^)]*\)/g, ' ')   // retire (parenthèses)
    .replace(/\.\.\.|…/g, ' ')    // retire les points de suspension
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

// Choisit l'endpoint de recherche selon le type Lumina.
function searchKind(type) {
  const t = norm(type);
  if (t === 'film') return 'movie';
  if (t === 'serie') return 'tv';
  return 'multi'; // documentaire (ou inconnu) : film ou série
}

// Recherche TMDB + récupération des détails. Renvoie un objet normalisé ou null.
async function findOnTmdb(title, type, key) {
  const kind = searchKind(type);

  async function runSearch(q) {
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
  const details = await tmdbJSON('/' + media + '/' + hit.id, key);

  const date = media === 'movie' ? details.release_date : details.first_air_date;
  const yr = date ? parseInt(date.slice(0, 4), 10) : null;
  const runtime = media === 'movie'
    ? (details.runtime || null)
    : (Array.isArray(details.episode_run_time) && details.episode_run_time.length ? details.episode_run_time[0] : null);

  return {
    tmdbTitle: details.title || details.name || hit.title || hit.name || '?',
    media,
    year: Number.isFinite(yr) ? yr : null,
    duration: runtime && runtime > 0 ? runtime : null,
    genres: (details.genres || []).map((g) => g.name).filter(Boolean),
    poster: details.poster_path ? IMG + details.poster_path : null,
    overview: (details.overview || '').trim() || null,
  };
}

// Un champ est-il vide en base ?
function emptyArr(a) { return a == null || (Array.isArray(a) && a.length === 0); }
function emptyStr(s) { return s == null || String(s).trim() === ''; }

export default async function handler(req, res) {
  const action = (req.query.action || '').toString();

  // Sans action : on sert le panneau de contrôle HTML.
  if (!action) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(PANEL_HTML);
  }

  const key = process.env.TMDB_API_KEY;
  const dbUrl = process.env.DATABASE_URL;
  if (!key) return res.status(500).json({ ok: false, error: "TMDB_API_KEY manquante dans les variables d'environnement Vercel." });
  if (!dbUrl) return res.status(500).json({ ok: false, error: 'DATABASE_URL manquante.' });

  const sql = neon(dbUrl);
  const dry = action === 'dry';
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = dry ? 10 : 12;
  if (limit > 40) limit = 40;

  try {
    // Sélectionne les œuvres film/série/doc à qui il manque au moins un champ.
    const rows = await sql`
      SELECT id, title, type, genre, duration_minutes, year, released_year, cover_image, description
      FROM works
      WHERE lower(type) IN ('film', 'série', 'serie', 'documentaire', 'documentary')
        AND (
          genre IS NULL OR cardinality(genre) = 0
          OR duration_minutes IS NULL
          OR year IS NULL OR released_year IS NULL
          OR cover_image IS NULL OR cover_image = ''
          OR description IS NULL OR description = ''
        )
      ORDER BY created_date DESC
      LIMIT ${limit}
    `;

    // Compte total restant (pour la barre de progression côté panneau).
    const remainingRows = await sql`
      SELECT count(*)::int AS n
      FROM works
      WHERE lower(type) IN ('film', 'série', 'serie', 'documentaire', 'documentary')
        AND (
          genre IS NULL OR cardinality(genre) = 0
          OR duration_minutes IS NULL
          OR year IS NULL OR released_year IS NULL
          OR cover_image IS NULL OR cover_image = ''
          OR description IS NULL OR description = ''
        )
    `;
    const remainingBefore = remainingRows[0] ? remainingRows[0].n : 0;

    const details = [];
    let updated = 0;
    let notFound = 0;

    for (const w of rows) {
      let info = null;
      try {
        info = await findOnTmdb(w.title, w.type, key);
      } catch (e) {
        details.push({ title: w.title, status: 'erreur', message: String(e.message || e) });
        continue;
      }

      if (!info) {
        notFound++;
        details.push({ title: w.title, status: 'introuvable' });
        continue;
      }

      // Construit dynamiquement le SET : uniquement les champs vides en base.
      const sets = [];
      const params = [];
      const fills = [];
      let i = 1;

      if (emptyArr(w.genre) && info.genres.length) {
        sets.push('genre = $' + i + '::text[]'); params.push(info.genres); i++; fills.push('genre');
      }
      if (w.duration_minutes == null && info.duration != null) {
        sets.push('duration_minutes = $' + i); params.push(info.duration); i++; fills.push('durée');
      }
      if (w.year == null && info.year != null) {
        sets.push('year = $' + i); params.push(info.year); i++; fills.push('année');
      }
      if (w.released_year == null && info.year != null) {
        sets.push('released_year = $' + i); params.push(info.year); i++; fills.push('released_year');
      }
      if (emptyStr(w.cover_image) && info.poster) {
        sets.push('cover_image = $' + i); params.push(info.poster); i++; fills.push('affiche');
      }
      if (emptyStr(w.description) && info.overview) {
        sets.push('description = $' + i); params.push(info.overview); i++; fills.push('résumé');
      }

      const label = info.tmdbTitle + (info.year ? ' (' + info.year + ')' : '');

      if (!sets.length) {
        details.push({ title: w.title, status: 'rien à remplir', match: label });
        continue;
      }

      if (dry) {
        details.push({ title: w.title, status: 'à remplir', match: label, fields: fills });
      } else {
        params.push(w.id);
        const text = 'UPDATE works SET ' + sets.join(', ') + ', updated_date = now() WHERE id = $' + i;
        await sql.query(text, params);
        updated++;
        details.push({ title: w.title, status: 'rempli', match: label, fields: fills });
      }
    }

    const remainingAfter = dry ? remainingBefore : Math.max(0, remainingBefore - updated);

    return res.status(200).json({
      ok: true,
      mode: dry ? 'dry' : 'run',
      processed: rows.length,
      updated,
      notFound,
      remaining: remainingAfter,
      details,
    });
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
'<p class="sub">Non destructif : ne remplit que les champs vides (genre, durée, année, affiche, résumé). Teste d\'abord, puis lance.</p>',
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
'function call(action,limit){return fetch("?action="+action+"&limit="+limit).then(function(r){return r.json();});}',
'bTest.onclick=function(){disable(true);rowsEl.innerHTML="";bar.style.width="0";stat.textContent="Test en cours…";call("dry",10).then(function(j){if(!j.ok){stat.textContent="Erreur : "+j.error;disable(false);return;}addRows(j.details);stat.textContent="Test : "+j.processed+" analysés, "+j.remaining+" restants au total. Rien n\'a été écrit.";disable(false);}).catch(function(e){stat.textContent="Erreur réseau : "+e;disable(false);});};',
'bRun.onclick=function(){disable(true);rowsEl.innerHTML="";var done=0,total=0;function step(){call("run",12).then(function(j){if(!j.ok){stat.textContent="Erreur : "+j.error;disable(false);return;}addRows(j.details);done+=j.updated;if(total===0)total=j.remaining+j.updated;var pct=total?Math.round(100*(total-j.remaining)/total):100;bar.style.width=pct+"%";stat.textContent=done+" enrichis · "+j.remaining+" restants ("+pct+"%)";if(j.processed>0&&j.remaining>0){setTimeout(step,250);}else{stat.textContent="Terminé : "+done+" œuvres enrichies. "+j.remaining+" restants (introuvables sur TMDB).";disable(false);}});}step();};',
'</script>',
'</div></body></html>',
].join('\n');
