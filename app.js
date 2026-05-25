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
  // 网络字体（Google Fonts）：预览用 <link> 加载，导出时按所用文字子集内联
  const WEBFONTS = {
    notosans: { label: '思源黑体', g: 'Noto+Sans+SC:wght@500;700;900', fam: 'Noto Sans SC', fb: "'PingFang SC',sans-serif" },
    notoserif: { label: '思源宋体', g: 'Noto+Serif+SC:wght@600;900', fam: 'Noto Serif SC', fb: "'Songti SC',serif" },
    huangyou: { label: '站酷黄油体', g: 'ZCOOL+QingKe+HuangYou', fam: 'ZCOOL QingKe HuangYou', fb: "'PingFang SC',sans-serif" },
    kuaile: { label: '站酷快乐体', g: 'ZCOOL+KuaiLe', fam: 'ZCOOL KuaiLe', fb: 'sans-serif' },
    xiaowei: { label: '站酷小薇', g: 'ZCOOL+XiaoWei', fam: 'ZCOOL XiaoWei', fb: 'serif' },
    mashan: { label: '马善政楷体', g: 'Ma+Shan+Zheng', fam: 'Ma Shan Zheng', fb: "'Kaiti SC',serif" },
    longcang: { label: '龙藏手写', g: 'Long+Cang', fam: 'Long Cang', fb: 'cursive' },
    zhimang: { label: '智芒手写', g: 'Zhi+Mang+Xing', fam: 'Zhi Mang Xing', fb: 'cursive' },
    anton: { label: 'Anton', g: 'Anton', fam: 'Anton', fb: 'sans-serif' },
    bebas: { label: 'Bebas Neue', g: 'Bebas+Neue', fam: 'Bebas Neue', fb: 'sans-serif' },
    oswald: { label: 'Oswald', g: 'Oswald:wght@600;700', fam: 'Oswald', fb: 'sans-serif' },
    montserrat: { label: 'Montserrat', g: 'Montserrat:wght@700;800', fam: 'Montserrat', fb: 'sans-serif' },
    poppins: { label: 'Poppins', g: 'Poppins:wght@700;800', fam: 'Poppins', fb: 'sans-serif' },
    playfair: { label: 'Playfair', g: 'Playfair+Display:wght@700;900', fam: 'Playfair Display', fb: 'serif' },
    lobster: { label: 'Lobster', g: 'Lobster', fam: 'Lobster', fb: 'cursive' },
    pacifico: { label: 'Pacifico', g: 'Pacifico', fam: 'Pacifico', fb: 'cursive' },
  };
  for (const k in WEBFONTS) FONT_STACKS[k] = "'" + WEBFONTS[k].fam + "', " + WEBFONTS[k].fb;
  const FONT_LABELS = { hei: '黑体', yuan: '圆体', kai: '楷体', song: '宋体', libian: '隶书', weibei: '魏碑', yuppy: '雅痞', impact: 'Impact', futura: 'Futura', helvetica: 'Helvetica', georgia: 'Georgia', times: 'Times', courier: 'Courier', custom: '自定义(assets/fonts)' };
  const FONT_GROUPS = [
    ['系统·中文', ['hei', 'yuan', 'kai', 'song', 'libian', 'weibei', 'yuppy']],
    ['系统·英文', ['impact', 'futura', 'helvetica', 'georgia', 'times', 'courier']],
    ['网络·中文', ['notosans', 'notoserif', 'huangyou', 'kuaile', 'xiaowei', 'mashan', 'longcang', 'zhimang']],
    ['网络·英文', ['anton', 'bebas', 'oswald', 'montserrat', 'poppins', 'playfair', 'lobster', 'pacifico']],
    ['自定义', ['custom']],
  ];
  function fontLabel(k) { return WEBFONTS[k] ? WEBFONTS[k].label : (FONT_LABELS[k] || k); }
  const loadedWebFonts = new Set();
  function ensureWebFont(key) {
    const w = WEBFONTS[key]; if (!w || loadedWebFonts.has(key)) return;
    loadedWebFonts.add(key);
    const l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + w.g + '&display=swap';
    document.head.appendChild(l);
  }
  function populateFontSelects() {
    const html = FONT_GROUPS.map(([g, keys]) => '<optgroup label="' + g + '">' + keys.map((k) => '<option value="' + k + '">' + fontLabel(k) + '</option>').join('') + '</optgroup>').join('');
    ['#set-font', '#cv-font'].forEach((sel) => { const el = $(sel); if (el) el.innerHTML = html; });
  }
  function coverFontStack() { return FONT_STACKS[D().coverFont] || FONT_STACKS.hei; }
  const THEME_DEFAULTS = { xhs: { accent: '#191970', title: '#191970', heading: '#191970', ink: '#191970' }, xls: { accent: '#1e66cc', title: '#1e66cc', heading: '#e5352a', ink: '#1c1c1e' } };
  const COLOR_VARS = { accent: '--accent', title: '--title-color', heading: '--heading', ink: '--ink' };
  function deckColorStyle() { const c = D().colors || {}; let s = ''; for (const k in COLOR_VARS) if (c[k]) s += COLOR_VARS[k] + ':' + c[k] + ';'; return s; }
  function pgFramePad(p) { return p && p.framePad != null ? p.framePad : (D().framePad != null ? D().framePad : 22); }
  function pgMhGap(p) { return p && p.mastheadGap != null ? p.mastheadGap : (D().mastheadGap != null ? D().mastheadGap : 18); }

  // 资产（用户放进 assets/ 后自动生效）
  let logoDataUri = null;     // assets/logo-mark.(svg|png) → 按主题色重新上色
  let logoAssetNat = { w: 0, h: 0 };
  let memojiDataUri = null;   // assets/memoji.(png|svg) → 小红书封面人物
  let memojiNat = { w: 1, h: 1 };  // 当前人物图原始宽高比，用于封面底部居中定位
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
  async function refreshMemojiNat() {
    const src = (D() && D().memojiData) || memojiDataUri;
    if (!src) { memojiNat = { w: 1, h: 1 }; return; }
    const n = await imgNat(src);
    if (n.w && n.h) memojiNat = n;
  }
  // 封面人物：底部贴近边框、水平居中。按图片真实宽高比算高度，y 让其底边落在 ~0.97。
  function coverMemojiEl(src) {
    const CW = 470, CH = 600, w = 0.30;
    const ar = (memojiNat && memojiNat.w) ? memojiNat.h / memojiNat.w : 1;
    const hFrac = (w * CW / CH) * ar;
    const y = Math.max(0.04, 0.97 - hFrac);
    return { id: uid(), kind: 'image', x: (1 - w) / 2, y, w: w, src: src };
  }
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
        if (c.showMemoji !== false && memoji) els.push(coverMemojiEl(memoji));
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
      brandLabel: '签证信息', brandLabelSize: 24, brandLabelOffsetX: 0, brandLabelOffsetY: 0, framePad: 22, footerNote: DEFAULT_FOOTER, coverFont: 'hei',
      sloganSize: 24, sloganOffsetX: 0, sloganOffsetY: 0,
      logoData: null, logoNatW: 0, logoNatH: 0, logoRecolor: true,
      logoScale: 1, logoOffsetX: 0, logoOffsetY: 0, logoCrop: { x: 0, y: 0, w: 1, h: 1 },
      memojiData: null, memojiScale: 1, memojiOffsetX: 0, memojiOffsetY: 0,
      copy: { series: '', titles: [], title: '', body: '', tags: '' },
      colors: { accent: '', title: '', heading: '', ink: '' },
      mastheadGap: 18,
    };
  }
  function normalizeDeck(s) {
    const d = (s && typeof s === 'object') ? s : {};
    if (!Array.isArray(d.pages)) d.pages = [defaultPage('cover')];
    if (typeof d.brandLabel !== 'string') d.brandLabel = '签证信息';
    if (typeof d.brandLabelSize !== 'number') d.brandLabelSize = 24;
    if (typeof d.brandLabelOffsetX !== 'number') d.brandLabelOffsetX = 0;
    if (typeof d.brandLabelOffsetY !== 'number') d.brandLabelOffsetY = 0;
    if (typeof d.framePad !== 'number') d.framePad = 22;
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
    if (!d.copy || typeof d.copy !== 'object') d.copy = { series: '', titles: [], title: '', body: '', tags: '' };
    else { d.copy.series = str(d.copy.series, ''); d.copy.titles = Array.isArray(d.copy.titles) ? d.copy.titles.map(String) : []; d.copy.title = str(d.copy.title, ''); d.copy.body = str(d.copy.body, ''); d.copy.tags = str(d.copy.tags, ''); }
    if (!d.colors || typeof d.colors !== 'object') d.colors = { accent: '', title: '', heading: '', ink: '' };
    else { ['accent', 'title', 'heading', 'ink'].forEach((k) => { if (typeof d.colors[k] !== 'string') d.colors[k] = ''; }); }
    if (typeof d.mastheadGap !== 'number') d.mastheadGap = 18;
    d.pages = d.pages.map((pg) => migratePage(pg, d));
    return d;
  }
  // 双语分析已停用：转成文本内容
  function biToText(p) {
    const parts = [str(p.en, ''), str(p.cn, '')].filter(Boolean);
    const steps = Array.isArray(p.steps) ? p.steps.filter(Boolean) : [];
    if (p.actionTitle || steps.length) { parts.push(str(p.actionTitle, '要怎么做?')); steps.forEach((s, i) => parts.push((i + 1) + '. ' + s)); }
    return { type: 'text', title: str(p.heading, ''), body: parts.join('\n') };
  }
  // 旧模板页 → 画布页（保留内容）；表格/画布页保持
  function migratePage(pg, d) {
    if (!pg || typeof pg !== 'object') return defaultPage('canvas');
    if (pg.type === 'canvas') { if (!Array.isArray(pg.elements)) pg.elements = []; if (typeof pg.preset !== 'string' || pg.preset === 'bilingual') pg.preset = pg.preset === 'bilingual' ? 'text' : (typeof pg.preset === 'string' ? pg.preset : 'canvas'); return pg; }
    if (pg.type === 'table') { if (!Array.isArray(pg.columns)) pg.columns = ['列1', '列2']; if (!Array.isArray(pg.rows)) pg.rows = []; if (typeof pg.title !== 'string') pg.title = ''; return pg; }
    if (pg.type === 'bilingual') pg = Object.assign({ id: pg.id }, biToText(pg));
    if (['cover', 'list', 'policy', 'text'].includes(pg.type)) {
      return { id: pg.id || uid(), type: 'canvas', preset: pg.type, noFooter: pg.type === 'cover', elements: elementsFromContent(pg.type, pg, { coverFont: d.coverFont, memojiData: d.memojiData }) };
    }
    return defaultPage('canvas');
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function freshState() { return { platform: 'xhs', uiColor: 'alipay', decks: { xhs: newDeck(), xls: newDeck() } }; }
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (!s || typeof s !== 'object') return freshState();
      const platform = (s.platform === 'xls') ? 'xls' : 'xhs';
      const uiColor = typeof s.uiColor === 'string' ? s.uiColor : 'alipay';
      if (s.decks && s.decks.xhs && s.decks.xls) return { platform, uiColor, decks: { xhs: normalizeDeck(s.decks.xhs), xls: normalizeDeck(s.decks.xls) } };
      if (Array.isArray(s.pages)) { const d = normalizeDeck(s); return { platform, uiColor, decks: { xhs: d, xls: clone(d) } }; } // 旧版单 deck → 两平台各一份（互不联动）
      return freshState();
    } catch { return freshState(); }
  }
  const UI_COLORS = { alipay: '#1677FF', wechat: '#07C160', orange: '#FF7A1A', bw: '#1A1A1A', pink: '#FF4D8D' };
  function setUiColor(k) {
    if (!UI_COLORS[k]) k = 'alipay';
    state.uiColor = k;
    document.documentElement.style.setProperty('--ui-accent', UI_COLORS[k]);
    document.querySelectorAll('.ui-color').forEach((b) => b.classList.toggle('is-active', b.dataset.ui === k));
    save();
  }
  function D() { return state.decks[state.platform]; }
  function imgNat(url) { return new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight }); i.onerror = () => res({ w: 0, h: 0 }); i.src = url; }); }
  function resetLogoAdjust() { D().logoScale = 1; D().logoOffsetX = 0; D().logoOffsetY = 0; D().logoCrop = { x: 0, y: 0, w: 1, h: 1 }; }
  let state = loadState();
  function save() { let ok = true; try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch { ok = false; } scheduleHist(); return ok; }
  // ---------------- 撤销 / 重做（防抖快照） ----------------
  let history = [], histIdx = -1, histTimer = null, restoring = false;
  function histInit() { history = [JSON.stringify(state)]; histIdx = 0; updateUndoBtns(); }
  function histPush() { if (restoring) return; const s = JSON.stringify(state); if (history[histIdx] === s) return; history = history.slice(0, histIdx + 1); history.push(s); if (history.length > 50) history.shift(); histIdx = history.length - 1; updateUndoBtns(); }
  function scheduleHist() { if (restoring) return; clearTimeout(histTimer); histTimer = setTimeout(histPush, 500); }
  function histRestore(idx) {
    if (idx < 0 || idx >= history.length) return;
    restoring = true; clearTimeout(histTimer); histIdx = idx;
    try { state = JSON.parse(history[idx]); } catch (e) { restoring = false; return; }
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (_) {}
    document.documentElement.dataset.platform = state.platform;
    if (typeof cv !== 'undefined' && cv) { $('#cv-modal').hidden = true; cv = null; }
    document.querySelectorAll('.plat-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.platform === state.platform));
    setUiColor(state.uiColor); refreshSettingsUI(); renderEditors(); renderPreview();
    restoring = false; updateUndoBtns();
  }
  function undo() { if (histIdx > 0) histRestore(histIdx - 1); }
  function redo() { if (histIdx < history.length - 1) histRestore(histIdx + 1); }
  function updateUndoBtns() { const u = $('#btn-undo'), r = $('#btn-redo'); if (u) u.disabled = histIdx <= 0; if (r) r.disabled = histIdx >= history.length - 1; }
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
    return `<div class="masthead mh-xls">${logoMarkup()}${D().brandLabel ? `<div class="brand-label" style="font-size:${D().brandLabelSize || 24}px;transform:translate(${D().brandLabelOffsetX || 0}px,${D().brandLabelOffsetY || 0}px)">${esc(D().brandLabel)}</div>` : ''}</div>`;
  }

  function footerHTML(page) {
    const t = D().footerNote;
    if (page.type === 'cover' || page.noFooter || !t) return '';
    const W = state.platform === 'xls' ? (CARD_W - 24 - 2 * pgFramePad(page)) : (CARD_W - 60);
    let wl = 0; for (const ch of String(t)) wl += (ch.charCodeAt(0) > 255 ? 1 : 0.55);
    const size = Math.max(7, Math.min(13, (W * 0.98) / Math.max(1, wl)));
    return `<div class="card-footer" style="font-size:${size.toFixed(1)}px">${esc(t)}</div>`;
  }
  function buildCardHTML(page) {
    return `<div class="frame">${masthead()}<div class="content-box">${templateHTML(page)}</div>${footerHTML(page)}</div>`;
  }
  function buildCard(page) { const c = mk('div', 'page-card'); c.style.setProperty('--cover-font', coverFontStack()); c.style.setProperty('--frame-pad', pgFramePad(page) + 'px'); c.style.setProperty('--mh-gap', pgMhGap(page) + 'px'); const cl = D().colors || {}; for (const k in COLOR_VARS) if (cl[k]) c.style.setProperty(COLOR_VARS[k], cl[k]); c.innerHTML = buildCardHTML(page); return c; }

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
    D().pages.forEach((pg) => (pg.elements || []).forEach((e) => { if (e.font) ensureWebFont(e.font); }));
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
  function withNotes(t) { return String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/（[^）]*）/g, '<span class="note">$&</span>'); }
  function label(t) { const l = mk('span', 'field-label'); l.innerHTML = withNotes(t); return l; }
  function noteify() { document.querySelectorAll('.field-label').forEach((el) => { if (el.dataset.noted || !/（[^）]*）/.test(el.textContent)) return; el.innerHTML = withNotes(el.textContent); el.dataset.noted = '1'; }); }
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
  function pageRange(labelText, page, key, def, min, max) {
    const row = mk('div', 'lg-inline');
    const l = mk('span'); l.textContent = labelText; row.appendChild(l);
    const inp = mk('input', 'lg-mini', { type: 'range', min: String(min), max: String(max), step: '1' });
    inp.value = (page[key] != null ? page[key] : (D()[key] != null ? D()[key] : def));
    inp.addEventListener('input', () => { page[key] = num(inp.value, def); touch(); });
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
          fi.addEventListener('change', async () => { const f = fi.files && fi.files[0]; fi.value = ''; if (!f) return; if (!/^image\//.test(f.type)) { alert('请选择图片文件'); return; } D().memojiData = await readDataUrl(f); await refreshMemojiNat(); if (!save()) flash('图太大，本地存不下；本次有效，刷新会丢'); restructure(); flash('人物已更新'); });
          up.appendChild(fi);
          const clr = mk('button', 'btn btn-sm btn-ghost'); clr.textContent = '清除人物'; clr.addEventListener('click', async () => { D().memojiData = null; await refreshMemojiNat(); restructure(); flash('已清除人物'); });
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
    b.appendChild(label('本页间距（只影响这一页）'));
    b.appendChild(pageRange('报头间距', page, 'mastheadGap', 18, 0, 64));
    if (state.platform === 'xls') b.appendChild(pageRange('内容边距', page, 'framePad', 22, 4, 40));
    if (page.type === 'canvas') {
      const row = mk('div', 'lg-inline'); const sl = mk('span'); sl.textContent = '左右边距'; row.appendChild(sl);
      const inp = mk('input', 'lg-mini', { type: 'range', min: '0', max: '25', step: '1' });
      inp.value = Math.round((page.sideMargin != null ? page.sideMargin : 0.06) * 100);
      inp.addEventListener('input', () => { const m = num(inp.value, 6) / 100; page.sideMargin = m; (page.elements || []).forEach((e) => { if (e.kind === 'text') { e.x = m; e.w = Math.max(0.1, 1 - 2 * m); } }); touch(); });
      row.appendChild(inp); b.appendChild(row);
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
        if (page.showMemoji !== false && (D().memojiData || memojiDataUri)) els.push(coverMemojiEl(D().memojiData || memojiDataUri));
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
    const plat = state.platform === 'xhs' ? '小红书' : '微信公众号 / 小绿书';
    const voice = state.platform === 'xhs'
      ? '语气亲切、有网感、利落，善用短句和重点前置，适合年轻学生和家长刷到就想看；封面标题要有钩子。'
      : '语气专业、稳重、可信，条理清晰、信息完整，像机构公众号推文，适合家长仔细阅读和收藏。';
    return [
      '你是一家专业国际教育公司的资深新媒体内容编辑（负责留学/升学/签证方向）。',
      '下面是我从学校官网、招生页、政策通知等地方收集来的零散原文（可能含链接、英文、口语、排版混乱、信息不全）。',
      '请你像专业编辑一样，对这些素材做真正的「加工」，而不是照抄：',
      '1）读懂并提炼核心信息，去掉冗余和废话；',
      '2）重新组织结构、归类、排序，让逻辑清晰、层次分明；',
      '3）把生硬/英文/官方腔的表达改写成通顺、专业、有吸引力的中文；',
      '4）按图文卡片的节奏拆分成多页（封面 + 概览 + 各项详情等）；',
      '5）补充必要的专业措辞和过渡，让它读起来像出自专业国际教育机构。',
      '【准确性底线】不得杜撰具体事实：学校名、专业名、时间/截止日期、学费、分数线、录取要求、报名方式等硬信息必须忠于原文；原文没有的就不要编造，可以留白或用「详见官网」之类提示，但不要捏造数字。可自由改写措辞、提炼重点、调整结构、润色语气。',
      '【目标平台】' + plat + '。' + voice,
      '【输出格式】只输出一个 JSON 对象，不要任何解释文字，不要 markdown 代码块围栏。',
      'JSON 结构（pages 是有序数组，按需选用页面类型，可重复，可增删页）：',
      '{',
      '  "pages": [',
      '    {"type":"cover","title":"封面大标题(可用\\n换行,每行尽量≤5字,要有吸引力)"},',
      '    {"type":"table","title":"表格标题","columns":["列1","列2","列3"],"rows":[["a","b","c"],["d","e","f"]]},',
      '    {"type":"list","heading":"小标题","items":[{"name":"项目名","note":"一句话亮点说明"}]},',
      '    {"type":"policy","title":"政策标题","points":["要点一","要点二"]},',
      '    {"type":"text","title":"标题","body":"正文(可用\\n换行,分点更清晰)"}',
      '  ]',
      '}',
      '排版建议：第一页用 cover 抓眼球；多个项目/学校先用 list 做概览，再每个用 text 展开详情；',
      '录取数据/排名/对比用 table；政策/截止日期/材料清单用 policy；其余说明用 text。',
      '务必保留关键信息：时间、地点、报名/申请方式、要求、学费、截止日期。',
      '原始素材：', '"""', raw, '"""',
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
    if (p.type === 'bilingual') p = biToText(p); // 双语分析已停用 → 文本
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

  // ---------------- AI 文案（标题/正文/标签，按平台算法） ----------------
  const ALGO_VER = '2026.05';
  const ALGO = {
    xhs: ['【小红书·自然流量要点 v' + ALGO_VER + '】',
      '- 标题≤20字，前6字最关键；含核心关键词+利益点/数字/情绪，可少量 emoji。',
      '- 正文：结论/痛点前置，前3行抓人；分点、口语化、真实分享感；自然铺核心关键词与近义词（吃搜索流量）；结尾引导评论/收藏/关注。',
      '- 标签 6-10 个：大词(#留学)+垂类(#香港留学)+长尾(#港大申请)+相关热点话题，混合使用。',
      '- 垂直度、完播与互动率影响推荐；忌标题党与违规词。'].join('\n'),
    xls: ['【微信(小绿书/公众号)·自然流量要点 v' + ALGO_VER + '】',
      '- 依赖社交分发+搜一搜+标签；标题清晰含关键词，少标题党。',
      '- 正文结构化、信息密度高、专业可信；适度 emoji；利于「看一看/搜一搜」。',
      '- 标签精准 4-8 个，覆盖核心词与长尾词；结尾可引导转发/在看。'].join('\n'),
  };
  function extractDeckText() {
    const out = [];
    D().pages.forEach((p, i) => {
      out.push('【第' + (i + 1) + '页 ' + (TYPE_LABEL[p.preset || p.type] || '') + '】');
      if (p.type === 'table') { if (p.title) out.push(p.title); out.push((p.columns || []).join(' | ')); (p.rows || []).forEach((r) => out.push((r || []).join(' | '))); }
      else (p.elements || []).forEach((e) => { if (e.kind === 'text' && e.text) out.push(e.text); });
    });
    return out.join('\n');
  }
  function buildCopyPrompt() {
    const plat = state.platform === 'xhs' ? '小红书' : '微信（小绿书 / 公众号）';
    const series = D().copy.series ? ('已有同系列标题风格参考（请保持风格一致）：「' + D().copy.series + '」') : '（无系列参考）';
    return [
      '你是' + plat + '运营专家，目标是获得自然流量曝光。根据下面这条图文的内容，产出发布文案。',
      state.platform === 'xhs' ? ALGO.xhs : ALGO.xls,
      series,
      '严格只输出一个 JSON（不要解释、不要代码块围栏）：',
      '{ "titles": ["标题A","标题B","标题C"], "body": "正文，可用\\n换行", "tags": ["#标签1","#标签2"] }',
      '- 3 个标题风格不同（如 干货直给 / 情绪共鸣 / 数字清单），均≤20字并符合上述算法要点；若有系列参考则保持统一。',
      '- 正文与标签均针对该平台自然流量优化。',
      '内容：', '"""', extractDeckText(), '"""',
    ].join('\n');
  }
  function onCopyGen() { window.open('claude://claude.ai/new?q=' + encodeURIComponent(buildCopyPrompt()), '_blank', 'noopener'); }
  function onCopyGenCopy() { const p = buildCopyPrompt(); copyText(p).then((ok) => { if (ok) flash('已复制文案提示词'); else window.prompt('复制这段去 Claude：', p); }); }
  function onCopyFill() {
    const t = $('#copy-json').value; if (!t.trim()) { alert('先粘贴 Claude 返回的 JSON'); return; }
    let o; try { let s = t.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim(); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a >= 0 && b > a) s = s.slice(a, b + 1); o = JSON.parse(s); } catch (e) { alert('解析失败：' + e.message); return; }
    const c = D().copy;
    c.titles = Array.isArray(o.titles) ? o.titles.map(String).slice(0, 5) : [];
    c.title = c.titles[0] || c.title || '';
    c.body = str(o.body, '');
    c.tags = Array.isArray(o.tags) ? o.tags.map(String).join(' ') : str(o.tags, '');
    save(); renderCopyPanel(); flash('文案已填入，可编辑');
  }
  function renderCopyTitles() {
    const box = $('#copy-titles'); if (!box) return; box.innerHTML = '';
    (D().copy.titles || []).forEach((t) => { const b = mk('button', 'btn btn-sm copy-title-opt'); b.textContent = t; if (t === D().copy.title) b.classList.add('is-active'); b.addEventListener('click', () => { D().copy.title = t; $('#copy-title').value = t; renderCopyTitles(); save(); }); box.appendChild(b); });
  }
  function renderCopyPanel() {
    const c = D().copy;
    $('#copy-series').value = c.series; $('#copy-title').value = c.title; $('#copy-body').value = c.body; $('#copy-tags').value = c.tags;
    renderCopyTitles();
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
  async function inlineWebFonts(page) {
    const used = {};
    (page.elements || []).forEach((e) => {
      if (e.kind !== 'text') return;
      const w = WEBFONTS[e.font]; if (!w) return;
      (used[e.font] = used[e.font] || new Set());
      for (const ch of String(e.text || '')) used[e.font].add(ch);
    });
    let out = '';
    for (const key in used) {
      const w = WEBFONTS[key];
      const text = Array.from(used[key]).join('') || ' ';
      try {
        const cssUrl = 'https://fonts.googleapis.com/css2?family=' + w.g + '&text=' + encodeURIComponent(text) + '&display=block';
        let ff = await fetch(cssUrl).then((r) => r.text());
        const urls = [...ff.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ''));
        for (const u of urls) {
          const buf = new Uint8Array(await fetch(u).then((r) => r.arrayBuffer()));
          let bin = ''; for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          ff = ff.split(u).join('data:font/woff2;base64,' + btoa(bin));
        }
        out += ff + '\n';
      } catch (e) { /* 取不到则回退系统字体，导出不中断 */ }
    }
    return out;
  }
  async function pageToPng(page) {
    const css = exportFontFace() + '\n' + (await inlineWebFonts(page)) + '\n' + (await getCSS());
    const inner = `<div class="page-card" data-platform="${state.platform}" style="width:${CARD_W}px;height:${CARD_H}px;transform:none;--cover-font:${coverFontStack()};--frame-pad:${pgFramePad(page)}px;--mh-gap:${pgMhGap(page)}px;${deckColorStyle()}">${buildCardHTML(page)}</div>`;
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
  async function shareAll() {
    if (!D().pages.length) { alert('还没有页面'); return; }
    const btn = $('#btn-share'); btn.disabled = true; const old = btn.textContent; btn.textContent = '准备中…';
    try {
      const files = [];
      for (let i = 0; i < D().pages.length; i++) {
        const blob = await (await fetch(await pageToPng(D().pages[i]))).blob();
        files.push(new File([blob], `${state.platform}-${String(i + 1).padStart(2, '0')}.png`, { type: 'image/png' }));
      }
      const c = D().copy, txt = [c.title, c.body, c.tags].filter(Boolean).join('\n\n');
      const full = { files, text: txt, title: c.title || 'EduLight 图文' };
      if (navigator.canShare && navigator.canShare({ files })) {
        const payload = (txt && navigator.canShare(full)) ? full : { files, title: c.title || 'EduLight 图文' };
        try { await navigator.share(payload); flash('已唤起分享，选小红书 / 微信发布或存草稿'); }
        catch (e) { /* 用户取消，忽略 */ }
      } else {
        alert('当前环境不支持「分享到 App」（多见于电脑浏览器）。\n\n请用手机打开本页再点此按钮，即可分享到小红书 / 微信存草稿；或先用「下载全部」保存图片再手动上传。');
      }
    } catch (e) { alert('生成失败：' + e.message); } finally { btn.disabled = false; btn.textContent = old; }
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
    cv = { page, card, box: card.querySelector('.tpl-canvas'), sel: null, selSet: [] };
    cv.refs = ['cv-ref-v', 'cv-ref-h', 'cv-ref-t1', 'cv-ref-t2'].map((c) => mk('div', 'cv-ref ' + c));
    cv.gv = mk('div', 'cv-guide cv-guide-v'); cv.gh = mk('div', 'cv-guide cv-guide-h');
    const cbox = card.querySelector('.content-box');
    cbox.addEventListener('pointerdown', (e) => { if (e.target.classList.contains('content-box') || e.target.classList.contains('tpl-canvas')) selectEl(null); });
    rebuildCanvasEls();
    $('#cv-modal').hidden = false;
    updateCvToolbar();
  }
  function closeCanvasEditor() { $('#cv-modal').hidden = true; cv = null; save(); renderEditors(); renderPreview(); }

  function applyCvSelClasses() {
    const set = cv.selSet || [];
    [...cv.box.children].forEach((n) => { if (n._el) { n.classList.toggle('selected', set.includes(n._el)); n.classList.toggle('primary', n._el === cv.sel); } });
  }
  function rebuildCanvasEls() {
    const box = cv.box; box.innerHTML = '';
    cv.page.elements.forEach((e) => box.appendChild(buildEditableEl(e)));
    if (cv.refs) { cv.refs.forEach((r) => box.appendChild(r)); box.appendChild(cv.gv); box.appendChild(cv.gh); }
    applyCvSelClasses();
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
    node.addEventListener('pointerdown', (ev) => {
      if (ev.target === handle || node.classList.contains('editing')) return;
      if (ev.shiftKey) { ev.preventDefault(); selectEl(e, true); return; }
      if (!(cv.selSet || []).includes(e)) selectEl(e);
      startDrag(ev, e, node);
    });
    handle.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); selectEl(e); startResize(ev, e, node); });
    return node;
  }
  function selNode() { return [...cv.box.children].find((n) => n._el === cv.sel); }
  function selectEl(e, additive) {
    if (!cv.selSet) cv.selSet = [];
    if (!e) { cv.selSet = []; cv.sel = null; }
    else if (additive) { const i = cv.selSet.indexOf(e); if (i >= 0) { cv.selSet.splice(i, 1); cv.sel = cv.selSet[cv.selSet.length - 1] || null; } else { cv.selSet.push(e); cv.sel = e; } }
    else { cv.selSet = [e]; cv.sel = e; }
    applyCvSelClasses(); updateCvToolbar();
  }
  function selectAllText() {
    const texts = cv.page.elements.filter((e) => e.kind === 'text');
    const set = cv.selSet || [];
    const allSelected = texts.length > 0 && set.length === texts.length && texts.every((e) => set.includes(e));
    if (allSelected) { cv.selSet = []; cv.sel = null; } // 再按一次取消全选
    else { cv.selSet = texts.slice(); cv.sel = texts[texts.length - 1] || null; }
    applyCvSelClasses(); updateCvToolbar();
  }
  function boxRect() { return cv.box.getBoundingClientRect(); }
  function startDrag(ev, e, node) {
    ev.preventDefault();
    const set = cv.selSet || [];
    const r = boxRect(), sx = ev.clientX, sy = ev.clientY;
    if (set.length > 1 && set.includes(e)) { // 多选一起移动
      const starts = set.map((el) => ({ el, ox: el.x, oy: el.y }));
      const mv = (e2) => { const dx = (e2.clientX - sx) / r.width, dy = (e2.clientY - sy) / r.height; starts.forEach(({ el, ox, oy }) => { el.x = clamp(ox + dx, 0, 1); el.y = clamp(oy + dy, 0, 1); const n = [...cv.box.children].find((c) => c._el === el); if (n) { n.style.left = (el.x * 100) + '%'; n.style.top = (el.y * 100) + '%'; } }); };
      const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); save(); };
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
      return;
    }
    const ox = e.x, oy = e.y, SNAP = 0.014, elH = node.offsetHeight / r.height;
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
    function applyToSelText(fn) { (cv.selSet || []).forEach((e) => { if (e.kind === 'text') fn(e); }); rebuildCanvasEls(); save(); }
    $('#cv-all').addEventListener('click', selectAllText);
    $('#cv-size').addEventListener('input', () => { const v = num($('#cv-size').value, 36); applyToSelText((e) => { e.size = v; }); });
    $('#cv-color').addEventListener('input', () => { const v = $('#cv-color').value; applyToSelText((e) => { e.color = v; }); });
    $('#cv-bold').addEventListener('click', () => { const w = (cv.sel && cv.sel.weight >= 700) ? 400 : 800; applyToSelText((e) => { e.weight = w; }); });
    $('#cv-align').addEventListener('click', () => { const al = ALIGNS[(ALIGNS.indexOf(cv.sel ? cv.sel.align : 'left') + 1) % 3]; applyToSelText((e) => { e.align = al; }); });
    $('#cv-font').addEventListener('change', () => { const v = $('#cv-font').value; ensureWebFont(v); applyToSelText((e) => { e.font = v; }); });
    $('#cv-lh').addEventListener('input', () => { const v = num($('#cv-lh').value, 1.3); applyToSelText((e) => { e.lh = v; }); });
    $('#cv-ls').addEventListener('input', () => { const v = num($('#cv-ls').value, 0); applyToSelText((e) => { e.ls = v; }); });
    $('#cv-front').addEventListener('click', () => { reorderSel(1); });
    $('#cv-back').addEventListener('click', () => { reorderSel(-1); });
    $('#cv-del').addEventListener('click', () => { const set = cv.selSet || []; if (!set.length) return; cv.page.elements = cv.page.elements.filter((e) => !set.includes(e)); cv.selSet = []; cv.sel = null; rebuildCanvasEls(); updateCvToolbar(); save(); });
    $('#cv-tidy').addEventListener('click', tidyCanvas);
    $('#cv-done').addEventListener('click', closeCanvasEditor);
    document.addEventListener('keydown', (e) => {
      if (!cv || $('#cv-modal').hidden || !(cv.selSet && cv.selSet.length)) return;
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName))) return;
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const dir = map[e.key]; if (!dir) return;
      e.preventDefault();
      const step = e.shiftKey ? 0.02 : 0.004;
      cv.selSet.forEach((el) => { el.x = clamp(el.x + dir[0] * step, 0, 1); el.y = clamp(el.y + dir[1] * step, 0, 1); const n = [...cv.box.children].find((c) => c._el === el); if (n) { n.style.left = (el.x * 100) + '%'; n.style.top = (el.y * 100) + '%'; } });
      save();
    });
  }
  function tidyCanvas() {
    if (!cv || !cv.page.elements.length) return;
    const texts = cv.page.elements.filter((e) => e.kind === 'text').sort((a, b) => a.y - b.y);
    if (!texts.length) return;
    const sm = cv.page.sideMargin != null ? cv.page.sideMargin : 0.06;
    texts.forEach((e) => { e.x = sm; }); // 仅左对齐 + 下方等间距堆叠；保留各自宽度，不强制等宽
    let y = 0;
    for (let iter = 0; iter < 6; iter++) {
      rebuildCanvasEls();
      const r = boxRect();
      y = 0.035; const GAP = 0.02;
      texts.forEach((e) => { const n = [...cv.box.children].find((c) => c._el === e); const h = n ? n.offsetHeight / r.height : 0.06; e.y = y; y += h + GAP; });
      if (y <= 0.99) break;
      const f = Math.max(0.85, 0.96 / y); // 超出则整体缩小字号再排
      texts.forEach((e) => { e.size = Math.max(9, Math.round(e.size * f)); });
    }
    rebuildCanvasEls(); save(); flash('已整理排版');
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
    refreshMemojiNat();
    save(); renderEditors(); renderPreview();
  }
  function refreshSettingsUI() {
    const d = D();
    $('#set-label').value = d.brandLabel;
    $('#set-label-size').value = d.brandLabelSize;
    $('#set-label-x').value = d.brandLabelOffsetX;
    $('#set-label-y').value = d.brandLabelOffsetY;
    $('#set-footer').value = d.footerNote;
    $('#set-font').value = d.coverFont;
    $('#logo-recolor').checked = d.logoRecolor !== false;
    $('#set-slogan-size').value = d.sloganSize;
    $('#set-slogan-x').value = d.sloganOffsetX;
    $('#set-slogan-y').value = d.sloganOffsetY;
    renderCopyPanel();
    const td = THEME_DEFAULTS[state.platform], cl = d.colors || {};
    $('#col-accent').value = cl.accent || td.accent;
    $('#col-title').value = cl.title || td.title;
    $('#col-heading').value = cl.heading || td.heading;
    $('#col-ink').value = cl.ink || td.ink;
    const other = state.platform === 'xhs' ? '小绿书' : '小红书';
    const cp = $('#btn-copy-other'); if (cp) cp.textContent = '复制内容到' + other;
    $('#xls-only').style.display = state.platform === 'xls' ? '' : 'none';
    $('#xhs-only').style.display = state.platform === 'xhs' ? '' : 'none';
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
    const appLogo = await loadImageAsset(['assets/app-logo.png', 'assets/app-logo.svg', 'assets/app-logo.webp', 'assets/app-logo.jpg', 'logo.png', 'assets/logo.png', 'app-logo.png']);
    if (appLogo) { const el = $('#brand-logo'); if (el) el.innerHTML = '<img class="brand-img" src="' + appLogo + '" alt="红绿书出图器" />'; }
    const icoXhs = await loadImageAsset(['assets/tab-xhs.png', 'assets/tab-xhs.svg', 'xhs.png', 'assets/xhs.png', 'icon-xhs.png']);
    if (icoXhs) { const el = $('#ico-xhs'); if (el) el.innerHTML = '<img class="plat-ico" src="' + icoXhs + '" alt="" />'; }
    const icoXls = await loadImageAsset(['assets/tab-xls.png', 'assets/tab-xls.svg', 'xls.png', 'assets/xls.png', 'icon-xls.png']);
    if (icoXls) { const el = $('#ico-xls'); if (el) el.innerHTML = '<img class="plat-ico" src="' + icoXls + '" alt="" />'; }
    for (const k of ['xhs', 'xls']) { const dk = state.decks[k]; if (dk.logoData && (!dk.logoNatW || !dk.logoNatH)) { const n = await imgNat(dk.logoData); dk.logoNatW = n.w; dk.logoNatH = n.h; save(); } }
    logoDataUri = await loadImageAsset(['assets/logo-mark.svg', 'assets/logo-mark.png']);
    if (logoDataUri) logoAssetNat = await imgNat(logoDataUri);
    memojiDataUri = await loadImageAsset(['assets/memoji.png', 'assets/memoji.svg']);
    await refreshMemojiNat();
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
    document.querySelectorAll('.ui-color').forEach((b) => b.addEventListener('click', () => setUiColor(b.dataset.ui)));
    document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => { D().pages.push(defaultPage(b.dataset.add, deckOpts())); restructure(); }));
    $('#btn-download-all').addEventListener('click', exportAll);
    $('#btn-share').addEventListener('click', shareAll);
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const ae = document.activeElement;
      if (ae && (ae.isContentEditable || /^(INPUT|TEXTAREA)$/.test(ae.tagName))) return; // 让输入框用原生撤销
      e.preventDefault(); if (e.shiftKey) redo(); else undo();
    });
    $('#copy-gen').addEventListener('click', onCopyGen);
    $('#copy-gencopy').addEventListener('click', onCopyGenCopy);
    $('#copy-fill').addEventListener('click', onCopyFill);
    $('#copy-series').addEventListener('input', () => { D().copy.series = $('#copy-series').value; save(); });
    $('#copy-title').addEventListener('input', () => { D().copy.title = $('#copy-title').value; save(); });
    $('#copy-body').addEventListener('input', () => { D().copy.body = $('#copy-body').value; save(); });
    $('#copy-tags').addEventListener('input', () => { D().copy.tags = $('#copy-tags').value; save(); });
    $('#copy-all').addEventListener('click', () => { const c = D().copy; const t = [c.title, c.body, c.tags].filter(Boolean).join('\n\n'); if (!t) { alert('还没有文案，先生成或填写'); return; } copyText(t).then((ok) => { if (ok) flash('文案已复制（标题+正文+标签）'); else window.prompt('复制下面文案：', t); }); });
    $('#btn-ai-open').addEventListener('click', onOpenClaude);
    $('#btn-ai-copy').addEventListener('click', onCopyPrompt);
    $('#btn-ai-fill').addEventListener('click', onFill);
    const lbl = $('#set-label'); lbl.value = D().brandLabel; lbl.addEventListener('input', () => { D().brandLabel = lbl.value; touch(); });
    const lblSize = $('#set-label-size'); lblSize.value = D().brandLabelSize; lblSize.addEventListener('input', () => { D().brandLabelSize = num(lblSize.value, 24); touch(); });
    $('#set-label-x').addEventListener('input', () => { D().brandLabelOffsetX = num($('#set-label-x').value, 0); touch(); });
    $('#set-label-y').addEventListener('input', () => { D().brandLabelOffsetY = num($('#set-label-y').value, 0); touch(); });
    $('#set-label-reset').addEventListener('click', () => { D().brandLabelOffsetX = 0; D().brandLabelOffsetY = 0; $('#set-label-x').value = 0; $('#set-label-y').value = 0; touch(); flash('已复原栏目名位置'); });
    const colMap = { 'col-accent': 'accent', 'col-title': 'title', 'col-heading': 'heading', 'col-ink': 'ink' };
    Object.keys(colMap).forEach((id) => { $('#' + id).addEventListener('input', () => { D().colors[colMap[id]] = $('#' + id).value; touch(); }); });
    $('#col-reset').addEventListener('click', () => { D().colors = { accent: '', title: '', heading: '', ink: '' }; refreshSettingsUI(); touch(); flash('已恢复默认配色'); });
    const slInit = () => { $('#set-slogan-size').value = D().sloganSize; $('#set-slogan-x').value = D().sloganOffsetX; $('#set-slogan-y').value = D().sloganOffsetY; };
    slInit();
    const slSync = (id, key) => $(id).addEventListener('input', () => { D()[key] = num($(id).value, key === 'sloganSize' ? 24 : 0); touch(); });
    slSync('#set-slogan-size', 'sloganSize'); slSync('#set-slogan-x', 'sloganOffsetX'); slSync('#set-slogan-y', 'sloganOffsetY');
    $('#set-slogan-reset').addEventListener('click', () => { D().sloganSize = 24; D().sloganOffsetX = 0; D().sloganOffsetY = 0; slInit(); touch(); flash('已复原标语'); });
    const ft = $('#set-footer'); ft.value = D().footerNote; ft.addEventListener('input', () => { D().footerNote = ft.value; touch(); });
    const ftP = $('#set-footer-preset'); ftP.addEventListener('change', () => { const v = ftP.value; ftP.value = ''; if (v === '') return; const t = FOOTER_PRESETS[v] || ''; D().footerNote = t; ft.value = t; touch(); });
    const fontSel = $('#set-font'); fontSel.value = D().coverFont; fontSel.addEventListener('change', () => { D().coverFont = fontSel.value; ensureWebFont(fontSel.value); touch(); });

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
    populateFontSelects();
    wire(); wireCanvas(); wireLogoEditor();
    $('#btn-copy-other').addEventListener('click', copyToOther);
    setUiColor(state.uiColor);
    refreshSettingsUI();
    noteify();
    renderEditors(); renderPreview(); loadAssets();
    histInit();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
