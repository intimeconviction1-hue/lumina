import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatus, effectiveStatus, statusPatch, isFinished, matchesStatusFilter } from '../src/lib/statusActions.js';

test('normalizeStatus preserves reading statuses and legacy aliases', () => {
  assert.equal(normalizeStatus('Lu'), 'Lu');
  assert.equal(normalizeStatus('Envie de lire'), 'Envie de lire');
  assert.equal(normalizeStatus('terminé'), 'Visionné');
  assert.equal(normalizeStatus('en cours'), 'En cours');
});

test('effectiveStatus displays book vocabulary without changing stored data', () => {
  assert.equal(effectiveStatus({type: 'livre', status: 'Visionné'}), 'Lu');
  assert.equal(effectiveStatus({type: 'livre', status: 'À voir'}), 'Envie de lire');
  assert.equal(effectiveStatus({type: 'film', status: 'Lu'}), 'Visionné');
  assert.equal(effectiveStatus({type: 'film', status: 'Envie de lire'}), 'Envie de lire');
  assert.equal(isFinished({type: 'livre', status: 'Visionné'}), true);
  assert.equal(matchesStatusFilter({type:'livre',status:'Visionné'}, ['Lu']), true);
});

test('book writes store the existing canonical finished status', () => {
  const patch = statusPatch({type:'livre',status:'En cours'}, 'Lu');
  assert.equal(patch.status, 'Visionné');
  assert.ok(!Number.isNaN(Date.parse(patch.finished_at)));
});

test('book reading queue and non-book aliases are normalized', () => {
  assert.equal(statusPatch({type:'livre'}, 'À voir').status, 'Envie de lire');
  assert.equal(statusPatch({type:'film'}, 'Lu').status, 'Visionné');
  assert.equal(statusPatch({type:'film'}, 'Envie de lire').status, 'À voir');
});

test('starting a work clears the previous completion date', () => {
  const patch = statusPatch({type:'livre',finished_at:'2020-01-01'}, 'En cours');
  assert.equal(patch.status, 'En cours');
  assert.equal(patch.finished_at, null);
  assert.ok(!Number.isNaN(Date.parse(patch.started_at)));
});
