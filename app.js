(function () {
  'use strict';

  const LS_KEY = 'redgreen:v1';
  const CARD_W = 540, CARD_H = 720, EXPORT_SCALE = 2;
  const DISP_W = 250; // 预览卡显示宽度（设计 540 → 缩放显示）
  const TYPE_LABEL = { cover: '封面', list: '列表', detail: '详情', policy: '政策', text: '文本' };

  let logoDataUri = null;
  let cssCache = null;

  // ---------------- 工具 ----------------
  const $ = (s) => document.querySelector(s);
  function mk(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  function str(v, d) { return v == null ? d : String(v); }
  function toStrArr(v, d) { return Array.isArray(v) ? v.map((x) => String(x)) : d; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function uid() { return 'p' + Math.random().toString(36).slice(2, 9); }

  // ---------------- 状态 ----------------
  function defaultPage(type) {
    const base = { id: uid(), type };
    switch (type) {
      case 'cover': return Object.assign(base, { title: '南京理工大学\n春季开课', subtitle: '2026 年 1 月', footer: '' });
      case 'list': return Object.assign(base, { heading: '本期项目一览', items: [{ name: '项目名称', note: '一句话说明' }] });
      case 'detail': return Object.assign(base, { project: '项目名称', requirements: ['要求一', '要求二'] });
      case 'policy': return Object.assign(base, { title: '政策标题', points: ['要点一'] });
      case 'text': return Object.assign(base, { title: '标题', body: '正文内容……' });
      default: return null;
    }
  }

  function freshState() { return { platform: 'xhs', pages: [defaultPage('cover')] }; }

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(LS_KEY));
      if (!s || !Array.isArray(s.pages)) return freshState();
      if (s.platform !== 'xhs' && s.platform !== 'xls') s.platform = 'xhs';
      return s;
    } catch { return freshState(); }
  }

  let state = loadState();
  function save() { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} }

  // 文本改动：存盘 + 刷新预览（不重建编辑器，保持输入焦点）
  function touch() { save(); renderPreview(); }
  // 结构改动：存盘 + 重建编辑器 + 刷新预览
  function restructure() { save(); renderEditors(); renderPreview(); }

  // ---------------- 模板 HTML（注意 <img/> 自闭合，导出走 XML 解析） ----------------
  function logoHTML() {
    if (logoDataUri) return `<img class="logo-img" src="${logoDataUri}" alt="logo" />`;
    return `<span class="logo-fallback">LOGO</span>`;
  }
  function templateHTML(p) {
    switch (p.type) {
      case 'cover':
        return `<div class="tpl-cover">
            <div class="cover-logo">${logoHTML()}</div>
            <div class="cover-spacer"></div>
            <h1 class="cover-title">${esc(p.title)}</h1>
            ${p.subtitle ? `<div class="cover-sub">${esc(p.subtitle)}</div>` : ''}
            ${p.footer ? `<div class="cover-footer">${esc(p.footer)}</div>` : ''}
          </div>`;
      case 'list':
        return `<div class="tpl-list pad">
            <span class="kicker">${esc(p.heading || '项目一览')}</span>
            <div class="list-items">
              ${(p.items || []).map((it, i) => `
                <div class="list-item">
                  <div class="li-num">${i + 1}</div>
                  <div class="li-text">
                    <div class="li-name">${esc(it.name)}</div>
                    ${it.note ? `<div class="li-note">${esc(it.note)}</div>` : ''}
                  </div>
                </div>`).join('')}
            </div>
          </div>`;
      case 'detail':
        return `<div class="tpl-detail pad">
            <span class="kicker">项目详情</span>
            <h2 class="big-title">${esc(p.project)}</h2>
            <div class="detail-reqs">
              ${(p.requirements || []).map((r) => `<div class="req"><span class="tick">✓</span><span>${esc(r)}</span></div>`).join('')}
            </div>
          </div>`;
      case 'policy':
        return `<div class="tpl-policy pad">
            <span class="kicker">政策更新</span>
            <h2 class="big-title">${esc(p.title)}</h2>
            <div class="policy-points">
              ${(p.points || []).map((pt) => `<div class="pt">${esc(pt)}</div>`).join('')}
            </div>
          </div>`;
      case 'text':
        return `<div class="tpl-text pad">
            <h2 class="big-title">${esc(p.title)}</h2>
            <div class="text-body">${esc(p.body)}</div>
          </div>`;
      default: return '';
    }
  }

  function buildCard(page) {
    const card = mk('div', 'page-card');
    card.innerHTML = templateHTML(page);
    return card;
  }

  // ---------------- 预览 ----------------
  function renderPreview() {
    const list = $('#preview-list');
    list.innerHTML = '';
    const scale = DISP_W / CARD_W;
    state.pages.forEach((page, i) => {
      const frame = mk('div', 'page-frame');
      frame.style.width = DISP_W + 'px';
      frame.style.height = (CARD_H * scale) + 'px';

      const card = buildCard(page);
      card.style.transform = `scale(${scale})`;
      frame.appendChild(card);

      const num = mk('div', 'page-pagenum');
      num.textContent = (i + 1) + '/' + state.pages.length;
      frame.appendChild(num);

      const dl = mk('button', 'btn btn-sm dl-this');
      dl.textContent = '下载';
      dl.addEventListener('click', () => exportPage(i));
      frame.appendChild(dl);

      list.appendChild(frame);
    });
    $('#preview-empty').style.display = state.pages.length ? 'none' : 'block';
  }

  // ---------------- 编辑器 ----------------
  function label(t) { const l = mk('span', 'field-label'); l.textContent = t; return l; }
  function fieldText(labelText, value, on, placeholder) {
    const wrap = mk('div');
    wrap.appendChild(label(labelText));
    const inp = mk('input', 'inp', { type: 'text' });
    inp.value = value || '';
    if (placeholder) inp.placeholder = placeholder;
    inp.addEventListener('input', () => on(inp.value));
    wrap.appendChild(inp);
    return wrap;
  }
  function fieldArea(labelText, value, on, rows) {
    const wrap = mk('div');
    wrap.appendChild(label(labelText));
    const ta = mk('textarea', 'ta');
    ta.rows = rows || 3;
    ta.value = value || '';
    ta.addEventListener('input', () => on(ta.value));
    wrap.appendChild(ta);
    return wrap;
  }

  function listItemsEditor(page) {
    const box = mk('div');
    page.items.forEach((it, idx) => {
      const row = mk('div', 'repeat-item');
      const name = mk('input', 'inp', { type: 'text' });
      name.value = it.name || ''; name.placeholder = '项目名';
      name.addEventListener('input', () => { it.name = name.value; touch(); });
      const note = mk('input', 'inp', { type: 'text' });
      note.value = it.note || ''; note.placeholder = '一句话说明';
      note.addEventListener('input', () => { it.note = note.value; touch(); });
      const del = mk('button', 'icon-btn'); del.textContent = '✕'; del.title = '删除这条';
      del.addEventListener('click', () => { page.items.splice(idx, 1); restructure(); });
      row.append(name, note, del);
      box.appendChild(row);
    });
    const add = mk('button', 'btn btn-sm repeat-add'); add.textContent = '+ 加一条';
    add.addEventListener('click', () => { page.items.push({ name: '', note: '' }); restructure(); });
    box.appendChild(add);
    return box;
  }

  function stringListEditor(arr, placeholder) {
    const box = mk('div');
    arr.forEach((val, idx) => {
      const row = mk('div', 'repeat-item');
      const inp = mk('input', 'inp', { type: 'text' });
      inp.value = val || ''; inp.placeholder = placeholder;
      inp.addEventListener('input', () => { arr[idx] = inp.value; touch(); });
      const del = mk('button', 'icon-btn'); del.textContent = '✕'; del.title = '删除这条';
      del.addEventListener('click', () => { arr.splice(idx, 1); restructure(); });
      row.append(inp, del);
      box.appendChild(row);
    });
    const add = mk('button', 'btn btn-sm repeat-add'); add.textContent = '+ 加一条';
    add.addEventListener('click', () => { arr.push(''); restructure(); });
    box.appendChild(add);
    return box;
  }

  function editorBody(page) {
    const b = mk('div', 'pe-body');
    switch (page.type) {
      case 'cover':
        b.appendChild(fieldArea('大标题（换行用回车）', page.title, (v) => { page.title = v; touch(); }, 2));
        b.appendChild(fieldText('副标题 / 日期', page.subtitle, (v) => { page.subtitle = v; touch(); }));
        b.appendChild(fieldText('脚注（可空）', page.footer, (v) => { page.footer = v; touch(); }));
        break;
      case 'list':
        b.appendChild(fieldText('小标题', page.heading, (v) => { page.heading = v; touch(); }));
        b.appendChild(label('条目'));
        b.appendChild(listItemsEditor(page));
        break;
      case 'detail':
        b.appendChild(fieldText('项目名', page.project, (v) => { page.project = v; touch(); }));
        b.appendChild(label('要求清单'));
        b.appendChild(stringListEditor(page.requirements, '一条要求'));
        break;
      case 'policy':
        b.appendChild(fieldText('政策标题', page.title, (v) => { page.title = v; touch(); }));
        b.appendChild(label('要点'));
        b.appendChild(stringListEditor(page.points, '一条要点'));
        break;
      case 'text':
        b.appendChild(fieldText('标题', page.title, (v) => { page.title = v; touch(); }));
        b.appendChild(fieldArea('正文', page.body, (v) => { page.body = v; touch(); }, 5));
        break;
    }
    return b;
  }

  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= state.pages.length) return;
    const t = state.pages[i]; state.pages[i] = state.pages[j]; state.pages[j] = t;
    restructure();
  }

  function renderEditors() {
    const root = $('#page-editors');
    root.innerHTML = '';
    state.pages.forEach((page, i) => {
      const card = mk('div', 'pe-card');
      const head = mk('div', 'pe-head');
      const type = mk('span', 'pe-type');
      type.innerHTML = `<span class="dot"></span>${TYPE_LABEL[page.type] || page.type}`;
      const idx = mk('span', 'pe-idx'); idx.textContent = '第 ' + (i + 1) + ' 页';
      const sp = mk('span', 'spacer');
      const up = mk('button', 'icon-btn'); up.textContent = '↑'; up.title = '上移'; up.disabled = i === 0;
      up.addEventListener('click', () => move(i, -1));
      const dn = mk('button', 'icon-btn'); dn.textContent = '↓'; dn.title = '下移'; dn.disabled = i === state.pages.length - 1;
      dn.addEventListener('click', () => move(i, 1));
      const del = mk('button', 'icon-btn btn-danger'); del.textContent = '删除';
      del.addEventListener('click', () => {
        if (confirm('删除第 ' + (i + 1) + ' 页？')) { state.pages.splice(i, 1); restructure(); }
      });
      head.append(type, idx, sp, up, dn, del);
      card.appendChild(head);
      card.appendChild(editorBody(page));
      root.appendChild(card);
    });
  }

  // ---------------- AI（深链接 + 复制提示词） ----------------
  function buildPrompt(raw) {
    return [
      '你是中文图文排版助手。请把下面的学校信息整理成多页图文卡片的结构化数据。',
      '严格要求：只输出一个 JSON 对象，不要任何解释文字，不要 markdown 代码块围栏。',
      'JSON 结构如下（pages 是有序数组，按需选用页面类型，可重复）：',
      '{',
      '  "pages": [',
      '    {"type":"cover","title":"封面大标题(可用\\n换行)","subtitle":"副标题或日期","footer":"可选脚注"},',
      '    {"type":"list","heading":"小标题","items":[{"name":"项目名","note":"一句话说明"}]},',
      '    {"type":"detail","project":"项目名","requirements":["要求一","要求二"]},',
      '    {"type":"policy","title":"政策标题","points":["要点一","要点二"]},',
      '    {"type":"text","title":"标题","body":"正文"}',
      '  ]',
      '}',
      '整理规则：第一页一般是 cover；若有多个项目，第二页用 list 概览，随后每个项目各一页 detail；',
      '内容必须基于下面原文，不要编造，不要遗漏关键信息（时间、地点、报名方式、要求）。',
      '原文：',
      '"""',
      raw,
      '"""',
    ].join('\n');
  }

  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(t).then(() => true).catch(() => false);
      }
    } catch {}
    return Promise.resolve(false);
  }

  function onOpenClaude() {
    const raw = $('#ai-raw').value.trim();
    if (!raw) { alert('先把官网原文粘到上面的框里'); return; }
    const url = 'claude://claude.ai/new?q=' + encodeURIComponent(buildPrompt(raw));
    window.open(url, '_blank', 'noopener');
  }
  function onCopyPrompt() {
    const raw = $('#ai-raw').value.trim();
    if (!raw) { alert('先把官网原文粘到上面的框里'); return; }
    const p = buildPrompt(raw);
    copyText(p).then((ok) => { if (ok) flash('已复制提示词，去 Claude 里粘贴'); else window.prompt('复制下面这段，去 Claude 里粘贴：', p); });
  }

  function parseDeckJSON(text) {
    let t = text.trim();
    t = t.replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    const obj = JSON.parse(t);
    const pages = Array.isArray(obj) ? obj : obj.pages;
    if (!Array.isArray(pages)) throw new Error('没有找到 pages 数组');
    return pages.map(normalizePage).filter(Boolean);
  }
  function normalizePage(p) {
    if (!p || !TYPE_LABEL[p.type]) return null;
    const base = defaultPage(p.type);
    switch (p.type) {
      case 'cover':
        base.title = str(p.title, base.title); base.subtitle = str(p.subtitle, ''); base.footer = str(p.footer, ''); break;
      case 'list':
        base.heading = str(p.heading, base.heading);
        base.items = Array.isArray(p.items) ? p.items.map((it) => ({ name: str(it && it.name, ''), note: str(it && it.note, '') })) : base.items;
        break;
      case 'detail':
        base.project = str(p.project, base.project); base.requirements = toStrArr(p.requirements, base.requirements); break;
      case 'policy':
        base.title = str(p.title, base.title); base.points = toStrArr(p.points, base.points); break;
      case 'text':
        base.title = str(p.title, base.title); base.body = str(p.body, ''); break;
    }
    return base;
  }
  function onFill() {
    const text = $('#ai-result').value;
    if (!text.trim()) { alert('先把 Claude 返回的 JSON 粘到下面的框里'); return; }
    let pages;
    try { pages = parseDeckJSON(text); }
    catch (e) {
      alert('解析失败：' + e.message + '\n\n请确认粘贴的是完整 JSON（以 { 开头、} 结尾）。原文已保留，可手动修整后重试。');
      return;
    }
    if (!pages.length) { alert('没解析到任何有效页面。'); return; }
    state.pages = pages;
    restructure();
    flash('已填入 ' + pages.length + ' 页');
  }

  // ---------------- 导出（自包含：SVG foreignObject → canvas → PNG） ----------------
  async function getCSS() {
    if (cssCache != null) return cssCache;
    const files = ['themes.css', 'styles.css'];
    const parts = await Promise.all(files.map((f) => fetch(f, { cache: 'no-store' }).then((r) => r.text()).catch(() => '')));
    cssCache = parts.join('\n');
    return cssCache;
  }

  async function pageToPng(page) {
    const css = await getCSS();
    const inner = `<div class="page-card" style="width:${CARD_W}px;height:${CARD_H}px;transform:none;">${templateHTML(page)}</div>`;
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}">` +
      `<foreignObject x="0" y="0" width="${CARD_W}" height="${CARD_H}">` +
      `<div xmlns="http://www.w3.org/1999/xhtml" class="export-root" data-platform="${state.platform}" ` +
      `style="width:${CARD_W}px;height:${CARD_H}px;">` +
      `<style><![CDATA[${css}]]></style>` +
      inner +
      `</div></foreignObject></svg>`;

    const img = new Image();
    img.decoding = 'sync';
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('图片渲染失败'));
      img.src = url;
    });

    const canvas = mk('canvas');
    canvas.width = CARD_W * EXPORT_SCALE;
    canvas.height = CARD_H * EXPORT_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = mk('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function exportPage(i) {
    try {
      const url = await pageToPng(state.pages[i]);
      downloadDataUrl(url, `${state.platform}-${String(i + 1).padStart(2, '0')}.png`);
    } catch (e) { alert('导出失败：' + e.message); }
  }
  async function exportAll() {
    if (!state.pages.length) { alert('还没有页面'); return; }
    const btn = $('#btn-download-all');
    btn.disabled = true; const old = btn.textContent; btn.textContent = '导出中…';
    try {
      for (let i = 0; i < state.pages.length; i++) {
        const url = await pageToPng(state.pages[i]);
        downloadDataUrl(url, `${state.platform}-${String(i + 1).padStart(2, '0')}.png`);
        await sleep(300);
      }
      flash('已逐张下载 ' + state.pages.length + ' 张');
    } catch (e) { alert('导出失败：' + e.message); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  // ---------------- 平台切换 ----------------
  function setPlatform(p) {
    state.platform = p;
    document.documentElement.dataset.platform = p;
    document.querySelectorAll('.plat-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.platform === p));
    save();
    renderPreview();
  }

  // ---------------- 提示条 ----------------
  function flash(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = mk('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(flash._t);
    flash._t = setTimeout(() => t.classList.remove('show'), 1700);
  }

  // ---------------- logo ----------------
  async function loadLogo() {
    const candidates = ['assets/logo.svg', 'assets/logo.png'];
    for (const url of candidates) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) continue;
        if (/\.svg($|\?)/i.test(url)) {
          const txt = await r.text();
          logoDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
        } else {
          const blob = await r.blob();
          logoDataUri = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
        }
        return;
      } catch {}
    }
  }

  // ---------------- 事件绑定 ----------------
  function wire() {
    document.querySelectorAll('.plat-btn').forEach((b) => b.addEventListener('click', () => setPlatform(b.dataset.platform)));
    document.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      state.pages.push(defaultPage(b.dataset.add));
      restructure();
    }));
    $('#btn-download-all').addEventListener('click', exportAll);
    $('#btn-ai-open').addEventListener('click', onOpenClaude);
    $('#btn-ai-copy').addEventListener('click', onCopyPrompt);
    $('#btn-ai-fill').addEventListener('click', onFill);
  }

  function init() {
    document.documentElement.dataset.platform = state.platform;
    document.querySelectorAll('.plat-btn').forEach((b) => b.classList.toggle('is-active', b.dataset.platform === state.platform));
    wire();
    renderEditors();
    renderPreview();
    loadLogo().then(() => renderPreview());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
