import { allocineMovieId } from "./allocine.js";

export function wikipediaArticle(url) {
  if (!/^[a-z]{2,12}(?:-[a-z]{2,12})?(?:\.m)?\.wikipedia\.org$/.test(url.hostname)) return null;
  if (!/^\/wiki\/[^/]+$/.test(url.pathname)) return null;
  try {
    const page = decodeURIComponent(url.pathname.slice(6));
    if (!page || /[:/\\]/.test(page)) return null;
    const source = new URL(url.pathname, "https://" + url.hostname.replace(".m.", "."));
    return { source: source.href, title: page.replaceAll("_", " ").replace(/\s+\([^()]+\)$/, "") };
  } catch {
    return null;
  }
}

export async function wikipediaFilmReferences(source) {
  const response = await fetch(source, {
    headers: { Accept: "text/html" },
    redirect: "error",
    signal: AbortSignal.timeout(6500),
  });
  if (!response.ok) return {};
  const html = await response.text();
  const allocine = new Set();
  const tmdb = new Map();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="(https:\/\/[^"]+)"[^>]*>/gi)) {
    const url = URL.parse(href);
    if (!url) continue;
    const id = allocineMovieId(url);
    if (id) allocine.add(id);
    if (!["www.themoviedb.org", "themoviedb.org"].includes(url.hostname)) continue;
    const target = /^\/(movie|tv)\/(\d{1,12})\/?$/.exec(url.pathname);
    if (target) tmdb.set(target[0].replace(/\/$/, ""), { media: target[1], id: target[2] });
  }
  return {
    allocine: allocine.size === 1 ? [...allocine][0] : undefined,
    tmdb: tmdb.size === 1 ? [...tmdb.values()][0] : undefined,
  };
}
