import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_COVER_BYTES, validateCoverDataUrl } from '../api/coverValidation.js';

function url(type, bytes) {
  return `data:${type};base64,${bytes.toString('base64')}`;
}

test('accepts a valid JPEG, PNG, GIF and WEBP header', () => {
  const cases = [
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'jpg'],
    ['image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'png'],
    ['image/gif', Buffer.from('GIF89a', 'ascii'), 'gif'],
    ['image/webp', Buffer.from('RIFF1234WEBP', 'ascii'), 'webp'],
  ];
  for (const [mime, bytes, ext] of cases) {
    const parsed = validateCoverDataUrl(url(mime, bytes));
    assert.equal(parsed.error, undefined, mime);
    assert.equal(parsed.extension, ext);
    assert.equal(parsed.contentType, mime);
  }
});

test('rejects fake MIME, SVG, broken base64 and empty files', () => {
  assert.equal(validateCoverDataUrl(url('image/png', Buffer.from('evil'))).status, 415);
  assert.equal(validateCoverDataUrl(url('image/svg+xml', Buffer.from('<svg/>'))).status, 415);
  assert.equal(validateCoverDataUrl('data:image/jpeg;base64,!!!').status, 415);
  assert.equal(validateCoverDataUrl('data:image/jpeg;base64,AAAA').status, 415);
  assert.equal(validateCoverDataUrl('data:image/jpeg;base64,').status, 415);
});

test('rejects a payload larger than 2 MiB before storage', () => {
  const big = Buffer.alloc(MAX_COVER_BYTES + 1);
  big[0] = 0xff; big[1] = 0xd8; big[2] = 0xff;
  assert.equal(validateCoverDataUrl(url('image/jpeg', big)).status, 413);
});
