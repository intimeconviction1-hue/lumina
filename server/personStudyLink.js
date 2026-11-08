import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import { tmdbJSON } from './tmdb.js';

const maxBytes = 512 * 1024;
const globalIPv6 = ipaddr.parse('2000::');
const redirectCodes = new Set([301, 302, 303, 307, 308]);
const agents = { 'http:': new http.Agent(), 'https:': new https.Agent() };

function webUrl(value) {
  const url = new URL(value);
  if (!agents[url.protocol] || url.port || url.username || url.password
    || !url.hostname.includes('.') || ipaddr.isValid(url.hostname)
    || /\.(?:local|localhost|internal|home|test|onion)\.?$/i.test(url.hostname)) {
    throw new Error('Adresse non publique.');
  }
  return url;
}

export function isPublicAddress(value) {
  const address = ipaddr.process(value);
  return address.range() === 'unicast' && (address.kind() === 'ipv4' || address.match(globalIPv6, 3));
}

async function readPage(url, signal, redirects = 0) {
  const addresses = await lookup(url.hostname, { all: true });
  signal.throwIfAborted();
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('Adresse non publique.');
  }
  const { address, family } = addresses[0];
  const transport = url.protocol === 'https:' ? https : http;
  const page = await new Promise((resolve, reject) => {
    const request = transport.get(url, {
      agent: agents[url.protocol], family, autoSelectFamily: false, signal,
      lookup: (_host, _options, done) => done(null, address, family),
      headers: { Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'identity', 'User-Agent': 'Lumina/1.0' },
    }, response => {
      if (redirectCodes.has(response.statusCode) && response.headers.location) {
        response.destroy();
        resolve({ location: response.headers.location });
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300
        || !/text\/html|application\/xhtml\+xml/i.test(response.headers['content-type'] || '')
        || (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity')) {
        response.destroy();
        reject(new Error('Page non lisible.'));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', chunk => {
        const remaining = maxBytes - size;
        chunks.push(chunk.subarray(0, remaining));
        size += Math.min(remaining, chunk.length);
        if (size >= maxBytes) {
          resolve({ html: Buffer.concat(chunks).toString('utf8') });
          response.destroy();
        }
      });
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
  if (!page.location) return { ...page, url };
  if (redirects >= 3) throw new Error('Trop de redirections.');
  return readPage(webUrl(new URL(page.location, url)), signal, redirects + 1);
}

function decode(value) {
  const entities = { amp: '&', apos: "'", quot: '"', nbsp: ' ', eacute: 'é', egrave: 'è', agrave: 'à', ccedil: 'ç' };
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (token, code) => {
    if (!code.startsWith('#')) return entities[code.toLowerCase()] || token;
    const hex = code[1].toLowerCase() === 'x';
    const value = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
    return value <= 0x10ffff ? String.fromCodePoint(value) : token;
  });
}

function cleanName(value) {
  if (typeof value !== 'string') return '';
  const name = decode(value).replace(/_/g, ' ').replace(/\s+/g, ' ')
    .replace(/\s+[|–—-]\s+.*$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  return name.length >= 2 && name.length <= 120 && /\p{L}/u.test(name) ? name : '';
}

function pageName(html) {
  for (const [, content] of html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(content);
      const nodes = Array.isArray(data) ? data : [data, ...(Array.isArray(data?.['@graph']) ? data['@graph'] : [])];
      const people = nodes.flatMap(node => [node, node?.mainEntity]).filter(node => [node?.['@type']].flat().includes('Person'));
      const names = [...new Set(people.map(node => cleanName(node.name)).filter(Boolean))];
      if (names.length === 1) return names[0];
    } catch {
      // Une balise invalide ne bloque pas les autres métadonnées.
    }
  }
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\bproperty\s*=\s*["']og:title["']/i.test(tag)) continue;
    const name = cleanName(/\bcontent\s*=\s*(["'])(.*?)\1/i.exec(tag)?.[2]);
    if (name) return name;
  }
  return cleanName(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function slugName(url) {
  const last = url.pathname.split('/').filter(Boolean).at(-1) || '';
  const decoded = decodeURIComponent(last).replace(/\.(?:s?html?|php)$/i, '').replace(/[-_]+/g, ' ');
  return /^[\p{L}\p{M}.'’]+(?:\s+[\p{L}\p{M}.'’]+)+$/u.test(decoded.trim()) ? cleanName(decoded) : '';
}

export async function resolveStudyLink(value, catalogue) {
  const url = webUrl(value);
  const host = url.hostname.replace(/^www\./, '');
  const wiki = /^(?:[a-z-]+\.)?(?:m\.)?wikipedia\.org$/.test(host);
  if (wiki && url.pathname.startsWith('/wiki/')) {
    const name = cleanName(decodeURIComponent(url.pathname.slice(6)));
    if (name && !name.includes(':')) return { name, catalogue };
  }
  const tmdb = /^\/person\/(\d{1,12})(?:[-/]|$)/.exec(url.pathname);
  if (host === 'themoviedb.org' && tmdb) return { id: tmdb[1], catalogue: 'cinema' };
  const book = /^\/authors\/(OL\d{1,12}A)(?:\/|$)/.exec(url.pathname);
  if (host === 'openlibrary.org' && book) return { id: book[1], catalogue: 'books' };
  const allocine = /^\/personne\/fichepersonne_gen_cpersonne(?:=|%3D)(\d{1,12})\.html$/i.exec(url.pathname);
  if (host === 'allocine.fr' && allocine) {
    try {
      const response = await fetch(`https://www.allocine.fr/personne/fichepersonne_gen_cpersonne=${allocine[1]}.html`, {
        redirect: 'error', signal: AbortSignal.timeout(6500),
      });
      if (response.ok) {
        const name = pageName((await response.text()).slice(0, maxBytes));
        if (name) return { name, catalogue: 'cinema' };
      }
    } catch {
      // Le lecteur de pages publiques peut prendre le relais.
    }
  }
  const imdb = /^\/name\/(nm\d{5,12})(?:\/|$)/.exec(url.pathname);
  if (host === 'imdb.com' && imdb && process.env.TMDB_API_KEY) {
    try {
      const data = await tmdbJSON(`/find/${imdb[1]}`, process.env.TMDB_API_KEY, { external_source: 'imdb_id' });
      const person = data.person_results?.[0];
      if (person) return { id: String(person.id), name: person.name, catalogue: 'cinema' };
    } catch {
      // La page ou son adresse peuvent encore contenir le nom.
    }
  }

  let name = '';
  const signal = AbortSignal.timeout(4500);
  let onAbort;
  try {
    const timeout = new Promise((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener('abort', onAbort, { once: true });
    });
    const page = await Promise.race([readPage(url, signal), timeout]);
    name = pageName(page.html) || slugName(page.url);
  } catch {
    // Certains sites bloquent les lecteurs automatiques.
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
  name ||= slugName(url);
  if (!name) throw new Error('Nom introuvable.');
  return { name, catalogue };
}
