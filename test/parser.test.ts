import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSearch, parseDetail } from '../src/parser.js';
import { buildQuery, integer, ApiError } from '../src/query.js';
const fixture = (name: string) => readFileSync(new URL('fixtures/' + name, import.meta.url), 'utf8');
test('search matches original live response byte-for-field', () => {
  assert.deepEqual(parseSearch(fixture('search.html'), 'https://nyaa.si'), JSON.parse(fixture('search.json')));
});
test('ID matches original live detail, not search envelope', () => {
  assert.deepEqual(parseDetail(fixture('id.html'), 'https://nyaa.si', '96659'), JSON.parse(fixture('id.json')));
});
test('empty search and escaped title', () => {
  assert.deepEqual(parseSearch('<table class="torrent-list"><tbody></tbody></table>', 'https://nyaa.si'), { count: 0, data: [] });
  assert.equal(parseSearch(fixture('search.html').replaceAll('Koha Live CD', 'Koha &amp; Live CD'), 'https://nyaa.si').data[0].title.startsWith('Koha & Live CD'), true);
});
test('comment link does not become torrent title', () => {
  const html = fixture('search.html').replace('<td colspan="2">', '<td colspan="2"><a href="/view/96659#comments" class="comments">9</a>');
  assert.equal(parseSearch(html, 'https://nyaa.si').data[0].title, JSON.parse(fixture('search.json')).data[0].title);
});
test('numeric counters with separators', () => {
  const html = fixture('search.html').replaceAll('text-center">0<', 'text-center">1,234<');
  assert.equal(parseSearch(html, 'https://nyaa.si').data[0].seeders, 1234);
});
test('site/category mapping and query encoding', () => {
  const q = buildQuery('nyaa', new URLSearchParams('q=ubuntu&category=software&sub_category=applications&sort=seeders&order=desc&page=2'));
  assert.equal(q.get('c'), '6_1'); assert.equal(q.get('p'), '2'); assert.equal(q.get('s'), 'seeders');
  assert.equal(buildQuery('sukebei', new URLSearchParams('category=art&sub_category=games')).get('c'), '1_4');
});
test('validation matches observed FastAPI 422', () => {
  assert.throws(() => integer('abc', 'query', 'page'), (e: unknown) => {
    assert.ok(e instanceof ApiError); assert.equal(e.status, 422);
    assert.deepEqual(e.detail, [{ type: 'int_parsing', loc: ['query', 'page'], msg: 'Input should be a valid integer, unable to parse string as an integer', input: 'abc', url: 'https://errors.pydantic.dev/2.11/v/int_parsing' }]);
    return true;
  });
  assert.equal(integer('1.0', 'query', 'page'), 1);
});
test('invalid category, subcategory, sort, order', () => {
  for (const p of ['category=nope', 'sub_category=bad', 'category=software&sub_category=application', 'sort=comments', 'order=bad']) {
    assert.throws(() => buildQuery('nyaa', new URLSearchParams(p)), (e: unknown) => e instanceof ApiError && e.status === 400);
  }
});
test('detail comments preserve full original shape', () => {
  assert.deepEqual(parseDetail(fixture('comments.html'), 'https://nyaa.si', '1013299'), JSON.parse(fixture('comments.json')));
});
test('large Python integers keep exact upstream pagination', () => {
  assert.equal(buildQuery('nyaa', new URLSearchParams('page=999999999999999999999999')).get('p'), '999999999999999999999999');
});
