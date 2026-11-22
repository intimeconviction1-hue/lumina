import test from 'node:test';
import assert from 'node:assert/strict';
import { searchCatalogue, filterCatalogue } from '../src/lib/catalogue.js';

const works = [
  { id: '1', title: 'Le Procès', creator: 'Franz Kafka', type: 'livre', tags: ['justice'], genre: ['roman'], year: 1925, status: 'Lu' },
  { id: '2', title: 'Procès à Paris', creator: 'Alice', type: 'film', tags: ['justice'], genre: ['documentaire'], year: 2025, status: 'Visionné' },
  { id: '3', title: 'La Nuit', creator: 'Franz', type: 'livre', tags: ['nuit'], genre: ['roman'], year: 1960, status: 'À voir' },
];

test('empty search returns the input array, without copying', () => {
  assert.equal(searchCatalogue(works, ''), works);
});

test('search keeps ranking and tag-only semantics', () => {
  assert.deepEqual(searchCatalogue(works, 'Le Procès').map(w => w.id), ['1']);
  assert.deepEqual(searchCatalogue(works, 'proces').map(w => w.id), ['1', '2']);
  assert.deepEqual(searchCatalogue(works, '#justice').map(w => w.id), ['1','2']);
  assert.deepEqual(searchCatalogue(works, '#kafka').map(w => w.id), []);
});

test('repeated queries return the same matches and updated objects reindex', () => {
  assert.deepEqual(searchCatalogue(works, 'Franz').map(w => w.id), ['1','3']);
  assert.deepEqual(searchCatalogue(works, 'Franz').map(w => w.id), ['1','3']);
  const changed = works.map(w => w.id === '3' ? { ...w, creator: 'Bob' } : w);
  assert.deepEqual(searchCatalogue(changed, 'Franz').map(w => w.id), ['1']);
});

test('filtering before search never returns an excluded work', () => {
  const filtered = filterCatalogue(works, { type: 'livre', status: ['Lu'] });
  assert.deepEqual(searchCatalogue(filtered, 'proces').map(w => w.id), ['1']);
});
