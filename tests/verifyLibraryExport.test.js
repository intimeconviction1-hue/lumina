import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyLibraryExport } from '../scripts/verify-library-export.mjs';

const example = () => ({
  format: 'lumina-works-export',
  version: 1,
  exported_at: '2026-11-22T10:00:00.000Z',
  count: 2,
  works: [{id:'a',title:'First'}, {id:'b',title:'Second'}],
  person_studies_count: 1,
  person_studies: [{catalogue:'cinema',id:'123',name:'Example'}],
});

test('validates a complete library export', () => {
  const result = verifyLibraryExport(example());
  assert.equal(result.valid, true);
  assert.deepEqual(result.counts, {works:2,personStudies:1});
  assert.equal(result.legacyWithoutPersonStudies, false);
});

test('rejects truncated or corrupted lists and duplicate IDs', () => {
  const a = example(); a.count = 3;
  assert.equal(verifyLibraryExport(a).valid, false);
  const b = example(); b.works[1].id = 'a';
  assert.equal(verifyLibraryExport(b).valid, false);
  const c = example(); c.person_studies_count = 7;
  assert.equal(verifyLibraryExport(c).valid, false);
});

test('recognizes old exports without secondary table', () => {
  const a = example();
  delete a.person_studies;
  delete a.person_studies_count;
  const result = verifyLibraryExport(a);
  assert.equal(result.valid,true);
  assert.equal(result.legacyWithoutPersonStudies,true);
});

test('rejects invalid metadata', () => {
  const a = example(); a.exported_at = 'not a date';
  assert.equal(verifyLibraryExport(a).valid,false);
  assert.equal(verifyLibraryExport(null).valid,false);
});
