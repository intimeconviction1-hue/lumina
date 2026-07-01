// api/clean-genres.js
// Nettoyage des genres (données TMDB) : fusion des doublons + découpe des combos.
// - Deux étapes : "preview" (aperçu, N'ÉCRIT RIEN) puis "apply" (écrit).
// - Ouvrir /api/clean-genres pour le panneau. Idempotent.
// Variable d'environnement Vercel : DATABASE_URL.

import { neon } from '@neondatabase/serverless';

// Fusion : genre source -> genre unique
const RENAME = {
  'familial': 'famille',        // aligne sur le mot attendu par le scoring TonightPick
};

// Découpe : combos TMDB -> plusieurs genres
const SPLIT = {
  'action & adventure': ['action', 'aventure'],
  'action & aventure': ['action', 'aventure'],
  'science-fiction & fantastique': ['science-fiction', 'fantastique'],
  'sci-fi & fantasy': ['science-fiction', 'fantastique'],
  'war & politics': ['guerre', 'politique'],
  'science fiction': ['science-fiction'],
};

export function asArr(v) {
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '' || s === '{}') return [];
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1); const out = []; let cur = '', q = false;
      for (let i = 0; i < inner.length; i++) { const c = inner[i];
        if (c === '"') { q = !q; continue; }
        if (c === ',' && !q) { out.push(cur); cur = ''; continue; }
        cur += c; }
      if (cur !== '' || out.length) out.push(cur);
      return out.map(x => x.replace(/\\"/g, '"').replace(/\\\\/g, '\\')).filter(Boolean);
    }
    try { const j = JSON.parse(s); if (Array.isArray(j)) return j; } catch { /* */ }
    return [s];
  }
  return [];
}

export function cleanGenres(raw) {
  const out = new Set();
  for (const g of asArr(raw)) {
    const key = String(g).trim().toLowerCase();
    if (!key) continue;
    if (SPLIT[key]) { SPLIT[key].forEach(x => out.add(x)); continue; }
    if (RENAME[key]) { out.add(RENAME[key]); continue; }
    out.add(key);
  }
  return [...out].sort((a, b) => a.localeCompare(b, 'fr'));
}

function same(a, b) {
  if (a.length !== b.length) return false;
  const A = [...a].map(x => String(x).trim().toLowerCase()).sort();
  const B = [...b].map(x => String(x).trim().toLowerCase()).sort();
  return A.every((v, i) => v === B[i]);
}
function toPgArray(arr) {
  return '{' + (arr || []).map(x => '"' + String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}
async function readBody(req) {
  if (req.body) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  let d = ''; for await (const c of req) d += c; return d ? JSON.parse(d) : {};
}

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
  let body; try { body = await readBody(req); } catch { return res.status(400).json({ ok: false, error: 'Corps invalide.' }); }
  const action = body.action === 'apply' ? 'apply' : 'preview';

  try {
    const rows = await sql`select id, title, genre from works`;
    const changes = [];
    const delta = {};
    for (const w of rows) {
      const old = asArr(w.genre);
      const ng = cleanGenres(old);
      if (same(old, ng)) continue;
      old.forEach(g => { const k = String(g).trim().toLowerCase(); delta[k] = (delta[k] || 0) - 1; });
      ng.forEach(g => { delta[g] = (delta[g] || 0) + 1; });
      changes.push({ id: w.id, title: w.title, oldGenres: old, newGenres: ng });
    }

    if (action === 'preview') {
      const created = Object.entries(delta).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
      const removed = Object.entries(delta).filter(([, n]) => n < 0).sort((a, b) => a[1] - b[1]);
      return res.status(200).json({
        ok: true, mode: 'preview', totalWorks: rows.length, changedWorks: changes.length,
        created, removed, sample: changes.slice(0, 60),
      });
    }
    let applied = 0;
    for (let i = 0; i < changes.length; i += 50) {
      const batch = changes.slice(i, i + 50);
      await Promise.all(batch.map(c => sql`
        update works set genre = ${toPgArray(c.newGenres)}::text[], updated_date = now() where id = ${c.id}
      `));
      applied += batch.length;
    }
    return res.status(200).json({ ok: true, mode: 'apply', changedWorks: applied });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
}

const PANEL_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Lumina — Nettoyage des genres</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0B2040;color:#EEF2F8;margin:0;padding:24px;line-height:1.5}
 .wrap{max-width:900px;margin:0 auto} h1{font-size:20px;margin:0 0 4px} .sub{color:#94A3B8;font-size:13px;margin-bottom:20px}
 button{border:0;border-radius:12px;padding:12px 18px;font-weight:700;font-size:14px;cursor:pointer;margin-right:10px}
 .prev{background:#2AA6A0;color:#fff} .apply{background:#E56B3A;color:#fff} .apply:disabled{opacity:.4;cursor:not-allowed}
 .card{background:#0E274C;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-top:18px}
 table{width:100%;border-collapse:collapse;font-size:12.5px} td,th{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;vertical-align:top}
 .old{color:#F39B9B} .new{color:#8FD8C4} .muted{color:#94A3B8} .badge{display:inline-block;background:#163a6b;border-radius:20px;padding:2px 8px;margin:2px;font-size:11px}
 .warn{background:#3a1e1e;border:1px solid #EF4444;color:#FCA5A5;padding:10px 12px;border-radius:10px;margin-top:14px;font-size:13px}
</style></head><body><div class="wrap">
<h1>Lumina — Nettoyage des genres</h1>
<div class="sub">Fusionne les doublons (familial→famille) et découpe les combos TMDB. Aperçu d'abord, puis Appliquer.</div>
<button class="prev" onclick="run('preview')">① Aperçu (dry-run)</button>
<button class="apply" id="applyBtn" disabled onclick="run('apply')">② Appliquer</button>
<div id="out"></div></div>
<script>
async function run(action){
 const out=document.getElementById('out');
 out.innerHTML='<div class="card">⏳ '+(action==='preview'?'Calcul…':'Application…')+'</div>';
 if(action==='apply' && !confirm('Confirmer l’écriture des genres ?')){out.innerHTML='';return;}
 const r=await fetch('/api/clean-genres',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
 const d=await r.json();
 if(!d.ok){out.innerHTML='<div class="warn">Erreur : '+d.error+'</div>';return;}
 if(d.mode==='preview'){
  document.getElementById('applyBtn').disabled=false;
  let h='<div class="card"><b>'+d.changedWorks+'</b> œuvres à modifier sur '+d.totalWorks+'.</div>';
  h+='<div class="card"><b>Genres ajoutés</b><br>'+(d.created.length?d.created.map(x=>'<span class="badge">'+esc(x[0])+' +'+x[1]+'</span>').join(''):'<span class="muted">aucun</span>')+'</div>';
  h+='<div class="card"><b>Genres retirés</b><br>'+(d.removed.length?d.removed.map(x=>'<span class="badge">'+esc(x[0])+' '+x[1]+'</span>').join(''):'<span class="muted">aucun</span>')+'</div>';
  h+='<div class="card"><b>Échantillon</b><table><tr><th>Œuvre</th><th>Avant → Après</th></tr>';
  for(const c of d.sample){h+='<tr><td>'+esc(c.title||'')+'</td><td><span class="old">'+c.oldGenres.join(', ')+'</span><br><span class="new">'+c.newGenres.join(', ')+'</span></td></tr>';}
  h+='</table></div>'; out.innerHTML=h;
 } else { out.innerHTML='<div class="card">✅ Terminé : <b>'+d.changedWorks+'</b> œuvres mises à jour.</div>'; document.getElementById('applyBtn').disabled=true; }
}
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
</script></body></html>`;
