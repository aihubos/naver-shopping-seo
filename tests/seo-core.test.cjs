const test = require('node:test');
const assert = require('node:assert/strict');
const seo = require('../assets/seo-core.js');

test('title checks do not require numbers or penalize foreign-language brand names', () => {
  for (const title of ['아몬드브리즈 초콜릿맛', '無印良品 オーガニック 綿シャツ', 'Café 커피 원두', '사과']) {
    const result = seo.checkTitle(title);
    assert.equal(result.total, 4);
    assert.equal(result.passCount, 4);
  }
  assert.equal(seo.checkTitle('   ').empty, true);
});

test('duplicate, promotion and ornament candidates stay plain data', () => {
  const result = seo.checkTitle('특가 텀블러 텀블러 ★무료배송★ <img src=x onerror=alert(1)>');
  assert.equal(result.items.find(item => item.id === 'duplicates').pass, false);
  assert.equal(result.items.find(item => item.id === 'promotions').pass, false);
  assert.equal(result.items.find(item => item.id === 'symbols').pass, false);
  assert.match(result.items.find(item => item.id === 'promotions').message, /브랜드·모델명/);
  assert.equal(seo.checkTitle('가'.repeat(51)).items[0].pass, false);
  assert.equal(seo.checkTitle('a😀b').length, 3);
  assert.equal(seo.checkTitle('가').length, 1);
});

test('metrics reproduce the documented CTR/CVR/ROAS/cost-per-order example', () => {
  const result = seo.calculateMetrics({ impressions: '10000', clicks: '300', orders: '12', spend: '60000', revenue: '240000' });
  assert.deepEqual(result.metrics, { ctr: 3, cvr: 4, roas: 400, cpa: 5000 });
  assert.deepEqual(result.invalid, []);
  assert.equal(result.inconsistent, false);
});

test('missing/zero denominators are unavailable while valid zero numerators are preserved', () => {
  assert.deepEqual(seo.calculateMetrics({}).metrics, { ctr: null, cvr: null, roas: null, cpa: null });
  const result = seo.calculateMetrics({ impressions: 100, clicks: 0, orders: 0, spend: 50, revenue: 0 });
  assert.deepEqual(result.metrics, { ctr: 0, cvr: null, roas: 0, cpa: null });
  assert.equal(seo.calculateMetrics({ spend: 0, revenue: 50 }).metrics.roas, null);
  assert.equal(seo.calculateMetrics({ spend: 0, orders: 3 }).metrics.cpa, 0);
});

test('fractional counts are rejected while decimal monetary values remain valid', () => {
  const result = seo.calculateMetrics({ impressions: 100.5, clicks: '3.5', orders: 1.5, spend: '0.50', revenue: '1.25' });
  assert.deepEqual(result.invalid, ['impressions', 'clicks', 'orders']);
  assert.deepEqual(result.metrics, { ctr: null, cvr: null, roas: 250, cpa: null });
  const wholeCounts = seo.calculateMetrics({ impressions: '100.0', clicks: 10, orders: 2, spend: 10.5, revenue: 42 });
  assert.deepEqual(wholeCounts.invalid, []);
  assert.deepEqual(wholeCounts.metrics, { ctr: 10, cvr: 20, roas: 400, cpa: 5.25 });
});

test('invalid and contradictory input is surfaced; overflow never becomes an infinite metric', () => {
  const result = seo.calculateMetrics({ impressions: -1, clicks: 'bad', orders: '1e309', spend: NaN, revenue: [] });
  assert.equal(result.invalid.length, 5);
  assert.deepEqual(result.metrics, { ctr: null, cvr: null, roas: null, cpa: null });
  assert.equal(seo.calculateMetrics({ impressions: 1, clicks: 2 }).inconsistent, true);
  assert.equal(seo.calculateMetrics({ clicks: 1, orders: 2 }).inconsistent, true);
  assert.equal(seo.calculateMetrics({ spend: Number.MIN_VALUE, revenue: Number.MAX_VALUE }).overflow, true);
});

test('legacy storage migrates only explicit booleans at known positions', () => {
  const result = seo.parseChecks('{"0":true,"1":"false","2":1,"12":true,"13":true,"__proto__":{"polluted":true}}', true);
  assert.equal(result['rel-title'], true);
  assert.equal(result['rel-category'], false);
  assert.equal(result['rel-attributes'], false);
  assert.equal(result['trust-agency'], true);
  assert.equal(Object.keys(result).length, 13);
  assert.equal(Object.getPrototypeOf(result), null);
  assert.equal({}.polluted, undefined);
});

test('corrupt/foreign storage and inherited properties fail safely', () => {
  for (const raw of ['broken', 'null', '[]', '{"version":2,"checks":null}', '{"version":1,"checks":{}}']) {
    assert.equal(seo.parseChecks(raw, false), null);
  }
  const result = seo.parseChecks('{"version":2,"checks":{"rel-title":true,"rel-category":"true","unknown":true}}', false);
  assert.equal(result['rel-title'], true);
  assert.equal(result['rel-category'], false);
  assert.equal(Object.keys(result).length, 13);
  assert.equal(seo.normalizeChecks(Object.create({ 'rel-title': true }))['rel-title'], false);
});

