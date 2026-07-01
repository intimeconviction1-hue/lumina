// api/migrate-tags.js
// Normalisation des tags de la bibliothèque (livres + toutes œuvres, pool partagé).
// - Deux étapes : "preview" (aperçu, N'ÉCRIT RIEN) puis "apply" (écrit).
// - Piloté depuis le navigateur : ouvrir /api/migrate-tags pour le panneau.
// - À LANCER UNE SEULE FOIS (idempotent : relancer après apply ne recasse rien,
//   car les tags cibles ne re-déclenchent pas les règles source).
//
// Variable d'environnement Vercel : DATABASE_URL (déjà présente).

import { neon } from '@neondatabase/serverless';

/* ------------------------------------------------------------------ */
/* RÈGLES (issues de la table validée par David + colonne OneDrive)    */
/* ------------------------------------------------------------------ */

// 1) Renommage / fusion : tag source -> UN tag unique
const RENAME = {
  'avocats': 'avocats',
  'biopic': 'biopics',
  'cinema': 'cinéma',
  'docu fr': 'documentaire',
  'georgie': 'géorgie',
  'kobo': 'ma collection',
  'litt fr': 'litt. fr',
  'litt. usa': 'litt. us',
  'ok': 'samson kaki',
  'olivier kaki': 'samson kaki',
  'polar am sud': 'polar am. sud',
  'polar fr': 'polar france',
  'polar israel': 'polar israël',
  'polar us': 'polar usa',
  'princes fauchés': 'les princes fauchés',
  'procès': 'procès fr',
  'reflexion': 'réflexion',
  'truffaut;': 'truffaut',
  'viet nam': 'vietnam',
  'chroniques j': 'intime conviction',
  'mes scenars': 'samson kaki',
  '2023': 'tikbook',
  'rentrée sept 2023': 'tikbook',
  'série compa': 'adaptation série tv',
  // Famille "offrir"
  'cadeaux': 'offrir',
  'cadeaux sandlov': 'offrir: sandlov',
  'cadeaux tolé': 'offrir: tolé',
  'gad': 'offrir: gad',
  'lenny': 'offrir: lenny',
  'sasha': 'offrir: sasha',
  'sandra': 'offrir: sandra',
  'david castel': 'offrir: david castel',
  'annema': 'offrir: annema',
  'laetitia': 'offrir: laetitia',
};

// 2) Dédoublement : tag source -> plusieurs tags
const SPLIT = {
  'israël à traduire': ['israël à traduire', 'israël'],
  'polartik': ['art du polar', 'tikbook'],
  'polar usa true': ['polar usa', 'histoire vraie'],   // samson kaki ajouté par le parapluie
  'procès fr true': ['procès fr', 'histoire vraie'],   // samson kaki ajouté par le parapluie
};

// 3) Migration vers un CHAMP (le tag est retiré, un champ est renseigné)
//    valeur = { field, value, extraTags? }
const TO_FIELD = {
  'urgent':       { field: 'priority', value: 'urgent' },
  'polar urgent': { field: 'priority', value: 'urgent', extraTags: ['art du polar'] },
  'en cours':     { field: 'status',   value: 'En cours' },
  'lire':         { field: 'status',   value: 'Envie de lire' },
};

// 4) Parapluies (ajoutés si le jeu FINAL de tags contient un déclencheur)
const UMBRELLA = [
  { tag: 'art du polar', test: (t) => t.startsWith('polar') },
  { tag: 'samson kaki',  test: (t) => (
      t.startsWith('procès') || t === 'true crime' || t === 'histoire vraie' ||
      t === 'justice' || t === 'droit' || t === 'avocats' || t === 'polar ok' || t === 'samson kaki'
  ) },
  { tag: 'tikbook', test: (t) => (
      t.startsWith('litt.') || t === 'tikbook' || t === 'livretok' || t === 'bibliotik'
  ) },
];

/* ------------------------------------------------------------------ */
/* TRANSFORMATION (pure, testable)                                     */
/* ------------------------------------------------------------------ */

// Les tags peuvent arriver en tableau JS, ou en chaîne Postgres '{a,"b c"}',
// ou en JSON. On normalise toujours vers un tableau.
export function asTagArray(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '' || s === '{}') return [];
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1);
      const out = []; let cur = ''; let q = false;
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (c === '"') { q = !q; continue; }
        if (c === ',' && !q) { out.push(cur); cur = ''; continue; }
        cur += c;
      }
      if (cur !== '' || out.length) out.push(cur);
      return out.map(x => x.replace(/\\"/g, '"').replace(/\\\\/g, '\\')).filter(x => x !== '');
    }
    try { const j = JSON.parse(s); if (Array.isArray(j)) return j; } catch { /* */ }
    return [s];
  }
  return [];
}

export function transformWork(rawTags, work = {}) {
  const src = asTagArray(rawTags);
  const patch = {};            // champs à modifier
  const out = new Set();

  for (let tag of src) {
    if (tag == null) continue;
    const key = String(tag).trim().toLowerCase();
    if (!key) continue;

    if (TO_FIELD[key]) {
      const { field, value, extraTags } = TO_FIELD[key];
      // On ne migre le champ que s'il n'est pas déjà mieux renseigné.
      if (field === 'priority' && (work.priority == null || work.priority === 'normal' || work.priority === '')) patch.priority = value;
      if (field === 'status'   && (work.status == null || work.status === '' || work.status === 'À voir')) patch.status = value;
      (extraTags || []).forEach(t => out.add(t));
      continue; // tag retiré
    }
    if (SPLIT[key]) { SPLIT[key].forEach(t => out.add(t.toLowerCase())); continue; }
    if (RENAME[key]) { out.add(RENAME[key].toLowerCase()); continue; }
    out.add(key); // gardé tel quel (déjà en minuscule)
  }

  // Parapluies (sur le jeu final)
  let changed = true;
  while (changed) {
    changed = false;
    for (const u of UMBRELLA) {
      if (out.has(u.tag)) continue;
      for (const t of out) { if (u.test(t)) { out.add(u.tag); changed = true; break; } }
    }
  }

  const newTags = [...out].sort((a, b) => a.localeCompare(b, 'fr'));
  return { newTags, patch };
}

function sameTags(a, b) {
  if (a.length !== b.length) return false;
  const A = [...a].map(x => String(x).trim().toLowerCase()).sort();
  const B = [...b].map(x => String(x).trim().toLowerCase()).sort();
  return A.every((v, i) => v === B[i]);
}

/* ------------------------------------------------------------------ */
/* Écriture Postgres                                                   */
/* ------------------------------------------------------------------ */
function toPgArray(arr) {
  return '{' + (arr || []).map(x => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let data = '';
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).send(PANEL_HTML);
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Méthode non autorisée' });

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ ok: false, error: 'DATABASE_URL manquante.' });
  const sql = neon(dbUrl);

  let body;
  try { body = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'Corps invalide.' }); }
  const action = body.action === 'apply' ? 'apply' : 'preview';

  try {
    const rows = await sql`select id, title, type, status, priority, tags, genre, platform from works`;

    const changes = [];
    const tagDelta = {};   // tag -> variation nette (pour le récap)
    const fieldStats = { priority: 0, status: 0 };

    // Diagnostic : réalité des tags en base
    let worksWithTags = 0;
    const existingTagCounts = {};
    const existingPlatformCounts = {};
    const existingGenreCounts = {};
    const rawSamples = [];
    for (const w of rows) {
      const arr = asTagArray(w.tags);
      if (arr.length) worksWithTags++;
      arr.forEach(t => { const k = String(t).trim().toLowerCase(); if (k) existingTagCounts[k] = (existingTagCounts[k] || 0) + 1; });
      asTagArray(w.platform).forEach(t => { const k = String(t).trim().toLowerCase(); if (k) existingPlatformCounts[k] = (existingPlatformCounts[k] || 0) + 1; });
      asTagArray(w.genre).forEach(t => { const k = String(t).trim().toLowerCase(); if (k) existingGenreCounts[k] = (existingGenreCounts[k] || 0) + 1; });
      if (rawSamples.length < 5) rawSamples.push({ title: w.title, type: typeof w.tags, raw: w.tags });
    }

    for (const w of rows) {
      const old = asTagArray(w.tags);
      const { newTags, patch } = transformWork(old, w);
      const tagsChanged = !sameTags(old, newTags);
      const fieldsChanged = Object.keys(patch).length > 0;
      if (!tagsChanged && !fieldsChanged) continue;

      if (patch.priority) fieldStats.priority++;
      if (patch.status) fieldStats.status++;
      old.forEach(t => { const k = String(t).trim().toLowerCase(); tagDelta[k] = (tagDelta[k] || 0) - 1; });
      newTags.forEach(t => { tagDelta[t] = (tagDelta[t] || 0) + 1; });

      changes.push({
        id: w.id, title: w.title, type: w.type,
        oldTags: old, newTags,
        patch,
      });
    }

    if (action === 'preview') {
      // On renvoie un échantillon lisible + le récap complet des tags.
      const created = Object.entries(tagDelta).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      const removed = Object.entries(tagDelta).filter(([, n]) => n < 0).sort((a, b) => a[1] - b[1]);
      return res.status(200).json({
        ok: true, mode: 'preview',
        totalWorks: rows.length,
        worksWithTags,
        distinctTags: Object.keys(existingTagCounts).length,
        topExistingTags: Object.entries(existingTagCounts).sort((a, b) => b[1] - a[1]).slice(0, 40),
        topPlatforms: Object.entries(existingPlatformCounts).sort((a, b) => b[1] - a[1]).slice(0, 40),
        topGenres: Object.entries(existingGenreCounts).sort((a, b) => b[1] - a[1]).slice(0, 40),
        rawSamples,
        changedWorks: changes.length,
        fieldStats,
        tagsCreatedTop: created.slice(0, 40),
        tagsRemovedTop: removed.slice(0, 60),
        sample: changes.slice(0, 60),
      });
    }

    // APPLY — par lots de 50
    let applied = 0;
    for (let i = 0; i < changes.length; i += 50) {
      const batch = changes.slice(i, i + 50);
      await Promise.all(batch.map(c => {
        const tagsLit = toPgArray(c.newTags);
        const pr = c.patch.priority ?? null;
        const st = c.patch.status ?? null;
        return sql`
          update works set
            tags = ${tagsLit}::text[],
            priority = coalesce(${pr}, priority),
            status   = coalesce(${st}, status),
            updated_date = now()
          where id = ${c.id}
        `;
      }));
      applied += batch.length;
    }
    return res.status(200).json({ ok: true, mode: 'apply', totalWorks: rows.length, appliedWorks: applied, fieldStats });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}

/* ------------------------------------------------------------------ */
/* Panneau HTML                                                        */
/* ------------------------------------------------------------------ */
const PANEL_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lumina — Migration des tags</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0B2040;color:#EEF2F8;margin:0;padding:24px;line-height:1.5}
  .wrap{max-width:900px;margin:0 auto}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#94A3B8;font-size:13px;margin-bottom:20px}
  button{border:0;border-radius:12px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px}
  .prev{background:#2AA6A0;color:#fff} .apply{background:#E56B3A;color:#fff} .apply:disabled{opacity:.4;cursor:not-allowed}
  .card{background:#0E274C;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-top:18px}
  table{width:100%;border-collapse:collapse;font-size:12.5px} td,th{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;vertical-align:top}
  .old{color:#F39B9B} .new{color:#8FD8C4} .muted{color:#94A3B8} code{background:rgba(255,255,255,.06);padding:1px 5px;border-radius:5px}
  .badge{display:inline-block;background:#163a6b;border-radius:20px;padding:2px 8px;margin:2px;font-size:11px}
  .warn{background:#3a1e1e;border:1px solid #EF4444;color:#FCA5A5;padding:10px 12px;border-radius:10px;margin-top:14px;font-size:13px}
</style></head><body><div class="wrap">
<h1>Lumina — Migration des tags</h1>
<div class="sub">Étape 1 : Aperçu (n'écrit rien). Étape 2 : Appliquer. À lancer une seule fois.</div>
<button class="prev" onclick="run('preview')">① Aperçu (dry-run)</button>
<button class="apply" id="applyBtn" disabled onclick="run('apply')">② Appliquer</button>
<div id="out"></div>
</div>
<script>
let previewed=false;
async function run(action){
  const out=document.getElementById('out');
  out.innerHTML='<div class="card">⏳ '+(action==='preview'?'Calcul de l’aperçu…':'Application…')+'</div>';
  if(action==='apply' && !confirm('Confirmer l’écriture en base ? (fais un aperçu d’abord)')) { out.innerHTML=''; return; }
  const r=await fetch('/api/migrate-tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
  const d=await r.json();
  if(!d.ok){ out.innerHTML='<div class="warn">Erreur : '+d.error+'</div>'; return; }
  if(d.mode==='preview'){
    previewed=true; document.getElementById('applyBtn').disabled=false;
    let h='<div class="card"><b>Diagnostic base</b><br>'
      +'Œuvres avec au moins un tag : <b>'+d.worksWithTags+'</b> / '+d.totalWorks
      +' — tags distincts en base : <b>'+d.distinctTags+'</b>.'
      +(d.worksWithTags===0 ? '<div class="warn">Aucune œuvre n’a de tag en base : les tags (Babelio/AlloCiné) ne sont pas encore importés dans Lumina. Rien à migrer tant qu’ils n’y sont pas.</div>' : '')
      +'</div>';
    h+='<div class="card"><b>Top tags réellement présents en base</b><br>'
      +(d.topExistingTags.length? d.topExistingTags.map(x=>'<span class="badge">'+esc(x[0])+' '+x[1]+'</span>').join('') : '<span class="muted">aucun</span>')
      +'</div>';
    h+='<div class="card"><b>Top PLATEFORMES en base</b> <span class="muted">(là où sont peut-être lenny, gad…)</span><br>'
      +(d.topPlatforms&&d.topPlatforms.length? d.topPlatforms.map(x=>'<span class="badge">'+esc(x[0])+' '+x[1]+'</span>').join('') : '<span class="muted">aucune</span>')
      +'</div>';
    h+='<div class="card"><b>Top GENRES en base</b> <span class="muted">(là où sont peut-être juifs, polar…)</span><br>'
      +(d.topGenres&&d.topGenres.length? d.topGenres.map(x=>'<span class="badge">'+esc(x[0])+' '+x[1]+'</span>').join('') : '<span class="muted">aucun</span>')
      +'</div>';
    h+='<div class="card"><b>'+d.changedWorks+'</b> œuvres modifiées sur '+d.totalWorks
      +'. Champs renseignés : priorité <b>'+d.fieldStats.priority+'</b>, statut <b>'+d.fieldStats.status+'</b>.</div>';
    h+='<div class="card"><b>Tags créés (top)</b><br>'+d.tagsCreatedTop.map(x=>'<span class="badge">'+x[0]+' +'+x[1]+'</span>').join('')+'</div>';
    h+='<div class="card"><b>Tags retirés / fusionnés</b><br>'+d.tagsRemovedTop.map(x=>'<span class="badge">'+x[0]+' '+x[1]+'</span>').join('')+'</div>';
    h+='<div class="card"><b>Échantillon ('+d.sample.length+' premières)</b><table><tr><th>Œuvre</th><th>Avant → Après</th><th>Champs</th></tr>';
    for(const c of d.sample){
      h+='<tr><td>'+esc(c.title||'')+' <span class="muted">('+c.type+')</span></td>'
        +'<td><span class="old">'+c.oldTags.join(', ')+'</span><br><span class="new">'+c.newTags.join(', ')+'</span></td>'
        +'<td>'+(c.patch.priority?'priorité='+c.patch.priority+' ':'')+(c.patch.status?'statut='+c.patch.status:'')+'</td></tr>';
    }
    h+='</table></div>';
    out.innerHTML=h;
  } else {
    out.innerHTML='<div class="card">✅ Terminé : <b>'+d.appliedWorks+'</b> œuvres mises à jour. '
      +'(priorité '+d.fieldStats.priority+', statut '+d.fieldStats.status+')</div>';
    document.getElementById('applyBtn').disabled=true;
  }
}
function esc(s){return s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
</script></body></html>`;
