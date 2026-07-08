// api/import-wishlist.js
// Importe le pense-bête Babelio (export CSV) dans Lumina en statut "Envie de lire".
// - Colle le contenu du fichier CSV exporté ("exporter mon pense-bête").
// - "preview" : parse + vérifie les doublons par titre, N'ÉCRIT RIEN.
// - "create"  : crée les livres absents de Lumina.
// Variable d'env Vercel : DATABASE_URL.

import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';

/* ---------- Parsing CSV (point-virgule, champs entre guillemets) ---------- */
function parseCsvLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i+1] === '"') { cur += '"'; i++; } else { inQ = false; } }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ';') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

export function parseWishlistCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const idxTitre = header.findIndex(h => h.includes('titre'));
  const idxAuteur = header.findIndex(h => h.includes('auteur'));
  const idxDate = header.findIndex(h => h.includes('date de publication'));
  const books = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const title = (cols[idxTitre] || '').trim();
    if (!title) continue;
    const author = (cols[idxAuteur] || '').trim();
    const dateStr = (cols[idxDate] || '').trim();
    let year = null;
    const m = dateStr.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (m && m[1] !== '0000') year = Number(m[1]);
    books.push({ title, author, year });
  }
  return books;
}

/* ---------- Normalisation pour l'appariement ---------- */
function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function toPgArray(arr){ return '{'+(arr||[]).map(x=>'"'+String(x).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(',')+'}'; }
async function readBody(req){ if(req.body) return typeof req.body==='string'?JSON.parse(req.body):req.body; let d='';for await(const c of req)d+=c;return d?JSON.parse(d):{}; }
function genId(){ return randomBytes(12).toString('hex'); }

export default async function handler(req, res) {
  if (req.method === 'GET') { res.setHeader('Content-Type','text/html; charset=utf-8'); res.setHeader('Cache-Control','no-store'); return res.status(200).send(PANEL_HTML); }
  if (req.method !== 'POST') return res.status(405).json({ ok:false, error:'Méthode non autorisée' });
  const dbUrl = process.env.DATABASE_URL; if (!dbUrl) return res.status(500).json({ ok:false, error:'DATABASE_URL manquante.' });
  const sql = neon(dbUrl);
  let body; try { body = await readBody(req); } catch { return res.status(400).json({ ok:false, error:'Corps invalide.' }); }
  const action = body.action === 'create' ? 'create' : 'preview';
  const books = parseWishlistCsv(body.text || '');
  if (!books.length) return res.status(200).json({ ok:true, mode:action, parsed:0, totalWorks:0, matchedCount:0, unmatchedCount:0, sampleMatched:[], sampleUnmatched:[], created:0, note:"Aucun livre détecté — vérifie que le collage contient bien l'en-tête ISBN;Titre;Auteur;... et les lignes du CSV." });

  try {
    const rows = await sql`select id, title from works`;
    const existing = new Set(rows.map(w => norm(w.title)));

    const matched = [], unmatched = [];
    for (const b of books) {
      if (existing.has(norm(b.title))) matched.push(b); else unmatched.push(b);
    }

    if (action === 'preview') {
      return res.status(200).json({
        ok:true, mode:'preview', parsed:books.length, totalWorks:rows.length,
        matchedCount:matched.length, unmatchedCount:unmatched.length,
        sampleMatched: matched.slice(0,40).map(b=>({title:b.title, author:b.author})),
        sampleUnmatched: unmatched.slice(0,40).map(b=>({title:b.title, author:b.author, year:b.year})),
      });
    }

    // create — insère les livres absents en "Envie de lire"
    let n=0; const now=new Date().toISOString();
    for (let i=0;i<unmatched.length;i+=40){ const batch=unmatched.slice(i,i+40);
      await Promise.all(batch.map(b=>{
        const id=genId();
        return sql`insert into works (id,title,type,creator,creator_name,status,priority,tags,year,created_by,created_by_id,created_date,updated_date)
          values (${id},${b.title},'livre',${b.author||null},${b.author||null},'Envie de lire','normal',${toPgArray([])}::text[],${b.year},'davidcastel@hotmail.fr','69ac16220af10fe6daf15ab3',${now},${now})`;
      }));
      n+=batch.length;
    }
    return res.status(200).json({ ok:true, mode:'create', created:n, skipped:matched.length });
  } catch (err) { return res.status(500).json({ ok:false, error:String(err&&err.message||err) }); }
}

const PANEL_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lumina — Import pense-bête (Babelio)</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0B2040;color:#EEF2F8;margin:0;padding:24px;line-height:1.5}
 .wrap{max-width:960px;margin:0 auto} h1{font-size:20px;margin:0 0 4px} .sub{color:#94A3B8;font-size:13px;margin-bottom:16px}
 textarea{width:100%;height:180px;background:#0E274C;color:#EEF2F8;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;font-size:12px}
 button{border:0;border-radius:12px;padding:11px 16px;font-weight:700;font-size:13.5px;cursor:pointer;margin:10px 8px 0 0}
 .prev{background:#2AA6A0;color:#fff} .crea{background:#6366F1;color:#fff} button:disabled{opacity:.4;cursor:not-allowed}
 .card{background:#0E274C;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px;margin-top:16px}
 table{width:100%;border-collapse:collapse;font-size:12px} td,th{padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.06);text-align:left;vertical-align:top}
 .new{color:#8FD8C4} .muted{color:#94A3B8}
 .warn{background:#3a1e1e;border:1px solid #EF4444;color:#FCA5A5;padding:10px 12px;border-radius:10px;margin-top:12px;font-size:13px}
</style></head><body><div class="wrap">
<h1>Import du pense-bête Babelio (CSV)</h1>
<div class="sub">Colle le contenu du fichier CSV exporté depuis Babelio (« exporter mon pense-bête »). ① Aperçu d'abord — rien n'est écrit. Puis création.</div>
<textarea id="txt" placeholder="Colle ici le contenu du CSV…"></textarea>
<div>
 <button class="prev" onclick="run('preview')">① Aperçu</button>
 <button class="crea" id="creaBtn" disabled onclick="run('create')">② Créer les livres absents</button>
</div>
<div id="out"></div></div>
<script>
async function run(action){
 const out=document.getElementById('out'); const text=document.getElementById('txt').value;
 if(!text.trim()){out.innerHTML='<div class="warn">Colle d’abord le CSV.</div>';return;}
 if(action==='create' && !confirm('Confirmer la création en base ?')){return;}
 out.innerHTML='<div class="card">⏳ …</div>';
 const r=await fetch('/api/import-wishlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,text})});
 const d=await r.json();
 if(!d.ok){out.innerHTML='<div class="warn">Erreur : '+d.error+'</div>';return;}
 if(d.mode==='preview'){
  document.getElementById('creaBtn').disabled=false;
  let h='<div class="card"><b>'+d.parsed+'</b> livres lus dans le CSV. Déjà dans Lumina : <b>'+d.matchedCount+'</b> — absents (à créer) : <b>'+d.unmatchedCount+'</b> (sur '+d.totalWorks+' œuvres).</div>';
  h+='<div class="card"><b>Déjà présents</b> (échantillon, ne seront pas recréés)<table><tr><th>Livre</th><th>Auteur</th></tr>';
  for(const m of (d.sampleMatched||[])){h+='<tr><td>'+esc(m.title)+'</td><td class="muted">'+esc(m.author||'')+'</td></tr>';}
  h+='</table></div>';
  h+='<div class="card"><b>Absents → seront créés en « Envie de lire »</b> (échantillon)<table><tr><th>Livre</th><th>Auteur</th><th>Année</th></tr>';
  for(const u of (d.sampleUnmatched||[])){h+='<tr><td>'+esc(u.title)+'</td><td class="muted">'+esc(u.author||'')+'</td><td class="new">'+(u.year||'')+'</td></tr>';}
  h+='</table></div>'; out.innerHTML=h;
 } else { out.innerHTML='<div class="card">✅ '+d.created+' livres créés. ('+d.skipped+' déjà présents, ignorés)</div>'; }
}
function esc(s){return String(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
</script></body></html>`;
