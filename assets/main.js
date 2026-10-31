(function () {
  'use strict';
  var core = window.SEOCore;
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (selector) { return Array.from(document.querySelectorAll(selector)); };
  var setText = function (id, value) { var element = $(id); if (element) element.textContent = value; };
  var on = function (id, event, callback) { var element = $(id); if (element) element.addEventListener(event, callback); };
  var setWidth = function (id, value) { var element = $(id); if (element) element.style.width = value + '%'; };
  var toastTimer;
  function toast(message) {
    var element = $('toast');
    if (!element) return;
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    element.classList.add('visible');
    toastTimer = window.setTimeout(function () { element.classList.remove('visible'); element.hidden = true; }, 3500);
  }
  function openDialog(dialog, focusTarget) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') { if (!dialog.open) dialog.showModal(); }
    else dialog.setAttribute('open', '');
    if (focusTarget) focusTarget.focus();
  }
  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  // Core reading content is never gated on an animation observer.
  $$('.reveal').forEach(function (element) { element.classList.add('in'); });
  var navLinks = $$('.navin a[href^="#"], .side-nav a[href^="#"], .sidebar-nav a[href^="#"]');
  var navSections = Array.from(new Set(navLinks.map(function (link) { return $(link.hash.slice(1)); }).filter(Boolean)));
  var scrollPending = false;
  function updateScroll() {
    scrollPending = false;
    var anchorOffset = parseFloat(window.getComputedStyle(document.documentElement).scrollPaddingTop) || 100;
    var top = window.scrollY + anchorOffset + 8, active = null;
    navSections.forEach(function (section) { if (section.getBoundingClientRect().top + window.scrollY <= top) active = section.id; });
    var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (maxScroll > 0 && window.scrollY >= maxScroll - 8 && navSections.length) active = navSections[navSections.length - 1].id;
    navLinks.forEach(function (link) {
      var current = link.hash === '#' + active;
      link.classList.toggle('on', current);
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    var mobile = $('mobile-nav');
    if (mobile && active && Array.from(mobile.options).some(function (option) { return option.value === '#' + active; })) mobile.value = '#' + active;
    var percent = maxScroll > 0 ? Math.max(0, Math.min(100, window.scrollY / maxScroll * 100)) : 0;
    setWidth('reading-progress', percent);
    var back = $('back-to-top');
    if (back) back.hidden = window.scrollY < 600;
  }
  function scheduleScroll() {
    if (!scrollPending) { scrollPending = true; window.requestAnimationFrame(updateScroll); }
  }
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', scheduleScroll, { passive: true });
  window.addEventListener('load', scheduleScroll);
  on('mobile-nav', 'change', function (event) {
    var target = $(event.target.value.replace(/^#/, ''));
    if (target) window.location.hash = target.id;
  });

  var tabs = $$('[role="tab"][data-panel]');
  function selectTab(tab, focus) {
    if (!tab) return;
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      item.classList.toggle('active', selected);
      var panel = $(item.dataset.panel);
      if (panel) panel.hidden = !selected;
    });
    if (focus) tab.focus();
    scheduleScroll();
  }
  function openTool(name) { selectTab(tabs.find(function (tab) { return tab.dataset.panel === name + '-panel'; }), false); }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (event) {
      var target;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); selectTab(tabs[target], true); }
    });
  });
  $$('[data-open-tool]').forEach(function (link) { link.addEventListener('click', function () { openTool(link.dataset.openTool); }); });
  if (tabs.length) selectTab(tabs.find(function (tab) { return tab.getAttribute('aria-selected') === 'true'; }) || tabs[0], false);

  var titleInput = $('pname'), titleResult = null;
  function updateTitle() {
    if (!titleInput || !core) return;
    titleResult = core.checkTitle(titleInput.value);
    setText('pcnt', titleResult.length + '자');
    setText('pscore', titleResult.empty ? '—' : String(titleResult.passCount));
    setWidth('pbar', titleResult.empty ? 0 : titleResult.passCount / titleResult.total * 100);
    var copy = $('copy-title');
    if (copy) copy.disabled = titleResult.empty;
    var output = $('pcheck');
    if (!output) return;
    output.replaceChildren();
    if (titleResult.empty) {
      var empty = document.createElement('li');
      empty.className = 'empty-hint';
      empty.textContent = '상품명을 입력하면 길이·중복·판매 조건·기호를 함께 살펴봐요.';
      output.appendChild(empty);
      return;
    }
    titleResult.items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = item.pass ? 'ok' : 'wn';
      var icon = document.createElement('b');
      icon.textContent = item.pass ? '✓' : '!';
      icon.setAttribute('aria-hidden', 'true');
      var text = document.createElement('span');
      var heading = document.createElement('strong');
      heading.textContent = item.label + (item.pass ? ' · 확인' : ' · 검토');
      var description = document.createElement('span');
      description.textContent = item.message;
      text.append(heading, description);
      li.append(icon, text);
      output.appendChild(li);
    });
  }
  on('pname', 'input', updateTitle);
  on('pex', 'click', function (event) {
    event.preventDefault();
    if (!titleInput) return;
    titleInput.value = '모닝랩 스테인리스 텀블러 크림 500ml';
    updateTitle(); titleInput.focus();
  });
  on('pbad', 'click', function (event) {
    event.preventDefault();
    if (!titleInput) return;
    titleInput.value = '[특가 무료배송] 최고 텀블러 텀블러 쿠폰 ★강추★';
    updateTitle(); titleInput.focus();
  });
  on('pclear', 'click', function () { if (titleInput) { titleInput.value = ''; updateTitle(); titleInput.focus(); } });
  on('copy-title', 'click', async function () {
    if (!titleInput || !titleInput.value.trim()) return;
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(titleInput.value);
      toast('상품명을 복사했어요.');
    } catch (error) {
      titleInput.focus(); titleInput.select();
      var copied = false;
      try { copied = document.execCommand('copy'); } catch (ignored) { /* Selection remains available. */ }
      toast(copied ? '상품명을 복사했어요.' : '상품명을 선택했어요. Ctrl+C 또는 ⌘C로 복사해 주세요.');
    }
  });

  var boxes = $$('.chk input[type="checkbox"]');
  var STORAGE_KEY = 'nss-checklist-v2', LEGACY_KEY = 'nss-chk-v1';
  var storageAvailable = true;
  var groupNames = { rel: '상품 정보', pop: '판매 기반', trust: '정책 준수' };
  var saved = core ? core.normalizeChecks(null) : Object.create(null);
  if (core) {
    try {
      var current = core.parseChecks(window.localStorage.getItem(STORAGE_KEY), false);
      var legacy = current ? null : core.parseChecks(window.localStorage.getItem(LEGACY_KEY), true);
      saved = current || legacy || saved;
      // A write also detects private-mode/quota restrictions before promising autosave.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, checks: saved }));
      if (legacy) window.localStorage.removeItem(LEGACY_KEY);
    } catch (error) { storageAvailable = false; }
  }
  function updateStorageStatus() {
    setText('storage-status', storageAvailable ? '진행 상황은 이 브라우저에 자동 저장돼요.' : '브라우저 저장이 제한돼 있어요. 새로고침 전에 결과를 내려받으세요.');
  }
  function saveChecks() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, checks: saved }));
      storageAvailable = true;
    } catch (error) { storageAvailable = false; }
    updateStorageStatus();
  }
  function checkboxLabel(box) { return (box.closest('label') || box.parentElement).textContent.trim().replace(/\s+/g, ' '); }
  function updateChecks() {
    var totals = { rel: [0, 0], pop: [0, 0], trust: [0, 0] }, completed = 0;
    boxes.forEach(function (box) {
      var group = totals[box.dataset.g];
      if (group) { group[1]++; if (box.checked) group[0]++; }
      if (box.checked) completed++;
      var label = box.closest('label');
      if (label) label.classList.toggle('is-complete', box.checked);
    });
    var percent = boxes.length ? Math.round(completed / boxes.length * 100) : 0;
    setText('cscore', percent); setWidth('cbar', percent);
    setText('hero-progress', percent + '%');
    setText('hero-count', completed + ' / ' + boxes.length);
    setText('side-count', completed + ' / ' + boxes.length);
    setWidth('side-bar', percent);
    var ring = $('hero-ring');
    if (ring) ring.style.setProperty('--progress', percent * 3.6 + 'deg');
    Object.keys(totals).forEach(function (key) {
      setText('g' + key, totals[key][0] + ' / ' + totals[key][1]);
      setText('hero-' + key + '-count', totals[key][0] + ' / ' + totals[key][1]);
      setWidth('hero-' + key + '-bar', totals[key][1] ? totals[key][0] / totals[key][1] * 100 : 0);
    });
    var weakest = Object.keys(totals).filter(function (key) { return totals[key][1]; })
      .sort(function (a, b) { return totals[a][0] / totals[a][1] - totals[b][0] / totals[b][1]; })[0];
    setText('cmsg', completed === boxes.length && boxes.length ? '모든 기본기를 점검했어요. 실제 성과 지표를 보며 개선해 보세요.' :
      completed ? '다음으로 살펴볼 영역: ' + groupNames[weakest] : '해당하는 항목을 체크하면 다음 할 일을 알려드려요.');
    var next = $('next-actions');
    if (next) {
      next.replaceChildren();
      var remaining = boxes.filter(function (box) { return !box.checked; }).slice(0, 3);
      if (!remaining.length) {
        var complete = document.createElement('li');
        complete.textContent = '모두 완료했어요. 다음 주에는 노출·클릭·주문 변화를 확인하세요.';
        next.appendChild(complete);
      } else remaining.forEach(function (box) {
        var item = document.createElement('li');
        item.textContent = checkboxLabel(box);
        next.appendChild(item);
      });
    }
    updateStorageStatus();
  }
  boxes.forEach(function (box, index) {
    var key = box.dataset.key || (core && core.CHECK_KEYS[index]);
    if (!key) return;
    box.dataset.key = key;
    box.checked = saved[key] === true;
    box.addEventListener('change', function () { saved[key] = box.checked; saveChecks(); updateChecks(); });
  });
  window.addEventListener('storage', function (event) {
    if (!core || (event.key !== STORAGE_KEY && event.key !== null)) return;
    saved = core.parseChecks(event.newValue, false) || core.normalizeChecks(null);
    boxes.forEach(function (box) { box.checked = saved[box.dataset.key] === true; });
    updateChecks();
  });
  on('check-reset', 'click', function () { openDialog($('reset-dialog'), $('reset-cancel')); });
  on('reset-cancel', 'click', function () { closeDialog($('reset-dialog')); });
  on('reset-confirm', 'click', function () {
    if (!core) return;
    saved = core.normalizeChecks(null);
    boxes.forEach(function (box) { box.checked = false; });
    saveChecks(); updateChecks(); closeDialog($('reset-dialog'));
    toast('체크리스트를 초기화했어요.');
    if ($('check-reset')) $('check-reset').focus();
  });

  var metricNames = ['impressions', 'clicks', 'orders', 'spend', 'revenue'];
  var metricLabels = { impressions: '노출 수', clicks: '클릭 수', orders: '주문 수', spend: '광고비', revenue: '광고 기여 매출' };
  var metricResult;
  function metricInputs() {
    var values = Object.create(null);
    metricNames.forEach(function (name) {
      var field = $('metric-' + name);
      values[name] = field && field.validity.badInput ? NaN : field ? field.value : '';
    });
    return values;
  }
  function formatPercent(number) { return number === null ? '—' : number.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '%'; }
  function formatWon(number) { return number === null ? '—' : Math.round(number).toLocaleString('ko-KR') + '원'; }
  function updateMetrics() {
    if (!core) return;
    metricResult = core.calculateMetrics(metricInputs());
    setText('metric-ctr', formatPercent(metricResult.metrics.ctr));
    setText('metric-cvr', formatPercent(metricResult.metrics.cvr));
    setText('metric-roas', formatPercent(metricResult.metrics.roas));
    setText('metric-cpa', formatWon(metricResult.metrics.cpa));
    metricNames.forEach(function (name) {
      var field = $('metric-' + name);
      if (field) field.setAttribute('aria-invalid', String(metricResult.invalid.includes(name)));
    });
    var warnings = [];
    var invalidCounts = metricResult.invalid.filter(function (name) { return metricNames.indexOf(name) < 3; });
    var invalidMoney = metricResult.invalid.filter(function (name) { return metricNames.indexOf(name) >= 3; });
    if (invalidCounts.length) warnings.push(invalidCounts.map(function (name) { return metricLabels[name]; }).join('·') + '에는 0 이상의 정수를 입력하세요. 횟수·건수는 소수로 입력할 수 없어요.');
    if (invalidMoney.length) warnings.push(invalidMoney.map(function (name) { return metricLabels[name]; }).join('·') + '에 0 이상의 유효한 숫자를 입력하세요. 금액은 소수를 사용할 수 있어요.');
    if (metricResult.inconsistent) warnings.push('클릭 수가 노출 수보다 많거나 주문 수가 클릭 수보다 많아요. 같은 기간·채널·집계 기준인지 확인하세요. 전환 집계 방식에 따라 차이가 날 수 있어요.');
    if (metricResult.overflow) warnings.push('입력값의 범위가 너무 커서 일부 값을 계산할 수 없어요.');
    var warning = $('metric-warning');
    if (warning) { warning.textContent = warnings.join(' '); warning.hidden = warnings.length === 0; }
  }
  metricNames.forEach(function (name) { on('metric-' + name, 'input', updateMetrics); });
  on('metric-example', 'click', function () {
    var values = [10000, 300, 12, 60000, 240000];
    metricNames.forEach(function (name, index) { var field = $('metric-' + name); if (field) field.value = values[index]; });
    updateMetrics(); toast('계산 방법을 보여주는 가상 예시를 넣었어요.');
  });
  on('metric-clear', 'click', function () {
    metricNames.forEach(function (name) { var field = $('metric-' + name); if (field) field.value = ''; });
    updateMetrics();
    if ($('metric-impressions')) $('metric-impressions').focus();
  });

  function exportReport() {
    // Refresh from the current fields even if autofill changed them without an input event.
    updateTitle();
    updateMetrics();
    var now = new Date();
    var date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    var time = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
    var completed = boxes.filter(function (box) { return box.checked; }).length;
    var lines = ['# 네이버쇼핑 SEO 실행 리포트', '', 'AI Builders Lab · ' + date + ' ' + time + ' KST', '',
      '이 리포트는 자가 점검 기록입니다. 네이버의 공식 점수·랭킹 예측·노출 보장이 아닙니다.', '',
      '## 상품명 점검', ''];
    if (titleInput && titleInput.value.trim() && titleResult) {
      lines.push('> ' + titleInput.value.trim().replace(/\r?\n/g, '\n> '), '', '점검 항목 확인: ' + titleResult.passCount + ' / ' + titleResult.total, '');
      titleResult.items.forEach(function (item) { lines.push('- [' + (item.pass ? 'x' : ' ') + '] ' + item.label + ': ' + item.message); });
      lines.push('', '문구 일치·길이 등 단순 규칙의 참고 결과입니다. 브랜드·모델명 포함 여부와 상품 정보의 정확성은 직접 확인하세요.');
    } else lines.push('입력한 상품명이 없습니다.');
    lines.push('', '## 기본기 체크리스트', '', '완료: ' + completed + ' / ' + boxes.length + '개', '');
    boxes.forEach(function (box) { lines.push('- [' + (box.checked ? 'x' : ' ') + '] ' + checkboxLabel(box)); });
    lines.push('', '## 다음 할 일', '');
    var unchecked = boxes.filter(function (box) { return !box.checked; });
    if (unchecked.length) unchecked.slice(0, 3).forEach(function (box, index) { lines.push((index + 1) + '. ' + checkboxLabel(box)); });
    else lines.push('모든 항목을 점검했습니다. 실제 성과 지표를 주기적으로 확인하세요.');
    if (metricResult && (metricResult.invalid.length || metricNames.some(function (name) { return metricResult.values[name] !== null; }))) {
      lines.push('', '## 성과 지표', '', '같은 기간·채널·집계 기준으로 입력했는지 확인하세요. 예시 입력을 사용했다면 실제 성과가 아닙니다.', '');
      metricNames.forEach(function (name) { lines.push('- ' + metricLabels[name] + ': ' + (metricResult.values[name] === null ? '미입력/유효하지 않음' : metricResult.values[name].toLocaleString('ko-KR'))); });
      lines.push('', '- CTR = 클릭 ÷ 노출 × 100: ' + formatPercent(metricResult.metrics.ctr),
        '- CVR = 주문 ÷ 클릭 × 100: ' + formatPercent(metricResult.metrics.cvr),
        '- ROAS = 광고 기여 매출 ÷ 광고비 × 100: ' + formatPercent(metricResult.metrics.roas),
        '- 주문당 광고비 = 광고비 ÷ 주문: ' + formatWon(metricResult.metrics.cpa));
      if (metricResult.invalid.length || metricResult.inconsistent || metricResult.overflow) lines.push('', '입력값 경고: ' + ($('metric-warning') ? $('metric-warning').textContent : '입력값을 확인하세요.'));
      lines.push('', 'ROAS는 순이익률이 아닙니다. 원가·수수료·배송비 등은 계산에 포함하지 않습니다.');
    }
    lines.push('', '## 공식 자료', '', '- 네이버 쇼핑 SEO 가이드: https://safety.shopping.naver.com/operation/usage/store/seoguide',
      '- 상품정보 제공 가이드: https://join.shopping.naver.com/misc/download/shopping_product_info_provide_guide.nhn',
      '- 이 페이지: https://aihubos.github.io/naver-shopping-seo/', '',
      storageAvailable ? '체크리스트는 이 브라우저에 저장됩니다. 상품명과 계산기 입력값은 저장하거나 서버로 전송하지 않습니다.' : '브라우저 저장이 제한되어 체크리스트가 유지되지 않을 수 있습니다. 상품명과 계산기 입력값은 서버로 전송하지 않습니다.');
    var blob = new Blob(['\uFEFF' + lines.join('\n') + '\n'], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'seo-diagnosis-' + date + '.md';
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('진단 리포트 다운로드를 시작했어요.');
  }
  on('export-report', 'click', exportReport);
  on('download-checklist', 'click', exportReport);
  on('print-page', 'click', function () { window.print(); });

  var sourceFilter = 'all', sourceGroups = $$('[data-source-group]');
  function filterSources() {
    var query = ($('source-search') ? $('source-search').value : '').trim().toLocaleLowerCase('ko-KR');
    var visible = 0, total = 0;
    sourceGroups.forEach(function (group) {
      var shown = 0;
      Array.from(group.querySelectorAll('.srcs > li')).forEach(function (item) {
        total++;
        var match = (sourceFilter === 'all' || group.dataset.sourceGroup === sourceFilter) && item.textContent.toLocaleLowerCase('ko-KR').includes(query);
        item.hidden = !match;
        if (match) shown++;
      });
      group.hidden = shown === 0;
      visible += shown;
    });
    setText('source-count', visible + ' / ' + total + '개 자료');
    var empty = $('source-empty');
    if (empty) empty.hidden = visible > 0;
    scheduleScroll();
  }
  function selectSourceFilter(value) {
    sourceFilter = value;
    $$('[data-source-filter]').forEach(function (button) {
      var active = button.dataset.sourceFilter === value;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
    filterSources();
  }
  $$('[data-source-filter]').forEach(function (button) {
    button.addEventListener('click', function () { selectSourceFilter(button.dataset.sourceFilter); });
  });
  on('source-search', 'input', filterSources);

  var searchDialog = $('search-dialog'), searchInput = $('search-input'), searchResults = $('search-results');
  var searchIndex = [];
  $$('section[id]').forEach(function (section) {
    var sectionHeading = section.querySelector('h2');
    if (!sectionHeading) return;
    var sectionTitle = sectionHeading.textContent.trim().replace(/\s+/g, ' ');
    var blocks = Array.from(section.querySelectorAll('h2, h3, .card p, details, .srcs > li, .step, .metric-result'));
    blocks.forEach(function (block, index) {
      var text = block.textContent.trim().replace(/\s+/g, ' ');
      if (text.length < 3) return;
      var container = block.closest('.card, details, .step');
      var heading = container && container.querySelector('h3, summary');
      var title = heading ? heading.textContent.trim() : /^H[23]$/.test(block.tagName) ? text : sectionTitle;
      var panel = block.closest('[role="tabpanel"]');
      if (block.classList.contains('metric-result')) title = block.querySelector('span').textContent.trim();
      if (block.matches('.srcs > li')) {
        var sourceLink = block.querySelector('a');
        if (sourceLink) title = sourceLink.textContent.trim();
      }
      if (!block.id) {
        var generatedId = 'search-' + section.id + '-' + (index + 1);
        var suffix = 1;
        while ($(generatedId)) generatedId = 'search-' + section.id + '-' + (index + 1) + '-' + suffix++;
        block.id = generatedId;
      }
      searchIndex.push({ section: section.id, target: block, title: title, text: text, sectionTitle: sectionTitle, tool: panel ? panel.id.replace(/-panel$/, '') : null });
    });
  });
  function renderSearch() {
    if (!searchInput || !searchResults) return;
    var query = searchInput.value.trim().toLocaleLowerCase('ko-KR');
    var words = query.split(/\s+/).filter(Boolean), matches;
    if (!query) {
      matches = ['summary', 'ranking', 'tools', 'action'].map(function (id) { return searchIndex.find(function (item) { return item.section === id; }); }).filter(Boolean);
    } else {
      var found = new Set();
      matches = searchIndex.filter(function (item) {
        var haystack = (item.title + ' ' + item.text).toLocaleLowerCase('ko-KR');
        var key = item.section + '|' + item.title;
        if (words.every(function (word) { return haystack.includes(word); }) && !found.has(key)) { found.add(key); return true; }
        return false;
      }).slice(0, 8);
    }
    searchResults.replaceChildren();
    if (!matches.length) {
      var empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = '찾는 내용이 없어요. 상품명, 리뷰, 광고, AI처럼 짧게 검색해 보세요.';
      searchResults.appendChild(empty);
    }
    matches.forEach(function (item) {
      var li = document.createElement('div'), link = document.createElement('a');
      link.className = 'search-result'; link.href = '#' + item.target.id;
      var title = document.createElement('strong'); title.className = 'search-result-title'; title.textContent = item.title;
      var snippet = document.createElement('span'); snippet.className = 'search-result-snippet';
      var start = query ? Math.max(0, item.text.toLocaleLowerCase('ko-KR').indexOf(words[0]) - 24) : 0;
      snippet.textContent = (start > 0 ? '…' : '') + item.text.slice(start, start + 115) + (item.text.length > start + 115 ? '…' : '');
      var meta = document.createElement('span'); meta.className = 'search-result-meta'; meta.textContent = item.sectionTitle + ' →';
      link.append(title, snippet, meta);
      link.addEventListener('click', function () {
        if (item.tool) openTool(item.tool);
        if (item.section === 'sources') {
          if ($('source-search')) $('source-search').value = '';
          selectSourceFilter('all');
        }
        var details = item.target.closest('details');
        if (details) details.open = true;
        closeDialog(searchDialog);
        item.target.setAttribute('tabindex', '-1');
        item.target.focus({ preventScroll: true });
      });
      li.appendChild(link); searchResults.appendChild(li);
    });
    setText('search-status', query ? matches.length + '개 결과' : '자주 찾는 내용');
  }
  function openSearch() { renderSearch(); openDialog(searchDialog, searchInput); }
  on('open-search', 'click', openSearch);
  on('close-search', 'click', function () { closeDialog(searchDialog); });
  on('search-input', 'input', renderSearch);
  on('search-input', 'keydown', function (event) {
    if ((event.key === 'ArrowDown' || event.key === 'Enter') && searchResults) {
      var first = searchResults.querySelector('a');
      if (first) { event.preventDefault(); if (event.key === 'Enter') first.click(); else first.focus(); }
    }
  });
  document.addEventListener('keydown', function (event) {
    var target = event.target;
    var editing = target && (target.isContentEditable || (target.closest && target.closest('input, textarea, select, dialog[open]')));
    if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !editing) {
      event.preventDefault(); openSearch();
    }
  });
  if (searchDialog) searchDialog.addEventListener('close', function () {
    if ($('open-search') && document.activeElement === document.body) $('open-search').focus();
  });
  [searchDialog, $('reset-dialog')].filter(Boolean).forEach(function (dialog) {
    dialog.addEventListener('click', function (event) {
      var rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog(dialog);
    });
  });

  updateTitle(); updateChecks(); updateMetrics(); filterSources(); updateScroll();
}());

