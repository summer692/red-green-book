'use strict';

/* =============================================================================
 * 微信公众号「草稿箱直连」服务端  (server.js)
 * -----------------------------------------------------------------------------
 * 作用：接收前端（静态站点）POST 过来的【图片 base64 + 标题/正文/标签】，
 *       依次完成「上传图片 -> 上传永久封面缩略图 -> 新增草稿」，把图文塞进
 *       公众号草稿箱。
 *
 * 为什么必须跑在「有固定 IP 的 VPS」上（不能放 Vercel）：
 *   1) 微信「新增草稿 / 上传素材」接口要求：已认证服务号 + AppID/AppSecret，
 *      access_token 必须由服务端用密钥换取并缓存（约 2 小时过期）。
 *   2) 微信要求【调用方服务器出口 IP 在公众号后台的「IP 白名单」里】。
 *      Vercel Serverless 没有固定出口 IP，过不了白名单 —— 所以本服务要部署在
 *      一台出口 IP 固定的 VPS（或固定 IP 代理 / NAT 网关）后面。
 *   3) 密钥（AppSecret）只能放服务端，浏览器不能直连微信（CORS + 密钥安全）。
 *
 * -----------------------------------------------------------------------------
 * 微信素材分三类，本服务用到的接口与「临时 / 永久」区分（务必看清，最易踩坑）：
 *
 *   A) 图文正文里【内嵌的图片】  ->  接口 media/uploadimg
 *      - 返回一个微信域名下的图片 URL（mmbiz.qpic.cn/...）。
 *      - 该 URL 只能用在图文正文 content 的 <img> 里，不占用素材库，不算永久素材。
 *      - 这就是“正文配图”的正确做法。
 *
 *   B) 草稿封面缩略图 thumb_media_id  ->  必须是【永久图片素材】
 *      - 接口 material/add_material?type=image
 *      - 返回 media_id（永久），这个 media_id 才能填进 draft 的 thumb_media_id。
 *      - 注意：临时素材（media/upload，3 天过期）的 media_id 不能当封面，会报错。
 *
 *   C) 新增草稿  ->  接口 draft/add
 *      - articles[].thumb_media_id = (B) 拿到的永久 media_id
 *      - articles[].content        = HTML，里面的 <img src> 用 (A) 拿到的 URL
 *
 * -----------------------------------------------------------------------------
 * 常见 errcode（以微信官方最新文档为准，这里只列高频原因）：
 *   40001  access_token 无效 / 过期 / 取错了（AppSecret 不对、或缓存未刷新）
 *   40164 / 41030 / "invalid ip ... not in whitelist"
 *          -> 当前出口 IP 不在公众号「IP 白名单」里（最常见，务必把 VPS 公网
 *             出口 IP 加进后台白名单；多 IP / 出口漂移会反复触发）
 *   45009  接口调用频率超限
 *   40007  media_id 不合法（典型：把临时素材 media_id 当封面用了）
 *   53404  账号未认证 / 无该接口权限（必须是已认证服务号）
 *   45028  草稿数量达到上限
 *   48001  api 功能未授权（公众号类型不支持，需要认证服务号）
 *
 * -----------------------------------------------------------------------------
 * 运行：  WX_APPID=xxx WX_SECRET=yyy node server.js
 * 依赖：  仅 Node 内置模块（http / https / crypto / fs），无需 npm install。
 * 详见同目录 README.md。
 * ===========================================================================*/

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// 配置（全部来自环境变量，禁止把真实密钥写进代码）
// ---------------------------------------------------------------------------
const CONFIG = {
  appid: process.env.WX_APPID || '',
  secret: process.env.WX_SECRET || '',
  port: parseInt(process.env.PORT || '8787', 10),
  // 简单访问口令：前端请求头带 x-access-token: <ACCESS_TOKEN> 才放行。
  // 留空则不校验（仅建议在内网调试时留空，公网务必设置）。
  accessPassword: process.env.ACCESS_PASSWORD || '',
  // 允许的前端来源（CORS）。设为 '*' 放开，或填你的静态站点域名。
  allowOrigin: process.env.ALLOW_ORIGIN || '*',
  // access_token 缓存文件，避免重启后重复换取（微信对换取频率也有限制）。
  tokenCacheFile: path.join(__dirname, '.wx_token_cache.json'),
};

const WX_API = 'https://api.weixin.qq.com';

// ---------------------------------------------------------------------------
// 小工具：发起 https 请求（GET / POST JSON / POST 原始 buffer）
// ---------------------------------------------------------------------------
function httpsRequest(urlStr, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function wxGetJson(urlStr) {
  const { buffer } = await httpsRequest(urlStr, { method: 'GET' });
  return JSON.parse(buffer.toString('utf8'));
}

async function wxPostJson(urlStr, obj) {
  // 注意：微信要求 POST body 里的中文保持 UTF-8、不要被转义成 \uXXXX 也可，
  // 但安全起见用 Buffer 计算正确的 Content-Length。
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  const { buffer } = await httpsRequest(urlStr, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    body,
  });
  return JSON.parse(buffer.toString('utf8'));
}

// ---------------------------------------------------------------------------
// 上传文件（multipart/form-data）——微信素材类接口都用这种方式上传图片
// ---------------------------------------------------------------------------
function buildMultipart(fieldName, filename, contentType, fileBuffer) {
  const boundary = '----wxdraft' + crypto.randomBytes(12).toString('hex');
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
    'utf8'
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  return { boundary, body: Buffer.concat([head, fileBuffer, tail]) };
}

async function wxUploadFile(urlStr, filename, contentType, fileBuffer) {
  const { boundary, body } = buildMultipart('media', filename, contentType, fileBuffer);
  const { buffer } = await httpsRequest(urlStr, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length,
    },
    body,
  });
  return JSON.parse(buffer.toString('utf8'));
}

// ---------------------------------------------------------------------------
// access_token：获取 + 缓存（内存 + 文件），过期自动刷新
//   微信 access_token 全局唯一、约 7200 秒有效，频繁换取会被限流，必须缓存。
// ---------------------------------------------------------------------------
let memToken = null; // { token, expireAt }

function loadTokenFromFile() {
  try {
    const raw = fs.readFileSync(CONFIG.tokenCacheFile, 'utf8');
    const obj = JSON.parse(raw);
    if (obj && obj.token && obj.expireAt) return obj;
  } catch (_) {
    /* 文件不存在或损坏，忽略 */
  }
  return null;
}

function saveTokenToFile(obj) {
  try {
    fs.writeFileSync(CONFIG.tokenCacheFile, JSON.stringify(obj), { mode: 0o600 });
  } catch (e) {
    console.warn('[token] 写缓存文件失败（不影响运行）：', e.message);
  }
}

async function getAccessToken(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh) {
    if (memToken && memToken.expireAt > now) return memToken.token;
    const fileTok = loadTokenFromFile();
    if (fileTok && fileTok.expireAt > now) {
      memToken = fileTok;
      return fileTok.token;
    }
  }
  if (!CONFIG.appid || !CONFIG.secret) {
    throw new Error('缺少 WX_APPID / WX_SECRET 环境变量');
  }
  const url = `${WX_API}/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
    CONFIG.appid
  )}&secret=${encodeURIComponent(CONFIG.secret)}`;
  const res = await wxGetJson(url);
  if (!res.access_token) {
    // 这里最常见就是 40164 / IP 白名单错误，或 AppSecret 写错。
    throw new Error(`获取 access_token 失败: ${JSON.stringify(res)}`);
  }
  // 提前 5 分钟过期，留出刷新缓冲。
  const expireAt = now + (res.expires_in - 300) * 1000;
  memToken = { token: res.access_token, expireAt };
  saveTokenToFile(memToken);
  return memToken.token;
}

// 包一层：遇到 40001（token 失效）时强制刷新重试一次。
async function withToken(fn) {
  let token = await getAccessToken(false);
  let result = await fn(token);
  if (result && (result.errcode === 40001 || result.errcode === 42001)) {
    token = await getAccessToken(true);
    result = await fn(token);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 微信业务接口封装
// ---------------------------------------------------------------------------

// (A) 上传图文正文内嵌图片 -> 返回可用于 <img src> 的 URL，不占素材库。
async function uploadContentImage(imgBuffer, filename) {
  return withToken(async (token) => {
    const url = `${WX_API}/cgi-bin/media/uploadimg?access_token=${token}`;
    const res = await wxUploadFile(url, filename, guessContentType(filename), imgBuffer);
    return res; // { url } 或 { errcode, errmsg }
  });
}

// (B) 上传【永久】图片素材 -> 返回 media_id，用作草稿封面 thumb_media_id。
async function uploadPermanentImage(imgBuffer, filename) {
  return withToken(async (token) => {
    const url = `${WX_API}/cgi-bin/material/add_material?access_token=${token}&type=image`;
    const res = await wxUploadFile(url, filename, guessContentType(filename), imgBuffer);
    return res; // { media_id, url } 或 { errcode, errmsg }
  });
}

// (C) 新增草稿 -> 返回 media_id（草稿的 id）。
async function addDraft(article) {
  return withToken(async (token) => {
    const url = `${WX_API}/cgi-bin/draft/add?access_token=${token}`;
    const res = await wxPostJson(url, { articles: [article] });
    return res; // { media_id } 或 { errcode, errmsg }
  });
}

function guessContentType(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  return 'image/png';
}

// 把前端传来的 dataURL（data:image/png;base64,xxxx）或纯 base64 解析成 Buffer。
function decodeImage(input) {
  if (typeof input !== 'string') throw new Error('图片字段必须是字符串');
  let base64 = input;
  let ext = 'png';
  const m = /^data:image\/(png|jpe?g|gif);base64,(.*)$/i.exec(input);
  if (m) {
    ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    base64 = m[2];
  }
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('图片解码后为空');
  return { buffer, ext };
}

// 把标题/正文/标签 + 图片 URL 列表组装成图文正文 HTML。
function buildArticleHTML(body, tags, imageUrls) {
  const parts = [];
  // 正文（保留换行）
  if (body && body.trim()) {
    const safe = escapeHtml(body).replace(/\n/g, '<br>');
    parts.push(`<p>${safe}</p>`);
  }
  // 把所有图片插进正文（居中显示）
  imageUrls.forEach((u) => {
    parts.push(
      `<p style="text-align:center;"><img src="${u}" style="max-width:100%;height:auto;"/></p>`
    );
  });
  // 标签放最后（公众号正文不支持小红书式话题，这里用纯文本呈现）
  if (tags && tags.trim()) {
    parts.push(`<p>${escapeHtml(tags)}</p>`);
  }
  return parts.join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// 核心流程：/publish
// 请求体（JSON）：
//   {
//     "title":  "标题（必填，<=64字）",
//     "body":   "正文",
//     "tags":   "标签文本（可选）",
//     "author": "作者（可选）",
//     "digest": "摘要（可选，留空微信自动取正文前54字）",
//     "images": ["data:image/png;base64,....", "...."]   // 第 1 张做封面
//   }
// ---------------------------------------------------------------------------
async function handlePublish(payload) {
  const title = (payload.title || '').trim();
  const body = payload.body || '';
  const tags = payload.tags || '';
  const images = Array.isArray(payload.images) ? payload.images : [];

  if (!title) throw new HttpError(400, '缺少标题 title');
  if (!images.length) throw new HttpError(400, '至少需要一张图片 images');

  // 1) 第一张图 -> 永久素材，做封面 thumb_media_id
  const cover = decodeImage(images[0]);
  const coverRes = await uploadPermanentImage(cover.buffer, `cover.${cover.ext}`);
  if (coverRes.errcode) {
    throw new HttpError(502, `上传封面（永久素材）失败: ${coverRes.errcode} ${coverRes.errmsg || ''}`);
  }
  const thumbMediaId = coverRes.media_id;

  // 2) 所有图片 -> 正文内嵌图片 URL（uploadimg）
  const imageUrls = [];
  for (let i = 0; i < images.length; i++) {
    const img = decodeImage(images[i]);
    const r = await uploadContentImage(img.buffer, `page${i + 1}.${img.ext}`);
    if (r.errcode || !r.url) {
      throw new HttpError(502, `上传正文图片第${i + 1}张失败: ${r.errcode || ''} ${r.errmsg || JSON.stringify(r)}`);
    }
    imageUrls.push(r.url);
  }

  // 3) 组装图文并新增草稿
  const article = {
    title: title.slice(0, 64), // 微信标题上限 64 字
    author: payload.author || '',
    digest: (payload.digest || '').slice(0, 120), // 摘要上限 120 字，留空微信自动生成
    content: buildArticleHTML(body, tags, imageUrls),
    content_source_url: payload.sourceUrl || '',
    thumb_media_id: thumbMediaId,
    need_open_comment: 0,
    only_fans_can_comment: 0,
  };

  const draftRes = await addDraft(article);
  if (draftRes.errcode) {
    throw new HttpError(502, `新增草稿失败: ${draftRes.errcode} ${draftRes.errmsg || ''}`);
  }

  return {
    ok: true,
    draftMediaId: draftRes.media_id,
    thumbMediaId,
    imageCount: imageUrls.length,
    message: '已写入草稿箱，请到公众号后台「草稿箱」查看并发布',
  };
}

// ---------------------------------------------------------------------------
// HTTP 服务
// ---------------------------------------------------------------------------
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', CONFIG.allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-access-token');
}

function sendJson(res, status, obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8');
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': body.length });
  res.end(body);
}

function readBody(req, maxBytes = 30 * 1024 * 1024) {
  // 默认上限 30MB（多张高清 PNG base64 会比较大，按需调整）。
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new HttpError(413, '请求体过大，请压缩图片或减少张数'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function checkPassword(req) {
  if (!CONFIG.accessPassword) return true; // 未设置则不校验
  return req.headers['x-access-token'] === CONFIG.accessPassword;
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 健康检查
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, service: 'wechat-draft', time: Date.now() });
    return;
  }

  if (req.method === 'POST' && req.url === '/publish') {
    try {
      if (!checkPassword(req)) {
        sendJson(res, 401, { ok: false, error: '访问口令不正确（x-access-token）' });
        return;
      }
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch (_) {
        throw new HttpError(400, '请求体不是合法 JSON');
      }
      const result = await handlePublish(payload);
      sendJson(res, 200, result);
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      console.error('[publish] 失败:', e.message);
      sendJson(res, status, { ok: false, error: e.message });
    }
    return;
  }

  sendJson(res, 404, { ok: false, error: 'Not Found' });
});

server.listen(CONFIG.port, () => {
  console.log(`[wechat-draft] 监听端口 ${CONFIG.port}`);
  if (!CONFIG.appid || !CONFIG.secret) {
    console.warn('[wechat-draft] 警告：未设置 WX_APPID / WX_SECRET，/publish 会失败');
  }
  if (!CONFIG.accessPassword) {
    console.warn('[wechat-draft] 警告：未设置 ACCESS_PASSWORD，/publish 处于无口令保护状态');
  }
});
