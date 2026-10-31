(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SEOCore = factory();
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var CHECK_KEYS = Object.freeze([
    'rel-title', 'rel-category', 'rel-attributes', 'rel-details',
    'pop-image', 'pop-offer', 'pop-reviews', 'pop-channel', 'pop-metrics',
    'trust-title', 'trust-registration', 'trust-disclosure', 'trust-agency'
  ]);
  var PROMO = ['할인', '세일', '특가', '최저가', '무료배송', '쿠폰', '적립', '이벤트', '사은품', '당일발송', '핫딜', '1+1', '증정'];
  var HYPE = ['강추', '대박', '베스트', '최고', '초특가'];

  // Editing aids, not Naver's ranking formula or prohibited-word list.
  function checkTitle(input) {
    var title = String(input == null ? '' : input).trim().normalize('NFC');
    var length = Array.from(title).length;
    if (!title) return { empty: true, length: 0, passCount: 0, total: 4, items: [] };
    var words = (title.toLocaleLowerCase('ko-KR').match(/[\p{L}\p{N}]+/gu) || [])
      .filter(function (word) { return Array.from(word).length >= 2; });
    var seen = new Set(), duplicates = new Set();
    words.forEach(function (word) {
      if (seen.has(word)) duplicates.add(word);
      seen.add(word);
    });
    var promotions = PROMO.concat(HYPE).filter(function (word) { return title.includes(word); });
    var ornaments = Array.from(new Set(title.match(/[^\p{L}\p{N}\p{M}\s()[\]/&+,.~·%_'’\-]/gu) || []));
    var repeatedSymbols = /([^\p{L}\p{N}\p{M}\s])\1{2,}/u.test(title);
    var items = [
      {
        id: 'length', pass: length <= 50, label: '간결한 길이',
        message: length <= 50 ? length + '자 · 50자 이내예요. 필요한 브랜드·모델·규격이 있는지도 확인하세요.' :
          length + '자 · 이 도구의 참고선인 50자를 넘었어요. 핵심 정보 중심으로 정리해 보세요. 글자 수만으로 노출을 판정하지 않아요.'
      },
      {
        id: 'duplicates', pass: duplicates.size === 0, label: '단어 중복',
        message: duplicates.size ? '반복 후보: ' + Array.from(duplicates).join(', ') + '. 꼭 필요한 모델·규격 표현인지 확인하세요.' :
          '공백·기호로 구분된 단어에서 반복 후보가 없어요.'
      },
      {
        id: 'promotions', pass: promotions.length === 0, label: '판매 조건·수식어',
        message: promotions.length ? '검토 후보: ' + promotions.join(', ') + '. 판매 조건은 별도 필드로 옮기세요. 브랜드·모델명 일부라면 그대로 필요할 수 있어요.' :
          '이 도구의 예시 목록에서 할인·쿠폰·과장 표현 후보가 없어요.'
      },
      {
        id: 'symbols', pass: ornaments.length === 0 && !repeatedSymbols, label: '장식 기호',
        message: ornaments.length || repeatedSymbols ? '검토할 기호가 있어요' + (ornaments.length ? ': ' + ornaments.join(' ') : '') + '. 모델·규격에 필요한 기호와 불필요한 장식을 구분하세요.' :
          '눈에 띄는 장식·반복 기호가 없어요. 상품을 설명하는 문자와 규격 기호는 사용할 수 있어요.'
      }
    ];
    return { empty: false, length: length, passCount: items.filter(function (item) { return item.pass; }).length, total: 4, items: items };
  }

  function parseNonNegative(value) {
    if (value == null || (typeof value === 'string' && value.trim() === '')) return { value: null, error: false };
    if (typeof value !== 'string' && typeof value !== 'number') return { value: null, error: true };
    var number = Number(value);
    return Number.isFinite(number) && number >= 0 ? { value: number, error: false } : { value: null, error: true };
  }

  function calculateMetrics(input) {
    input = input || {};
    var names = ['impressions', 'clicks', 'orders', 'spend', 'revenue'];
    var parsed = Object.create(null), invalid = [];
    names.forEach(function (name) {
      var result = parseNonNegative(input[name]);
      if (names.indexOf(name) < 3 && result.value !== null && !Number.isInteger(result.value)) {
        result.value = null;
        result.error = true;
      }
      parsed[name] = result.value;
      if (result.error) invalid.push(name);
    });
    var overflow = false;
    function divide(numerator, denominator, scale) {
      if (numerator === null || denominator === null || denominator <= 0) return null;
      var result = (numerator / denominator) * scale;
      if (!Number.isFinite(result)) { overflow = true; return null; }
      return result;
    }
    var metrics = {
      ctr: divide(parsed.clicks, parsed.impressions, 100),
      cvr: divide(parsed.orders, parsed.clicks, 100),
      roas: divide(parsed.revenue, parsed.spend, 100),
      cpa: divide(parsed.spend, parsed.orders, 1)
    };
    var inconsistent = (parsed.clicks !== null && parsed.impressions !== null && parsed.clicks > parsed.impressions) ||
      (parsed.orders !== null && parsed.clicks !== null && parsed.orders > parsed.clicks);
    return { values: parsed, metrics: metrics, invalid: invalid, inconsistent: inconsistent, overflow: overflow };
  }

  function normalizeChecks(input, legacy) {
    var output = Object.create(null);
    var validObject = input !== null && typeof input === 'object' && !Array.isArray(input);
    CHECK_KEYS.forEach(function (key, index) {
      var sourceKey = legacy ? String(index) : key;
      output[key] = Boolean(validObject && Object.prototype.hasOwnProperty.call(input, sourceKey) && input[sourceKey] === true);
    });
    return output;
  }

  function parseChecks(raw, legacy) {
    try {
      if (typeof raw !== 'string' || raw.length > 10000) return null;
      var parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      if (!legacy && (parsed.version !== 2 || !parsed.checks || typeof parsed.checks !== 'object' || Array.isArray(parsed.checks))) return null;
      return normalizeChecks(legacy ? parsed : parsed.checks, legacy);
    } catch (error) { return null; }
  }

  return Object.freeze({ CHECK_KEYS: CHECK_KEYS, checkTitle: checkTitle, calculateMetrics: calculateMetrics, normalizeChecks: normalizeChecks, parseChecks: parseChecks });
}));

