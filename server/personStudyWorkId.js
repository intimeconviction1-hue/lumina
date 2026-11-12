import { createHash } from 'node:crypto';

export function personStudyWorkId(catalogue, id) {
  return createHash('sha256').update(`lumina:person-study:${catalogue}:${id}`).digest('hex').slice(0, 24);
}

export function isPersonStudyImport(work) {
  const screen = /^https:\/\/www\.themoviedb\.org\/(movie|tv)\/(\d+)$/.exec(work.source_url);
  if (screen) return work.id === personStudyWorkId('cinema', `${screen[1]}:${screen[2]}`);
  const book = /^https:\/\/openlibrary\.org\/works\/(OL\d+W)$/.exec(work.source_url);
  return Boolean(book && work.id === personStudyWorkId('books', book[1]));
}
