import test from 'node:test';
import assert from 'node:assert/strict';
import { allocineSeriesId, allocineSeries } from '../server/allocine.js';

test('AlloCiné series URL formats are recognized', () => {
  assert.equal(allocineSeriesId(new URL('https://www.allocine.fr/series/ficheserie_gen_cserie=37554.html')), '37554');
  assert.equal(allocineSeriesId(new URL('https://m.allocine.fr/series/ficheserie_gen_cserie%3D37554.html')), '37554');
  assert.equal(allocineSeriesId(new URL('https://fake-allocine.fr/series/ficheserie_gen_cserie=37554.html')), undefined);
  assert.equal(allocineSeriesId(new URL('https://www.allocine.fr/film/fichefilm_gen_cfilm=37554.html')), undefined);
});

test('AlloCiné structured series metadata imports correctly', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => new Response('<script type="application/ld+json">' +
    JSON.stringify({ '@type': 'TVSeries', name: 'The Deal', startDate: '2025-01-01',
      creator: [{ name: 'Alice Winocour' }], genre: ['Drame', 'Thriller'], duration: 'PT46M' }) + '</script>');
  try {
    const work = await allocineSeries('37554');
    assert.equal(work.title, 'The Deal');
    assert.equal(work.type, 'série');
    assert.equal(work.year, 2025);
    assert.equal(work.creator, 'Alice Winocour');
    assert.deepEqual(work.genre, ['drame', 'thriller']);
    assert.equal(work.duration_minutes, 46);
  } finally { globalThis.fetch = saved; }
});

test('AlloCiné series metadata fallback works without JSON-LD', async () => {
  const saved = globalThis.fetch;
  globalThis.fetch = async () => new Response('<meta property="og:title" content="The Deal">' +
    '<meta name="description" content="Diplomatie">' +
    '<meta property="og:image" content="https://example.org/poster.jpg">' +
    '<title>The Deal - Série TV 2025 - AlloCiné</title>');
  try {
    const work = await allocineSeries('37554');
    assert.equal(work.title, 'The Deal');
    assert.equal(work.year, 2025);
    assert.equal(work.description, 'Diplomatie');
    assert.equal(work.cover_image, 'https://example.org/poster.jpg');
  } finally { globalThis.fetch = saved; }
});
