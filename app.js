(function () {
  'use strict';

  const LS_KEY = 'redgreen:v2';
  const CARD_W = 540, CARD_H = 720, EXPORT_SCALE = 2;
  const DISP_W = 250;
  const TYPE_LABEL = { cover: '封面', bilingual: '双语分析', table: '排名表格', list: '列表', policy: '政策', text: '文本', canvas: '自由画布' };
  const ALIGNS = ['left', 'center', 'right'];
  const DEFAULT_FOOTER = '备注：本文所提供的信息均来源于大学官网。申请时请务必以学校官网公布的最新信息为准。';
  const FOOTER_PRESETS = {
    default: '备注：本文所提供的信息均来源于大学官网。申请时请务必以学校官网公布的最新信息为准。',
    visa: '备注：本文信息仅供参考，最终以官方签证政策及学校官网公布为准。',
    admit: '数据来源：各校官网 / 官方报告，仅供参考，具体以官网最新公布为准。',
    qs: '数据来源：QS World University Rankings by Subject。仅供参考。',
    short: '* 信息来源于官网，仅供参考。',
    clear: '',
  };
  // 注意：用单引号包字体名，避免破坏导出时的 style="…" 双引号属性
  // 这些都是 Mac 自带字体（中英混排时英文走前面的字体、中文自动回退到后面的黑/宋体）
  const FONT_STACKS = {
    hei: "-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    yuan: "'Yuanti SC', 'Yuppy SC', 'PingFang SC', sans-serif",
    kai: "'Kaiti SC', 'STKaiti', 'KaiTi', serif",
    song: "'Songti SC', 'STSong', 'SimSun', serif",
    libian: "'Libian SC', 'Baoli SC', 'PingFang SC', serif",
    weibei: "'Weibei SC', 'Hannotate SC', 'PingFang SC', serif",
    yuppy: "'Yuppy SC', 'Yuanti SC', 'PingFang SC', sans-serif",
    impact: "Impact, Haettenschweiler, 'Arial Narrow', 'PingFang SC', sans-serif",
    futura: "Futura, 'Trebuchet MS', Verdana, 'PingFang SC', sans-serif",
    helvetica: "'Helvetica Neue', Helvetica, Arial, 'PingFang SC', sans-serif",
    georgia: "Georgia, 'Songti SC', serif",
    times: "'Times New Roman', Times, 'Songti SC', serif",
    courier: "'Courier New', Courier, monospace",
    custom: "'EduDisplay', -apple-system, 'PingFang SC', sans-serif",
  };
  function coverFontStack() { return FONT_STACKS[D().coverFont] || FONT_STACKS.hei; }

  // 资产（用户放进 assets/ 后自动生效）
  let logoDataUri = null;     // assets/logo-mark.(svg|png) → 按主题色重新上色
  let logoAssetNat = { w: 0, h: 0 };
  let memojiDataUri = null;   // assets/memoji.(png|svg) → 小红书封面人物
  let displayFontB64 = null;  // assets/fonts/display.(woff2|ttf) → 封面方块字（导出时内联）
  let displayFontMime = 'font/woff2';
  let cssCache = null;

  // ---------------- 工具 ----------------
  const $ = (s) => document.querySelector(s);
  function mk(tag, cls, attrs) { const e = document.createElement(tag); if (cls) e.className = cls; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function num(v, d) { const n = parseFloat(v); return isFinite(n) ? n : d; }
  function str(v, d) { return v == null ? d : String(v); }
  function toStrArr(v, d) { return Array.isArray(v) ? v.map((x) => String(x)) : d; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function uid() { return 'p' + Math.random().toString(36).slice(2, 9); }

  // ---------------- 状态 ----------------
  function templateDefault(type) {
    switch (type) {
      case 'cover': return { title: '香港大学\n2026 FALL\n工学院新增', showMemoji: true };
      case 'bilingual': return { heading: '拒签原因一：你没有证明这门课非去澳洲读不可', en: '', cn: '', actionTitle: '要怎么做?', steps: ['', ''] };
      case 'list': return { heading: '本期项目一览', items: [{ name: '项目名称', note: '一句话说明' }] };
      case 'policy': return { title: '政策标题', points: ['要点一'] };
      case 'text': return { title: '标题', body: '正文内容……' };
      default: return {};
    }
  }
  // 把模板内容铺成画布元素（var() 颜色随主题自适应；不依赖 D() 以便迁移时调用）
  function elementsFromContent(type, c, opts) {
    opts = opts || {}; const coverFont = opts.coverFont || 'hei', memoji = opts.memojiData || null;
    const els = []; const X = 0.06, W = 0.88, CW = 470, CH = 600; let y = 0.06;
    const TITLE = 'var(--title-color)', HEAD = 'var(--heading)', INK = '';
    const push = (text, size, color, weight, align) => {
      const cpl = Math.max(1, Math.floor((W * CW) / size));
      const lines = String(text).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil((l.length || 1) / cpl)), 0);
      els.push({ id: uid(), kind: 'text', x: X, y, w: W, text: String(text), size, color, weight, align: align || 'left', font: type === 'cover' ? coverFont : 'hei' });
      y += (lines * size * 1.32) / CH + 0.025;
    };
    switch (type) {
      case 'cover':
        push(c.title || '', 80, TITLE, 900, 'center');
        if (c.showMemoji !== false && memoji) els.push({ id: uid(), kind: 'image', x: 0.34, y: Math.min(0.6, y + 0.05), w: 0.32, src: memoji });
        break;
      case 'text': push(c.title || '', 46, HEAD, 900); push(c.body || '', 24, INK, 400); break;
      case 'policy': push(c.title || '', 42, HEAD, 900); (c.points || []).forEach((pt) => push('· ' + pt, 24, INK, 500)); break;
      case 'list': push(c.heading || '', 34, HEAD, 800); (c.items || []).forEach((it, i) => push((i + 1) + '. ' + it.name + (it.note ? '  ' + it.note : ''), 24, INK, 500)); break;
      case 'bilingual':
        push(c.heading || '', 30, HEAD, 800);
        if (c.en) push(c.en, 21, INK, 800);
        if (c.cn) push(c.cn, 21, INK, 400);
        if (c.steps && c.steps.filter(Boolean).length) { push(c.actionTitle || '要怎么做?', 28, HEAD, 800); c.steps.filter(Boolean).forEach((s, i) => push((i + 1) + '. ' + s, 21, INK, 500)); }
        break;
    }
    return els;
  }
  function presetPage(type, opts) { return { id: uid(), type: 'canvas', preset: type, noFooter: type === 'cover', elements: elementsFromContent(type, templateDefault(type), opts) }; }
  function defaultPage(type, opts) {
    if (type === 'table') return { id: uid(), type: 'table', title: '录取数据一览', columns: ['专业', '中国学生录取', '全部录取', '申请要求'], rows: [['', '', '', ''], ['', '', '', '']] };
    if (type === 'canvas') return { id: uid(), type: 'canvas', preset: 'canvas', elements: [{ id: uid(), kind: 'text', x: 0.08, y: 0.1, w: 0.84, text: '双击编辑文字', size: 40, color: '', weight: 800, align: 'left', font: 'hei' }] };
    return presetPage(type, opts || {});
  }
  function deckOpts() { return { coverFont: D().coverFont, memojiData: D().memojiData }; }
  const DEF_CROP = { x: 0, y: 0, w: 1, h: 1 };
  function newDeck() {
    return {
      pages: [defaultPage('cover')],
      brandLabel: '签证信息', brandLabelSize: 24, footerNote: DEFAULT_FOOTER, coverFont: 'hei',
      sloganSize: 24, sloganOffsetX: 0, sloganOffsetY: 0,
      logoData: null, logoNatW: 0, logoNatH: 0, logoRecolor: true,
      logoScale: 1, logoOffsetX: 0, logoOffsetY: 0, logoCrop: { x: 0, y: 0, w: 1, h: 1 },
      memojiData: null, memojiScale: 1, memojiOffsetX: 0, memojiOffsetY: 0,
    };
  }
  function normalizeDeck(s) {
    const d = (s && typeof s === 'object') ? s : {};
    if (!Array.isArray(d.pages)) d.pages = [defaultPage('cover')];
    if (typeof d.brandLabel !== 'string') d.brandLabel = '签证信息';
    if (typeof d.brandLabelSize !== 'number') d.brandLabelSize = 24;
    if (typeof d.footerNote !== 'string') d.footerNote = DEFAULT_FOOTER;
    if (!FONT_STACKS[d.coverFont]) d.coverFont = 'hei';
    if (typeof d.sloganSize !== 'number') d.sloganSize = 24;
    if (typeof d.sloganOffsetX !== 'number') d.sloganOffsetX = 0;
    if (typeof d.sloganOffsetY !== 'number') d.sloganOffsetY = 0;
    if (typeof d.logoData !== 'string') d.logoData = null;
    if (typeof d.logoNatW !== 'number') d.logoNatW = 0;
    if (typeof d.logoNatH !== 'number') d.logoNatH = 0;
    if (typeof d.logoRecolor !== 'boolean') d.logoRecolor = true;
    if (typeof d.logoScale !== 'number') d.logoScale = 1;
    if (typeof d.logoOffsetX !== 'number') d.logoOffsetX = 0;
    if (typeof d.logoOffsetY !== 'number') d.logoOffsetY = 0;
    if (!d.logoCrop || typeof d.logoCrop !== 'object') d.logoCrop = { x: 0, y: 0, w: 1, h: 1 };
    if (typeof d.memojiData !== 'string') d.memojiData = null;
    if (typeof d.memojiScale !== 'number') d.memojiScale = 1;
    if (typeof d.memojiOffsetX !== 'number') d.memojiOffsetX = 0;
    if (typeof d.memojiOffsetY !== 'number') d.memojiOffsetY = 0;
    d.pages = d.pages.map((pg) => migratePage(pg, d));
    return d;
  }
  // 旧模板页 → 画布页（保留内容）；表格/画布页保持
  function migratePage(pg, d) {
    if (!pg || typeof pg !== 'object') return defaultPage('canvas');
    if (pg.type === 'canvas') { if (!Array.isArray(pg.elements)) pg.elements = []; if (typeof pg.preset !== 'string') pg.preset = 'canvas'; return pg; }
    if (pg.type === 'table') { if (!Array.isArray(pg.columns)) pg.columns = ['列1', '列2']; if (!Array.isArray(pg.rows)) pg.rows = []; if (typeof pg.title !== 'string') pg.title = ''; return pg; }
    if (['cover', 'bilingual', 'list', 'policy', 'text'].includes(pg.type)) {
      return { id: pg.id || uid(), type: 'canvas', preset: pg.type, noFooter: pg.type === 'cover', elements: elementsFromContent(pg.type, pg, { coverFont: d.coverFont, memojiData: d.memojiData }) };
    }
    return defaultPage('canvas');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function freshState() { return { platform: 'xhs', decks: { xhs: newDeck(), xls: newDeck() } }; }
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (!s || typeof s !== 'object') return freshState();
      const platform = (s.platform === 'xls') ? 'xls' : 'xhs';
      if (s.decks && s.decks.xhs && s.decks.xls) return { platform, decks: { xhs: normalizeDeck(s.decks.xhs), xls: normalizeDeck(s.decks.xls) } };
      if (Array.isArray(s.pages)) { const d = normalizeDeck(s); return { platform, decks: { xhs: d, xls: clone(d) } }; } // 旧版单 deck → 两平台各一份（互不联动）
      return freshState();
    } catch { return freshState(); }
  }
  function D() { return state.decks[state.platform]; }
  function imgNat(url) { return new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({ w: 0, h: 0 }); i.src = url; }); }
  function resetLogoAdjust() { D().logoScale = 1; D().logoOffsetX = 0; D().logoOffsetY = 0; D().logoCrop = { x: 0, y: 0, w: 1, h: 1 }; }
  let state = loadState();
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); return true; } catch { return false; } }
  function touch() { save(); renderPreview(); }
  function restructure() { save(); renderEditors(); renderPreview(); }

  // ---------------- 报头 / 卡片骨架 ----------------
  function logoMarkup() {
    const src = D().logoData || logoDataUri;
    if (!src) return `<div class="logo-text">EduLight<span class="spark"></span></div>`;
    const natW = D().logoData ? D().logoNatW : logoAssetNat.w;
    const natH = D().logoData ? D().logoNatH : logoAssetNat.h;
    const c = D().logoCrop || DEF_CROP;
    const scale = D().logoScale || 1;
    const boxH = 46 * scale;
    let boxW, bgW, bgH, bgX, bgY;
    if (natW > 0 && natH > 0 && c.w > 0 && c.h > 0) {
      boxW = boxH * ((c.w * natW) / (c.h * natH));
      bgW = boxW / c.w; bgH = boxH / c.h; bgX = -c.x * bgW; bgY = -c.y * bgH;
    } else { boxW = 200 * scale; bgW = boxW; bgH = boxH; bgX = 0; bgY = 0; }
    const f = (n) => n.toFixed(1);
    const common = `width:${f(boxW)}px;height:${f(boxH)}px;transform:translate(${D().logoOffsetX || 0}px,${D().logoOffsetY || 0}px);`;
    if (D().logoRecolor !== false) {
      return `<div class="logo-box" style="${common}background-color:var(--logo-color);-webkit-mask-image:url('${src}');mask-image:url('${src}');-webkit-mask-size:${f(bgW)}px ${f(bgH)}px;mask-size:${f(bgW)}px ${f(bgH)}px;-webkit-mask-position:${f(bgX)}px ${f(bgY)}px;mask-position:${f(bgX)}px ${f(bgY)}px;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;"></div>`;
    }
    return `<div class="logo-box" style="${common}background-image:url('${src}');background-size:${f(bgW)}px ${f(bgH)}px;background-position:${f(bgX)}px ${f(bgY)}px;background-repeat:no-repeat;"></div>`;
  }
  function masthead() {
    if (state.platform === 'xhs') {
      return `<div class="masthead mh-xhs">
          <div class="mh-left">${logoMarkup()}<div class="mh-bars"><span></span><span></span></div></div>
          <div class="mh-right" style="transform:translate(${D().sloganOffsetX || 0}px,${D().sloganOffsetY || 0}px)"><div class="mh-line"></div><div class="mh-slogan" style="font-size:${D().sloganSize || 24}px">LIGHT UP THE FUTURE!</div></div>
        </div>`;
    }
    return `<div class="masthead mh-xls">${logoMarkup()}${D().brandLabel ? `<div class="brand-label" style="font-size:${D().brandLabelSize || 24}px">${esc(D().brandLabel)}</div>` : ''}</div>`;
  }

  function buildCardHTML(page) {
    const isCover = page.type === 'cover';
    const footer = (!isCover && !page.noFooter && D().footerNote) ? `<div class="card-footer">${esc(D().footerNote)}</div>` : '';
    return `<div class="frame">${masthead()}<div class="content-box">${templateHTML(page)}</div>${footer}</div>`;
  }
  function buildCard(page) { const c = mk('div', 'page-card'); c.style.setProperty('--cover-font', coverFontStack()); c.innerHTML = buildCardHTML(page); return c; }

  // ---------------- 模板 HTML（<img/> 自闭合，导出走 XML 解析） ----------------
  function templateHTML(p) {
    switch (p.type) {
      case 'cover': {
        const mjSrc = D().memojiData || memojiDataUri;
        const showMj = state.platform === 'xhs' && p.showMemoji !== false && mjSrc;
        const mjStyle = `height:${(190 * (D().memojiScale || 1)).toFixed(1)}px;transform:translate(${D().memojiOffsetX || 0}px,${D().memojiOffsetY || 0}px);`;
        return `<div class="tpl-cover">
            <h1 class="cover-title">${esc(p.title)}</h1>
            ${showMj ? `<img class="cover-memoji" src="${mjSrc}" style="${mjStyle}" alt="" />` : ''}
          </div>`;
      }
      case 'bilingual':
        return `<div class="tpl-bilingual">
            <h2 class="sec-heading">${esc(p.heading)}</h2>
            ${p.en ? `<p class="bi-en">${esc(p.en)}</p>` : ''}
            ${p.cn ? `<p class="bi-cn">${esc(p.cn)}</p>` : ''}
            ${(p.steps && p.steps.filter(Boolean).length) ? `<h3 class="sec-heading action">${esc(p.actionTitle || '要怎么做?')}</h3>
              <ol class="bi-steps">${p.steps.filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
          </div>`;
      case 'table':
        return `<div class="tpl-table">
            ${p.title ? `<h2 class="sec-heading">${esc(p.title)}</h2>` : ''}
            <table class="tbl">
              ${(p.columns && p.columns.length) ? `<thead><tr>${p.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>` : ''}
              <tbody>${(p.rows || []).map((r) => `<tr>${(r || []).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>`;
      case 'list':
        return `<div class="tpl-list">
            <span class="kicker">${esc(p.heading || '项目一览')}</span>
            <div class="list-items">
              ${(p.items || []).map((it, i) => `
                <div class="list-item">
                  <div class="li-num">${i + 1}</div>
                  <div class="li-text"><div class="li-name">${esc(it.name)}</div>${it.note ? `<div class="li-note">${esc(it.note)}</div>` : ''}</div>
                </div>`).join('')}
            </div>
          </div>`;
      case 'policy':
        return `<div class="tpl-policy">
            <span class="kicker">政策更新</span>
            <h2 class="big-title">${esc(p.title)}</h2>
            <div class="policy-points">${(p.points || []).map((pt) => `<div class="pt">${esc(pt)}</div>`).join('')}</div>
          </div>`;
      case 'text':
        return `<div class="tpl-text"><h2 class="big-title">${esc(p.title)}</h2><div class="text-body">${esc(p.body)}</div></div>`;
      case 'canvas':
        return `<div class="tpl-canvas">${(p.elements || []).map((e) => canvasElHTML(e)).join('')}</div>`;
      default: return '';
    }
  }
  function canvasElHTML(e) {
    const pos = `left:${(e.x * 100).toFixed(3)}%;top:${(e.y * 100).toFixed(3)}%;width:${(e.w * 100).toFixed(3)}%;`;
    if (e.kind === 'image') return `<div class="cv-el cv-img" style="${pos}"><img src="${e.src}" alt="" /></div>`;
    const font = FONT_STACKS[e.font] || 'inherit';
    const color = e.color ? e.color : 'var(--ink)';
    const lh = e.lh || 1.3, ls = e.ls || 0;
    return `<div class="cv-el cv-text" style="${pos}font-size:${e.size}px;color:${color};font-weight:${e.weight || 700};text-align:${e.align || 'left'};font-family:${font};line-height:${lh};letter-spacing:${ls}px;">${esc(e.text)}</div>`;
  }

  // ---------------- 预览 ----------------
  function renderPreview() {
    const list = $('#preview-list');
    list.innerHTML = '';
    const scale = DISP_W / CARD_W;
    D().pages.forEach((page, i) => {
      const frame = mk('div', 'page-frame'); frame.dataset.pid = page.id;
      frame.style.width = DISP_W + 'px';
      frame.style.height = (CARD_H * scale) + 'px';
      const card = buildCard(page);
      card.style.transform = `scale(${scale})`;
      frame.appendChild(card);
      const num = mk('div', 'page-pagenum'); num.textContent = (i + 1) + '/' + D().pages.length; frame.appendChild(num);
      const dl = mk('button', 'btn btn-sm dl-this'); dl.textContent = '下载'; dl.addEventListener('click', (e) => { e.stopPropagation(); exportPage(i); }); frame.appendChild(dl);
      frame.addEventListener('click', () => selectPage(page.id, 'editor'));
      list.appendChild(frame);
    });
    $('#preview-empty').style.display = D().pages.length ? 'none' : 'block';
    applySelection();
  }
  let selectedPageId = null;
  function selectPage(id, scrollTarget) {
    selectedPageId = id; applySelection();
    if (scrollTarget === 'editor') { const el = document.querySelector('.pe-card[data-pid="' + id + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    else if (scrollTarget === 'preview') { const el = document.querySelector('.page-frame[data-pid="' + id + '"]'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  function applySelection() {
    document.querySelectorAll('.pe-card').forEach((c) => c.classList.toggle('is-selected', c.dataset.pid === selectedPageId));
    document.querySelectorAll('.page-frame').forEach((f) => f.classList.toggle('is-selected', f.dataset.pid === selectedPageId));
  }

  // ---------------- 编辑器 ----------------
  function label(t) { const l = mk('span', 'field-label'); l.textContent = t; return l; }
  function fieldText(labelText, value, on, placeholder) {
    const wrap = mk('div'); wrap.appendChild(label(labelText));
    const inp = mk('input', 'inp', { type: 'text' }); inp.value = value || ''; if (placeholder) inp.placeholder = placeholder;
    inp.addEventListener('input', () => on(inp.value)); wrap.appendChild(inp); return wrap;
  }
  function fieldArea(labelText, value, on, rows) {
    const wrap = mk('div'); wrap.appendChild(label(labelText));
    const ta = mk('textarea', 'ta'); ta.rows = rows || 3; ta.value = value || '';
    ta.addEventListener('input', () => on(ta.value)); wrap.appendChild(ta); return wrap;
  }
  function rangeRow(labelText, key, min, max, step) {
    const row = mk('div', 'lg-inline');
    const l = mk('span'); l.textContent = labelText; row.appendChild(l);
    const inp = mk('input', 'lg-mini', { type: 'range', min: String(min), max: String(max), step: String(step) });
    inp.value = D()[key];
    inp.addEventListener('input', () => { D()[key] = num(inp.value, key === 'memojiScale' ? 1 : 0); touch(); });
    row.appendChild(inp); return row;
  }
  function stringListEditor(arr, placeholder) {
    const box = mk('div');
    arr.forEach((val, idx) => {
      const row = mk('div', 'repeat-item');
      const inp = mk('input', 'inp', { type: 'text' }); inp.value = val || ''; inp.placeholder = placeholder;
      inp.addEventListener('input', () => { arr[idx] = inp.value; touch(); });
      const del = mk('button', 'icon-btn'); del.textContent = '✕'; del.title = '删除';
      del.addEventListener('click', () => { arr.splice(idx, 1); restructure(); });
      row.append(inp, del); box.appendChild(row);
    });
    const add = mk('button', 'btn btn-sm repeat-add'); add.textContent = '+ 加一条';
    add.addEventListener('click', () => { arr.push(''); restructure(); }); box.appendChild(add); return box;
  }
  function listItemsEditor(page) {
    const box = mk('div');
    page.items.forEach((it, idx) => {
      const row = mk('div', 'repeat-item');
      const name = mk('input', 'inp', { type: 'text' }); name.value = it.name || ''; name.placeholder = '项目名';
      name.addEventListener('input', () => { it.name = name.value; touch(); });
      const note = mk('input', 'inp', { type: 'text' }); note.value = it.note || ''; note.placeholder = '一句话说明';
      note.addEventListener('input', () => { it.note = note.value; touch(); });
      const del = mk('button', 'icon-btn'); del.textContent = '✕'; del.addEventListener('click', () => { page.items.splice(idx, 1); restructure(); });
      row.append(name, note, del); box.appendChild(row);
    });
    const add = mk('button', 'btn btn-sm repeat-add'); add.textContent = '+ 加一条';
    add.addEventListener('click', () => { page.items.push({ name: '', note: '' }); restructure(); }); box.appendChild(add); return box;
  }
  function tableEditor(page) {
    const box = mk('div');
    box.appendChild(label('列标题'));
    const cols = mk('div');
    page.columns.forEach((c, ci) => {
      const row = mk('div', 'repeat-item');
      const inp = mk('input', 'inp', { type: 'text' }); inp.value = c || ''; inp.placeholder = '列名';
      inp.addEventListener('input', () => { page.columns[ci] = inp.value; touch(); });
      const del = mk('button', 'icon-btn'); del.textContent = '✕'; del.title = '删除此列';
      del.addEventListener('click', () => { page.columns.splice(ci, 1); page.rows.forEach((r) => r.splice(ci, 1)); restructure(); });
      row.append(inp, del); cols.appendChild(row);
    });
    const addCol = mk('button', 'btn btn-sm repeat-add'); addCol.textContent = '+ 加一列';
    addCol.addEventListener('click', () => { page.columns.push(''); page.rows.forEach((r) => r.push('')); restructure(); });
    cols.appendChild(addCol); box.appendChild(cols);

    box.appendChild(label('表格行'));
    const rows = mk('div');
    page.rows.forEach((r, ri) => {
      const rowEl = mk('div', 'row-cells');
      page.columns.forEach((_, ci) => {
        const inp = mk('input', 'inp', { type: 'text' }); inp.value = r[ci] || ''; inp.placeholder = page.columns[ci] || ('列' + (ci + 1));
        inp.addEventListener('input', () => { r[ci] = inp.value; touch(); });
        rowEl.appendChild(inp);
      });
      const del = mk('button', 'icon-btn'); del.textContent = '✕'; del.title = '删除此行';
      del.addEventListener('click', () => { page.rows.splice(ri, 1); restructure(); });
      rowEl.appendChild(del); rows.appendChild(rowEl);
    });
    const addRow = mk('button', 'btn btn-sm repeat-add'); addRow.textContent = '+ 加一行';
    addRow.addEventListener('click', () => { page.rows.push(page.columns.map(() => '')); restructure(); });
    rows.appendChild(addRow); box.appendChild(rows);
    return box;
  }

  function editorBody(page) {
    const b = mk('div', 'pe-body');
    switch (page.type) {
      case 'cover': {
        b.appendChild(fieldArea('大标题（换行用回车，每行别太长）', page.title, (v) => { page.title = v; touch(); }, 3));
        const cr = mk('label', 'check-row');
        const cb = mk('input', '', { type: 'checkbox' }); cb.checked = page.showMemoji !== false;
        cb.addEventListener('change', () => { page.showMemoji = cb.checked; restructure(); });
        const sp = mk('span'); sp.textContent = '显示 3D 人物（仅小红书封面）';
        cr.append(cb, sp); b.appendChild(cr);
        if (page.showMemoji !== false) {
          const has = D().memojiData || memojiDataUri;
          const up = mk('label', 'btn btn-sm'); up.textContent = has ? '更换人物图片' : '上传人物图片';
          const fi = mk('input', '', { type: 'file', accept: 'image/*' }); fi.style.display = 'none';
          fi.addEventListener('change', async () => { const f = fi.files && fi.files[0]; fi.value = ''; if (!f) return; if (!/^image\//.test(f.type)) { alert('请选择图片文件'); return; } D().memojiData = await readDataUrl(f); if (!save()) flash('图太大，本地存不下；本次有效，刷新会丢'); restructure(); flash('人物已更新'); });
          up.appendChild(fi);
          const clr = mk('button', 'btn btn-sm btn-ghost'); clr.textContent = '清除人物'; clr.addEventListener('click', () => { D().memojiData = null; restructure(); flash('已清除人物'); });
          const row = mk('div', 'btn-row'); row.append(up, clr); b.appendChild(row);
          if (has) {
            b.appendChild(label('人物大小 / 位置（拖滑块移动；或点下方“转为自由画布”直接拖）'));
            b.appendChild(rangeRow('缩放', 'memojiScale', 0.4, 2.5, 0.05));
            b.appendChild(rangeRow('水平', 'memojiOffsetX', -220, 220, 2));
            b.appendChild(rangeRow('垂直', 'memojiOffsetY', -260, 160, 2));
            const rs = mk('button', 'btn btn-sm'); rs.textContent = '复原人物'; rs.addEventListener('click', () => { D().memojiScale = 1; D().memojiOffsetX = 0; D().memojiOffsetY = 0; restructure(); flash('已复原人物'); });
            b.appendChild(rs);
          }
        }
        break;
      }
      case 'bilingual':
        b.appendChild(fieldText('小标题（红/藏蓝）', page.heading, (v) => { page.heading = v; touch(); }));
        b.appendChild(fieldArea('英文加粗段（可空）', page.en, (v) => { page.en = v; touch(); }, 4));
        b.appendChild(fieldArea('中文翻译 / 正文', page.cn, (v) => { page.cn = v; touch(); }, 4));
        b.appendChild(fieldText('行动小标题', page.actionTitle, (v) => { page.actionTitle = v; touch(); }, '要怎么做?'));
        b.appendChild(label('步骤'));
        b.appendChild(stringListEditor(page.steps, '一条步骤'));
        break;
      case 'table':
        b.appendChild(fieldText('表格标题（可空）', page.title, (v) => { page.title = v; touch(); }));
        b.appendChild(tableEditor(page));
        break;
      case 'list':
        b.appendChild(fieldText('小标题', page.heading, (v) => { page.heading = v; touch(); }));
        b.appendChild(label('条目')); b.appendChild(listItemsEditor(page));
        break;
      case 'policy':
        b.appendChild(fieldText('政策标题', page.title, (v) => { page.title = v; touch(); }));
        b.appendChild(label('要点')); b.appendChild(stringListEditor(page.points, '一条要点'));
        break;
      case 'text':
        b.appendChild(fieldText('标题', page.title, (v) => { page.title = v; touch(); }));
        b.appendChild(fieldArea('正文', page.body, (v) => { page.body = v; touch(); }, 5));
        break;
      case 'canvas': {
        b.appendChild(label('自由画布（' + (page.elements ? page.elements.length : 0) + ' 个元素）'));
        const btn = mk('button', 'btn'); btn.textContent = '打开画布编辑器';
        btn.addEventListener('click', () => openCanvasEditor(page));
        b.appendChild(btn);
        break;
      }
    }
    if (['cover', 'text', 'policy', 'list', 'bilingual'].includes(page.type)) {
      const conv = mk('button', 'btn btn-sm'); conv.style.marginTop = '10px';
      conv.textContent = '转为自由画布（可拖动·改字号/颜色/位置）';
      conv.addEventListener('click', () => {
        if (confirm('转成自由画布后，本页内容会变成可自由拖动的文字块，原模板结构不再保留。继续？')) {
          convertPageToCanvas(page); restructure(); openCanvasEditor(page);
        }
      });
      b.appendChild(conv);
    }
    return b;
  }
  function convertPageToCanvas(page) {
    const cs = getComputedStyle(document.documentElement);
    const C = (n, d) => { const v = cs.getPropertyValue(n).trim(); return v || d; };
    const heading = C('--heading', '#191970'), ink = C('--ink', '#191970'), title = C('--title-color', heading);
    const els = []; const X = 0.06, W = 0.88, CW = 470, CH = 600; let y = 0.06;
    const push = (text, size, color, weight, align) => {
      const cpl = Math.max(1, Math.floor((W * CW) / size));
      const lines = String(text).split('\n').reduce((a, l) => a + Math.max(1, Math.ceil((l.length || 1) / cpl)), 0);
      els.push({ id: uid(), kind: 'text', x: X, y, w: W, text: String(text), size, color: color || '', weight, align: align || 'left', font: D().coverFont || 'hei' });
      y += (lines * size * 1.32) / CH + 0.025;
    };
    switch (page.type) {
      case 'cover':
        push(page.title, 80, title, 900, 'left');
        if (page.showMemoji !== false && (D().memojiData || memojiDataUri)) els.push({ id: uid(), kind: 'image', x: 0.34, y: Math.min(0.6, y + 0.05), w: 0.32, src: D().memojiData || memojiDataUri });
        break;
      case 'text': push(page.title, 46, heading, 900); push(page.body, 24, ink, 400); break;
      case 'policy': push(page.title, 42, heading, 900); (page.points || []).forEach((pt) => push('· ' + pt, 24, ink, 500)); break;
      case 'list': push(page.heading, 34, heading, 800); (page.items || []).forEach((it, i) => push((i + 1) + '. ' + it.name + (it.note ? '  ' + it.note : ''), 24, ink, 500)); break;
      case 'bilingual':
        push(page.heading, 30, heading, 800);
        if (page.en) push(page.en, 21, ink, 800);
        if (page.cn) push(page.cn, 21, ink, 400);
        if (page.steps && page.steps.filter(Boolean).length) { push(page.actionTitle || '要怎么做?', 28, heading, 800); page.steps.filter(Boolean).forEach((s, i) => push((i + 1) + '. ' + s, 21, ink, 500)); }
        break;
      default: return false;
    }
    const noFooter = page.type === 'cover';
    Object.keys(page).forEach((k) => { if (k !== 'id') delete page[k]; });
    page.type = 'canvas'; page.elements = els; if (noFooter) page.noFooter = true;
    return true;
  }
  function move(i, dir) { const j = i + dir; if (j < 0 || j >= D().pages.length) return; const t = D().pages[i]; D().pages[i] = D().pages[j]; D().pages[j] = t; restructure(); }
  function renderEditors() {
    const root = $('#page-editors'); root.innerHTML = '';
    D().pages.forEach((page, i) => {
      const card = mk('div', 'pe-card'); card.dataset.pid = page.id;
      const head = mk('div', 'pe-head');
      const type = mk('span', 'pe-type'); type.innerHTML = `<span class="dot"></span>${TYPE_LABEL[page.preset || page.type] || page.type}`;
      const idx = mk('span', 'pe-idx'); idx.textContent = '第 ' + (i + 1) + ' 页';
      const sp = mk('span', 'spacer');
      const up = mk('button', 'icon-btn'); up.textContent = '↑'; up.title = '上移'; up.disabled = i === 0; up.addEventListener('click', (e) => { e.stopPropagation(); move(i, -1); });
      const dn = mk('button', 'icon-btn'); dn.textContent = '↓'; dn.title = '下移'; dn.disabled = i === D().pages.length - 1; dn.addEventListener('click', (e) => { e.stopPropagation(); move(i, 1); });
      const del = mk('button', 'icon-btn btn-danger'); del.textContent = '删除';
      del.addEventListener('click', (e) => { e.stopPropagation(); if (confirm('删除第 ' + (i + 1) + ' 页？')) { D().pages.splice(i, 1); restructure(); } });
      head.append(type, idx, sp, up, dn, del);
      head.addEventListener('click', () => selectPage(page.id, 'preview'));
      card.appendChild(head); card.appendChild(editorBody(page)); root.appendChild(card);
    });
    applySelection();
  }

  // ---------------- AI（深链接 + 复制提示词） ----------------
  function buildPrompt(raw) {
    return [
      '你是中文留学图文排版助手。请把下面的学校信息整理成多页图文卡片的结构化数据。',
      '严格要求：只输出一个 JSON 对象，不要任何解释文字，不要 markdown 代码块围栏。',
      'JSON 结构（pages 是有序数组，按需选用页面类型，可重复）：',
      '{',
      '  "pages": [',
      '    {"type":"cover","title":"封面大标题(可用\\n换行,每行尽量≤5字)"},',
      '    {"type":"bilingual","heading":"红色小标题","en":"英文加粗段(可空)","cn":"中文翻译/说明","actionTitle":"要怎么做?","steps":["步骤一","步骤二"]},',
      '    {"type":"table","title":"表格标题","columns":["列1","列2","列3"],"rows":[["a","b","c"],["d","e","f"]]},',
      '    {"type":"list","heading":"小标题","items":[{"name":"项目名","note":"一句话说明"}]},',
      '    {"type":"policy","title":"政策标题","points":["要点一","要点二"]},',
      '    {"type":"text","title":"标题","body":"正文"}',
      '  ]',
      '}',
      '整理规则：第一页一般是 cover；多个项目用 list 概览，再每个项目各一页 detail/text；',
      '签证/拒签类用 bilingual；录取数据/排名等用 table；',
      '内容必须基于下面原文，不要编造，不要遗漏关键信息（时间、地点、报名方式、要求、学费）。',
      '原文：', '"""', raw, '"""',
    ].join('\n');
  }
  function copyText(t) { try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true).catch(() => false); } catch {} return Promise.resolve(false); }
  function onOpenClaude() {
    const raw = $('#ai-raw').value.trim(); if (!raw) { alert('先把官网原文粘到上面的框里'); return; }
    window.open('claude://claude.ai/new?q=' + encodeURIComponent(buildPrompt(raw)), '_blank', 'noopener');
  }
  function onCopyPrompt() {
    const raw = $('#ai-raw').value.trim(); if (!raw) { alert('先把官网原文粘到上面的框里'); return; }
    const p = buildPrompt(raw);
    copyText(p).then((ok) => { if (ok) flash('已复制提示词，去 Claude 里粘贴'); else window.prompt('复制下面这段，去 Claude 里粘贴：', p); });
  }
  function parseDeckJSON(text) {
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) t = t.slice(a, b + 1);
    const obj = JSON.parse(t);
    const pages = Array.isArray(obj) ? obj : obj.pages;
    if (!Array.isArray(pages)) throw new Error('没有找到 pages 数组');
    return pages.map(normalizePage).filter(Boolean);
  }
  function normalizePage(p) {
    if (!p || !TYPE_LABEL[p.type]) return null;
    if (p.type === 'table') {
      const cols = toStrArr(p.columns, ['专业', '中国学生录取', '全部录取', '申请要求']);
      const rows = Array.isArray(p.rows) ? p.rows.map((r) => { const a2 = toStrArr(r, []); while (a2.length < cols.length) a2.push(''); return a2.slice(0, cols.length); }) : [];
      return { id: uid(), type: 'table', title: str(p.title, ''), columns: cols, rows };
    }
    if (p.type === 'canvas') return { id: uid(), type: 'canvas', preset: 'canvas', elements: Array.isArray(p.elements) ? p.elements.map(normEl).filter(Boolean) : [] };
    const c = {};
    if (p.type === 'cover') { c.title = str(p.title, ''); c.showMemoji = (typeof p.showMemoji === 'boolean') ? p.showMemoji : true; }
    else if (p.type === 'bilingual') { c.heading = str(p.heading, ''); c.en = str(p.en, ''); c.cn = str(p.cn, ''); c.actionTitle = str(p.actionTitle, '要怎么做?'); c.steps = toStrArr(p.steps, []); }
    else if (p.type === 'list') { c.heading = str(p.heading, ''); c.items = Array.isArray(p.items) ? p.items.map((it) => ({ name: str(it && it.name, ''), note: str(it && it.note, '') })) : []; }
    else if (p.type === 'policy') { c.title = str(p.title, ''); c.points = toStrArr(p.points, []); }
    else if (p.type === 'text') { c.title = str(p.title, ''); c.body = str(p.body, ''); }
    return { id: uid(), type: 'canvas', preset: p.type, noFooter: p.type === 'cover', elements: elementsFromContent(p.type, c, deckOpts()) };
  }
  function normEl(e) {
    if (!e) return null;
    if (e.kind === 'image') { if (!e.src) return null; return { id: uid(), kind: 'image', x: num(e.x, 0.1), y: num(e.y, 0.1), w: num(e.w, 0.5), src: String(e.src) }; }
    return { id: uid(), kind: 'text', x: num(e.x, 0.1), y: num(e.y, 0.1), w: num(e.w, 0.8), text: str(e.text, ''), size: num(e.size, 36), color: str(e.color, ''), weight: num(e.weight, 700), align: ALIGNS.includes(e.align) ? e.align : 'left', font: FONT_STACKS[e.font] ? e.font : 'hei', lh: num(e.lh, 1.3), ls: num(e.ls, 0) };
  }
  function onFill() {
    const text = $('#ai-result').value; if (!text.trim()) { alert('先把 Claude 返回的 JSON 粘到下面的框里'); return; }
    let pages;
    try { pages = parseDeckJSON(text); } catch (e) { alert('解析失败：' + e.message + '\n\n请确认粘贴的是完整 JSON（以 { 开头、} 结尾）。'); return; }
    if (!pages.length) { alert('没解析到任何有效页面。'); return; }
    D().pages = pages; restructure(); flash('已填入 ' + pages.length + ' 页');
  }

  // ---------------- 导出（自包含：SVG foreignObject → canvas → PNG） ----------------
  async function getCSS() {
    if (cssCache != null) return cssCache;
    const parts = await Promise.all(['themes.css', 'styles.css'].map((f) => fetch(f, { cache: 'no-store' }).then((r) => r.text()).catch(() => '')));
    cssCache = parts.join('\n');
    return cssCache;
  }
  function exportFontFace() {
    if (!displayFontB64) return '';
    return `@font-face{font-family:"EduDisplay";src:url(data:${displayFontMime};base64,${displayFontB64});font-weight:100 900;font-display:block;}`;
  }
  async function pageToPng(page) {
    const css = exportFontFace() + '\n' + (await getCSS());
    const inner = `<div class="page-card" data-platform="${state.platform}" style="width:${CARD_W}px;height:${CARD_H}px;transform:none;--cover-font:${coverFontStack()};">${buildCardHTML(page)}</div>`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">` +
      `<foreignObject x="0" y="0" width="${CARD_W}" height="${CARD_H}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" class="export-root" data-platform="${state.platform}" style="width:${CARD_W}px;height:${CARD_H}px;">` +
      `<style><![CDATA[${css}]]></style>${inner}</div></foreignObject></svg>`;
    const img = new Image();
    await new Promise((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('图片渲染失败')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const canvas = mk('canvas'); canvas.width = CARD_W * EXPORT_SCALE; canvas.height = CARD_H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d'); ctx.scale(EXPORT_SCALE, EXPORT_SCALE); ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }
  function downloadDataUrl(dataUrl, filename) { const a = mk('a'); a.href = dataUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); }
  async function exportPage(i) { try { downloadDataUrl(await pageToPng(D().pages[i]), `${state.platform}-${String(i + 1).padStart(2, '0')}.png`); } catch (e) { alert('导出失败：' + e.message); } }
  async function exportAll() {
    if (!D().pages.length) { alert('还没有页面'); return; }
    const btn = $('#btn-download-all'); btn.disabled = true; const old = btn.textContent; btn.textContent = '导出中…';
    try {
      for (let i = 0; i < D().pages.length; i++) { downloadDataUrl(await pageToPng(D().pages[i]), `${state.platform}-${String(i + 1).padStart(2, '0')}.png`); await sleep(300); }
      flash('已逐张下载 ' + D().pages.length + ' 张');
    } catch (e) { alert('导出失败：' + e.message); } finally { btn.disabled = false; btn.textContent = old; }
  }

  // ---------------- 自由画布编辑器 ----------------
  let cv = null; // { page, box, sel }
  function openCanvasEditor(page) {
    const wrap = $('#cv-stage-wrap');
    wrap.innerHTML = '';
    const maxW = Math.min(540, window.innerWidth * 0.62);
    const maxH = window.innerHeight * 0.66;
    const scale = Math.min(maxW / CARD_W, maxH / CARD_H, 1);
    const card = buildCard(page);
    card.classList.add('cv-stage', 'cv-edit');
    card.style.transform = `scale(${scale})`;
    wrap.style.width = (CARD_W * scale) + 'px';
    wrap.style.height = (CARD_H * scale) + 'px';
    wrap.appendChild(card);
    cv = { page, card, box: card.querySelector('.tpl-canvas'), sel: null };
    cv.refs = ['cv-ref-v', 'cv-ref-h', 'cv-ref-t1', 'cv-ref-t2'].map((c) => mk('div', 'cv-ref ' + c));
    cv.gv = mk('div', 'cv-guide cv-guide-v'); cv.gh = mk('div', 'cv-guide cv-guide-h');
    const cbox = card.querySelector('.content-box');
    cbox.addEventListener('pointerdown', (e) => { if (e.target.classList.contains('content-box') || e.target.classList.contains('tpl-canvas')) selectEl(null); });
    rebuildCanvasEls();
    $('#cv-modal').hidden = false;
    updateCvToolbar();
  }
  function closeCanvasEditor() { $('#cv-modal').hidden = true; cv = null; save(); renderEditors(); renderPreview(); }

  function rebuildCanvasEls() {
    const box = cv.box; box.innerHTML = '';
    cv.page.elements.forEach((e) => box.appendChild(buildEditableEl(e)));
    if (cv.refs) { cv.refs.forEach((r) => box.appendChild(r)); box.appendChild(cv.gv); box.appendChild(cv.gh); }
    [...box.children].forEach((n) => { if (n._el) n.classList.toggle('selected', n._el === cv.sel); });
  }
  function buildEditableEl(e) {
    const node = mk('div', 'cv-el ' + (e.kind === 'image' ? 'cv-img' : 'cv-text'));
    node._el = e;
    node.style.left = (e.x * 100) + '%'; node.style.top = (e.y * 100) + '%'; node.style.width = (e.w * 100) + '%';
    if (e.kind === 'image') {
      const img = mk('img'); img.src = e.src; img.draggable = false; node.appendChild(img);
    } else {
      node.style.fontSize = e.size + 'px'; node.style.color = e.color || 'var(--ink)';
      node.style.fontWeight = e.weight || 700; node.style.textAlign = e.align || 'left';
      node.style.fontFamily = FONT_STACKS[e.font] || 'inherit';
      node.style.lineHeight = e.lh || 1.3; node.style.letterSpacing = (e.ls || 0) + 'px';
      const span = mk('span', 'cv-textspan'); span.textContent = e.text; node.appendChild(span);
      node.addEventListener('dblclick', () => startEditText(node, e));
    }
    const handle = mk('div', 'cv-handle'); node.appendChild(handle);
    node.addEventListener('pointerdown', (ev) => { if (ev.target === handle || node.classList.contains('editing')) return; startDrag(ev, e, node); });
    node.addEventListener('click', (ev) => { ev.stopPropagation(); selectEl(e); });
    handle.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); startResize(ev, e, node); });
    return node;
  }
  function selNode() { return [...cv.box.children].find((n) => n._el === cv.sel); }
  function selectEl(e) { cv.sel = e; [...cv.box.children].forEach((n) => n.classList.toggle('selected', n._el === e)); updateCvToolbar(); }
  function boxRect() { return cv.box.getBoundingClientRect(); }
  function startDrag(ev, e, node) {
    ev.preventDefault(); selectEl(e);
    const r = boxRect(), sx = ev.clientX, sy = ev.clientY, ox = e.x, oy = e.y, SNAP = 0.014;
    const elH = node.offsetHeight / r.height;
    // 对齐目标：画布中心/边缘/三分线 + 其它元素的 左/中/右、上/中/下
    const others = cv.page.elements.filter((o) => o !== e).map((o) => { const n = [...cv.box.children].find((c) => c._el === o); const h = n ? n.offsetHeight / r.height : 0.12; return { x: o.x, w: o.w, y: o.y, h }; });
    const Xt = [0, 1 / 3, 0.5, 2 / 3, 1]; others.forEach((o) => Xt.push(o.x, o.x + o.w / 2, o.x + o.w));
    const Yt = [0, 0.5, 1]; others.forEach((o) => Yt.push(o.y, o.y + o.h / 2, o.y + o.h));
    const mv = (e2) => {
      let nx = clamp(ox + (e2.clientX - sx) / r.width, 0, 1);
      let ny = clamp(oy + (e2.clientY - sy) / r.height, 0, 1);
      let lineX = null, bestX = SNAP, shiftX = 0;
      [nx, nx + e.w / 2, nx + e.w].forEach((a) => Xt.forEach((t) => { const d = Math.abs(a - t); if (d < bestX) { bestX = d; shiftX = t - a; lineX = t; } }));
      nx += shiftX;
      let lineY = null, bestY = SNAP, shiftY = 0;
      [ny, ny + elH / 2, ny + elH].forEach((a) => Yt.forEach((t) => { const d = Math.abs(a - t); if (d < bestY) { bestY = d; shiftY = t - a; lineY = t; } }));
      ny += shiftY;
      e.x = nx; e.y = ny;
      node.style.left = (nx * 100) + '%'; node.style.top = (ny * 100) + '%';
      if (cv.gv) { if (lineX != null) { cv.gv.style.left = (lineX * 100) + '%'; cv.gv.style.display = 'block'; } else cv.gv.style.display = 'none'; }
      if (cv.gh) { if (lineY != null) { cv.gh.style.top = (lineY * 100) + '%'; cv.gh.style.display = 'block'; } else cv.gh.style.display = 'none'; }
    };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); if (cv.gv) cv.gv.style.display = 'none'; if (cv.gh) cv.gh.style.display = 'none'; save(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }
  function startResize(ev, e, node) {
    ev.preventDefault();
    const r = boxRect(), sx = ev.clientX, ow = e.w;
    const mv = (e2) => { e.w = clamp(ow + (e2.clientX - sx) / r.width, 0.05, 1); node.style.width = (e.w * 100) + '%'; };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); save(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }
  function startEditText(node, e) {
    const span = node.querySelector('.cv-textspan');
    node.classList.add('editing'); span.contentEditable = 'true'; span.focus();
    const fin = () => { span.contentEditable = 'false'; node.classList.remove('editing'); e.text = span.innerText; span.removeEventListener('blur', fin); save(); };
    span.addEventListener('blur', fin);
  }
  function updateCvToolbar() {
    const tools = document.querySelector('.cv-sel-tools');
    if (!cv || !cv.sel) { tools.hidden = true; return; }
    tools.hidden = false;
    const isText = cv.sel.kind === 'text';
    ['#cv-size', '#cv-font', '#cv-lh', '#cv-ls', '#cv-color', '#cv-bold', '#cv-align'].forEach((s) => { $(s).style.display = isText ? '' : 'none'; });
    document.querySelectorAll('.cv-tool-lbl').forEach((l) => { l.style.display = isText ? '' : 'none'; });
    if (isText) { $('#cv-size').value = cv.sel.size; $('#cv-color').value = cv.sel.color || '#191970'; $('#cv-font').value = FONT_STACKS[cv.sel.font] ? cv.sel.font : 'hei'; $('#cv-lh').value = cv.sel.lh || 1.3; $('#cv-ls').value = cv.sel.ls || 0; }
  }
  function wireCanvas() {
    $('#cv-add-text').addEventListener('click', () => {
      const e = { id: uid(), kind: 'text', x: 0.1, y: 0.12, w: 0.8, text: '新文字', size: 40, color: '', weight: 800, align: 'left', font: D().coverFont || 'hei', lh: 1.3, ls: 0 };
      cv.page.elements.push(e); rebuildCanvasEls(); selectEl(e); save();
    });
    bindUpload('#cv-add-img', (data) => {
      const e = { id: uid(), kind: 'image', x: 0.2, y: 0.3, w: 0.5, src: data };
      cv.page.elements.push(e); rebuildCanvasEls(); selectEl(e); save();
    });
    $('#cv-size').addEventListener('input', () => { if (!cv.sel) return; cv.sel.size = num($('#cv-size').value, cv.sel.size); const n = selNode(); if (n) n.style.fontSize = cv.sel.size + 'px'; save(); });
    $('#cv-color').addEventListener('input', () => { if (!cv.sel) return; cv.sel.color = $('#cv-color').value; const n = selNode(); if (n) n.style.color = cv.sel.color; save(); });
    $('#cv-bold').addEventListener('click', () => { if (!cv.sel) return; cv.sel.weight = (cv.sel.weight >= 700) ? 400 : 800; const n = selNode(); if (n) n.style.fontWeight = cv.sel.weight; save(); });
    $('#cv-align').addEventListener('click', () => { if (!cv.sel) return; cv.sel.align = ALIGNS[(ALIGNS.indexOf(cv.sel.align) + 1) % 3]; const n = selNode(); if (n) n.style.textAlign = cv.sel.align; save(); });
    $('#cv-font').addEventListener('change', () => { if (!cv.sel) return; cv.sel.font = $('#cv-font').value; const n = selNode(); if (n) n.style.fontFamily = FONT_STACKS[cv.sel.font] || 'inherit'; save(); });
    $('#cv-lh').addEventListener('input', () => { if (!cv.sel) return; cv.sel.lh = num($('#cv-lh').value, 1.3); const n = selNode(); if (n) n.style.lineHeight = cv.sel.lh; save(); });
    $('#cv-ls').addEventListener('input', () => { if (!cv.sel) return; cv.sel.ls = num($('#cv-ls').value, 0); const n = selNode(); if (n) n.style.letterSpacing = cv.sel.ls + 'px'; save(); });
    $('#cv-front').addEventListener('click', () => { reorderSel(1); });
    $('#cv-back').addEventListener('click', () => { reorderSel(-1); });
    $('#cv-del').addEventListener('click', () => { if (!cv.sel) return; const i = cv.page.elements.indexOf(cv.sel); if (i >= 0) cv.page.elements.splice(i, 1); cv.sel = null; rebuildCanvasEls(); updateCvToolbar(); save(); });
    $('#cv-done').addEventListener('click', closeCanvasEditor);
    document.addEventListener('keydown', (e) => {
      if (!cv || $('#cv-modal').hidden || !cv.sel) return;
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))) return;
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const dir = map[e.key]; if (!dir) return;
      e.preventDefault();
      const step = e.shiftKey ? 0.02 : 0.004;
      cv.sel.x = clamp(cv.sel.x + dir[0] * step, 0, 1);
      cv.sel.y = clamp(cv.sel.y + dir[1] * step, 0, 1);
      const n = selNode(); if (n) { n.style.left = (cv.sel.x * 100) + '%'; n.style.top = (cv.sel.y * 100) + '%'; }
      save();
    });
  }
  function reorderSel(dir) {
    if (!cv.sel) return;
    const arr = cv.page.elements, i = arr.indexOf(cv.sel), j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    arr.splice(i, 1); arr.splice(j, 0, cv.sel); rebuildCanvasEls(); save();
  }

  // ---------------- 平台切换 / 设置 / 提示 ----------------
  function setPlatform(p) {
    state.platform = p;
    document.documentElement.dataset.platform = p;
    document.querySelectorAll('.plat-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.platform === p));
    refreshSettingsUI();
    save(); renderEditors(); renderPreview();
  }
  function refreshSettingsUI() {
    const d = D();
    $('#set-label').value = d.brandLabel;
    $('#set-label-size').value = d.brandLabelSize;
    $('#set-footer').value = d.footerNote;
    $('#set-font').value = d.coverFont;
    $('#logo-recolor').checked = d.logoRecolor !== false;
    $('#set-slogan-size').value = d.sloganSize;
    $('#set-slogan-x').value = d.sloganOffsetX;
    $('#set-slogan-y').value = d.sloganOffsetY;
    const other = state.platform === 'xhs' ? '小绿书' : '小红书';
    const cp = $('#btn-copy-other'); if (cp) cp.textContent = '复制内容到' + other;
  }
  function copyToOther() {
    const otherKey = state.platform === 'xhs' ? 'xls' : 'xhs';
    const otherName = otherKey === 'xhs' ? '小红书' : '小绿书';
    if (!confirm('把当前平台的页面内容 + 已上传的 logo/人物图片复制到「' + otherName + '」？会覆盖' + otherName + '现有页面（其字号/位置等设计仍各自独立，复制后可单独调整）。')) return;
    const from = D(), to = state.decks[otherKey];
    to.pages = clone(from.pages);
    to.logoData = from.logoData; to.logoNatW = from.logoNatW; to.logoNatH = from.logoNatH;
    to.memojiData = from.memojiData;
    save(); flash('已复制内容到' + otherName);
  }
  function flash(msg) {
    let t = document.getElementById('toast'); if (!t) { t = mk('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(flash._t); flash._t = setTimeout(() => t.classList.remove('show'), 1700);
  }

  // ---------------- 资产预加载 ----------------
  function blobToDataUrl(blob) { return new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); }
  async function loadImageAsset(candidates) {
    for (const url of candidates) {
      try {
        const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) continue;
        if (/\.svg($|\?)/i.test(url)) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await r.text());
        return await blobToDataUrl(await r.blob());
      } catch {}
    }
    return null;
  }
  async function loadFontAsset() {
    const list = [['assets/fonts/display.woff2', 'font/woff2'], ['assets/fonts/display.ttf', 'font/ttf']];
    for (const [url, mime] of list) {
      try {
        const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) continue;
        const buf = new Uint8Array(await r.arrayBuffer()); let bin = '';
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        displayFontB64 = btoa(bin); displayFontMime = mime; return;
      } catch {}
    }
  }
  async function loadAssets() {
    for (const k of ['xhs', 'xls']) { const dk = state.decks[k]; if (dk.logoData && (!dk.logoNatW || !dk.logoNatH)) { const n = await imgNat(dk.logoData); dk.logoNatW = n.w; dk.logoNatH = n.h; save(); } }
    logoDataUri = await loadImageAsset(['assets/logo-mark.svg', 'assets/logo-mark.png']);
    if (logoDataUri) logoAssetNat = await imgNat(logoDataUri);
    memojiDataUri = await loadImageAsset(['assets/memoji.png', 'assets/memoji.svg']);
    await loadFontAsset();
    renderPreview();
  }

  // ---------------- logo 调整器（裁剪/缩放/移动，全局统一） ----------------
  function openLogoEditor() {
    const src = D().logoData || logoDataUri;
    if (!src) { alert('请先点上方“上传 logo”选择一张图片'); return; }
    const img = $('#lg-crop-img');
    $('#lg-scale').value = D().logoScale || 1;
    $('#lg-x').value = D().logoOffsetX || 0;
    $('#lg-y').value = D().logoOffsetY || 0;
    const onready = () => {
      if (img.naturalWidth) { D().logoNatW = img.naturalWidth; D().logoNatH = img.naturalHeight; save(); }
      layoutCropRect(); updateLogoPrev(); renderPreview();
    };
    img.onload = onready; img.src = src;
    if (img.complete && img.naturalWidth) onready();
    $('#logo-modal').hidden = false;
  }
  function layoutCropRect() {
    const c = D().logoCrop || DEF_CROP, r = $('#lg-crop-rect');
    r.style.left = (c.x * 100) + '%'; r.style.top = (c.y * 100) + '%'; r.style.width = (c.w * 100) + '%'; r.style.height = (c.h * 100) + '%';
  }
  function updateLogoPrev() { document.querySelectorAll('.lg-prev-logo').forEach((el) => { el.innerHTML = logoMarkup(); }); }
  function lgImgRect() { return $('#lg-crop-img').getBoundingClientRect(); }
  function startCropDrag(ev) {
    if (ev.target.classList.contains('lg-crop-handle')) return;
    ev.preventDefault();
    const c = D().logoCrop, r = lgImgRect(), sx = ev.clientX, sy = ev.clientY, ox = c.x, oy = c.y;
    const mv = (e2) => { c.x = clamp(ox + (e2.clientX - sx) / r.width, 0, 1 - c.w); c.y = clamp(oy + (e2.clientY - sy) / r.height, 0, 1 - c.h); layoutCropRect(); updateLogoPrev(); };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); save(); renderPreview(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }
  function startCropResize(ev) {
    ev.preventDefault(); ev.stopPropagation();
    const c = D().logoCrop, r = lgImgRect(), sx = ev.clientX, sy = ev.clientY, ow = c.w, oh = c.h;
    const mv = (e2) => { c.w = clamp(ow + (e2.clientX - sx) / r.width, 0.05, 1 - c.x); c.h = clamp(oh + (e2.clientY - sy) / r.height, 0.05, 1 - c.y); layoutCropRect(); updateLogoPrev(); };
    const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); save(); renderPreview(); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
  }
  function wireLogoEditor() {
    $('#logo-adjust').addEventListener('click', openLogoEditor);
    $('#lg-crop-rect').addEventListener('pointerdown', startCropDrag);
    $('#lg-crop-rect').querySelector('.lg-crop-handle').addEventListener('pointerdown', startCropResize);
    const sync = (id, key) => $(id).addEventListener('input', () => { D()[key] = num($(id).value, key === 'logoScale' ? 1 : 0); updateLogoPrev(); renderPreview(); save(); });
    sync('#lg-scale', 'logoScale'); sync('#lg-x', 'logoOffsetX'); sync('#lg-y', 'logoOffsetY');
    $('#lg-reset').addEventListener('click', () => { resetLogoAdjust(); $('#lg-scale').value = 1; $('#lg-x').value = 0; $('#lg-y').value = 0; layoutCropRect(); updateLogoPrev(); renderPreview(); save(); flash('已复原 logo 调整'); });
    $('#lg-done').addEventListener('click', () => { $('#logo-modal').hidden = true; renderPreview(); });
  }

  // ---------------- 绑定 / 初始化 ----------------
  function wire() {
    document.querySelectorAll('.plat-btn').forEach((b) => b.addEventListener('click', () => setPlatform(b.dataset.platform)));
    document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { D().pages.push(defaultPage(b.dataset.add, deckOpts())); restructure(); }));
    $('#btn-download-all').addEventListener('click', exportAll);
    $('#btn-ai-open').addEventListener('click', onOpenClaude);
    $('#btn-ai-copy').addEventListener('click', onCopyPrompt);
    $('#btn-ai-fill').addEventListener('click', onFill);
    const lbl = $('#set-label'); lbl.value = D().brandLabel; lbl.addEventListener('input', () => { D().brandLabel = lbl.value; touch(); });
    const lblSize = $('#set-label-size'); lblSize.value = D().brandLabelSize; lblSize.addEventListener('input', () => { D().brandLabelSize = num(lblSize.value, 24); touch(); });
    const slInit = () => { $('#set-slogan-size').value = D().sloganSize; $('#set-slogan-x').value = D().sloganOffsetX; $('#set-slogan-y').value = D().sloganOffsetY; };
    slInit();
    const slSync = (id, key) => $(id).addEventListener('input', () => { D()[key] = num($(id).value, key === 'sloganSize' ? 24 : 0); touch(); });
    slSync('#set-slogan-size', 'sloganSize'); slSync('#set-slogan-x', 'sloganOffsetX'); slSync('#set-slogan-y', 'sloganOffsetY');
    $('#set-slogan-reset').addEventListener('click', () => { D().sloganSize = 24; D().sloganOffsetX = 0; D().sloganOffsetY = 0; slInit(); touch(); flash('已复原标语'); });
    const ft = $('#set-footer'); ft.value = D().footerNote; ft.addEventListener('input', () => { D().footerNote = ft.value; touch(); });
    const ftP = $('#set-footer-preset'); ftP.addEventListener('change', () => { const v = ftP.value; ftP.value = ''; if (v === '') return; const t = FOOTER_PRESETS[v] || ''; D().footerNote = t; ft.value = t; touch(); });
    const fontSel = $('#set-font'); fontSel.value = D().coverFont; fontSel.addEventListener('change', () => { D().coverFont = fontSel.value; touch(); });

    const recolor = $('#logo-recolor'); recolor.checked = D().logoRecolor !== false; recolor.addEventListener('change', () => { D().logoRecolor = recolor.checked; touch(); });
    bindUpload('#up-logo', async (data) => { D().logoData = data; const n = await imgNat(data); D().logoNatW = n.w; D().logoNatH = n.h; resetLogoAdjust(); if (!save()) flash('图太大，本地存不下；本次有效，刷新会丢'); renderPreview(); flash('logo 已更新，可点“裁剪/缩放/移动”调整'); });
    $('#clr-logo').addEventListener('click', () => { D().logoData = null; touch(); flash('已清除 logo'); });
  }
  function readDataUrl(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); }); }
  function bindUpload(sel, onData) {
    const inp = $(sel);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; inp.value = '';
      if (!f) return;
      if (!/^image\//.test(f.type)) { alert('请选择图片文件'); return; }
      const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(f); });
      onData(data);
    });
  }
  function init() {
    save(); // 持久化（含旧格式迁移到双 deck）
    document.documentElement.dataset.platform = state.platform;
    document.querySelectorAll('.plat-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.platform === state.platform));
    wire(); wireCanvas(); wireLogoEditor();
    $('#btn-copy-other').addEventListener('click', copyToOther);
    refreshSettingsUI();
    renderEditors(); renderPreview(); loadAssets();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
