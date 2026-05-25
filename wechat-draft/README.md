# 微信公众号「草稿箱直连」服务端

把静态站点（红绿书 / index.html）导出的 **图片 + 标题/正文/标签** 直接推进你自己的
**微信公众号草稿箱**，省掉「下载图片 → 手动上传」的步骤（类似秀米、创客贴绑定公众号后导入草稿）。

> 本目录只包含一个轻量 Node 服务（`server.js`）和本说明。它**独立于**仓库里的静态站点，
> 不依赖、也不修改 `index.html` / `app.js` / `styles.css` / `themes.css`。

> ⚠️ 接口字段、errcode、频率限制等可能随微信文档更新，**一切以微信官方最新文档为准**：
> 微信公众平台「开发 → 接口文档 → 素材管理 / 草稿箱」。

---

## 一、前置条件（缺一不可）

1. **一个已认证的「服务号」**。订阅号、未认证账号都拿不到草稿箱 / 素材管理接口权限
   （典型报错 `48001 api unauthorized` 或 `53404`）。个人主体一般无法认证服务号，
   通常需要企业 / 组织主体。
2. 在公众号后台「设置与开发 → 基本配置」拿到 **AppID** 和 **AppSecret**（Secret 只显示一次，妥善保存）。
3. **把运行本服务的 VPS 公网出口 IP 加入公众号后台的「IP 白名单」**
   （基本配置页面里「IP 白名单」一栏）。这是最容易踩的坑：不加白名单，连 `access_token`
   都换不到（报 `40164` / `invalid ip ... not in whitelist`）。
4. 一台**有固定公网 IP 的服务器（VPS）**，详见下面「为什么不能用 Vercel」。
5. 服务器装好 **Node.js（建议 18+）**。本服务**仅用 Node 内置模块**，默认零依赖、无需 `npm install`。

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `WX_APPID` | 是 | 公众号 AppID |
| `WX_SECRET` | 是 | 公众号 AppSecret（**只放服务器，绝不进前端 / 代码 / git**） |
| `PORT` | 否 | 监听端口，默认 `8787` |
| `ACCESS_PASSWORD` | 否（公网强烈建议设） | 访问口令；设置后前端请求需带请求头 `x-access-token: <口令>` |
| `ALLOW_ORIGIN` | 否 | CORS 允许来源，默认 `*`；生产建议填你的静态站点域名，如 `https://your-site.vercel.app` |

---

## 二、在 VPS 上跑起来

### 1. 上传代码
把整个 `wechat-draft/` 目录拷到 VPS（例如 `/opt/wechat-draft`）。只需要 `server.js`。

### 2. 直接启动（前台，调试用）
```bash
cd /opt/wechat-draft
WX_APPID=wx_你的appid \
WX_SECRET=你的appsecret \
ACCESS_PASSWORD=自己设一个长口令 \
ALLOW_ORIGIN=https://你的静态站点域名 \
PORT=8787 \
node server.js
```
启动后访问 `http://<VPS_IP>:8787/health` 应返回 `{"ok":true,...}`。

### 3.（可选）改用 express
本服务用 Node 内置 `http` 即可，不需要 express。如果你团队习惯 express，可自行改写路由；
那样需要：
```bash
npm init -y && npm install express
```
**默认实现无需任何 npm 安装**，保持朴素。

### 4. 常驻运行

**方式 A：pm2**
```bash
npm install -g pm2
WX_APPID=... WX_SECRET=... ACCESS_PASSWORD=... pm2 start server.js --name wechat-draft
pm2 save && pm2 startup   # 开机自启
```

**方式 B：systemd**，新建 `/etc/systemd/system/wechat-draft.service`：
```ini
[Unit]
Description=WeChat Draft Service
After=network.target

[Service]
WorkingDirectory=/opt/wechat-draft
ExecStart=/usr/bin/node /opt/wechat-draft/server.js
Restart=always
Environment=WX_APPID=wx_你的appid
Environment=WX_SECRET=你的appsecret
Environment=ACCESS_PASSWORD=自己设一个长口令
Environment=ALLOW_ORIGIN=https://你的静态站点域名
Environment=PORT=8787

[Install]
WantedBy=multi-user.target
```
然后：
```bash
systemctl daemon-reload
systemctl enable --now wechat-draft
systemctl status wechat-draft
```

### 5.（建议）放在 HTTPS 反向代理后
浏览器从 HTTPS 静态站点请求 HTTP 接口会被「混合内容」拦截。建议用 Nginx / Caddy 给本服务套一个域名 + HTTPS，
例如对外暴露 `https://api.你的域名.com/publish`，反代到本机 `127.0.0.1:8787`。
注意保持出口 IP 仍是白名单里那个。

---

## 三、前端如何对接

静态站点（浏览器端）拿到导出的图片 `dataURL`（`canvas.toDataURL('image/png')`）以及标题/正文/标签，
直接 `POST` 到本服务的 `/publish`。示例：

```js
// 在你的静态站点里调用（不要把 ACCESS_PASSWORD 硬编码到公开代码里，
// 可做成用户在页面输入框填写后存 localStorage）。
async function pushToWechatDraft({ title, body, tags, imageDataURLs }) {
  const ENDPOINT = 'https://api.你的域名.com/publish';
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 若服务端设置了 ACCESS_PASSWORD，则必须带上：
      'x-access-token': localStorage.getItem('wxDraftPassword') || '',
    },
    body: JSON.stringify({
      title,                 // 必填，<=64 字
      body,                  // 正文文本
      tags,                  // 标签文本（公众号无小红书式话题，按纯文本展示）
      images: imageDataURLs, // 数组，第 1 张作封面；如 ['data:image/png;base64,....', ...]
      // author / digest / sourceUrl 可选
    }),
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || '推送失败');
  return data; // { ok:true, draftMediaId, thumbMediaId, imageCount, message }
}

// 用法示例：
// const url = canvas.toDataURL('image/png');
// await pushToWechatDraft({ title:'标题', body:'正文', tags:'#标签', imageDataURLs:[url] });
// 成功后到公众号后台「草稿箱」即可看到，确认无误再点发布。
```

返回成功后，图文会出现在公众号后台「草稿箱」，**需要你人工到后台确认并点击「发布」**
（接口只负责写草稿，不自动群发）。

---

## 四、为什么不能用 Vercel（以及备选）

- 微信「换取 access_token / 上传素材 / 新增草稿」要求**调用方服务器出口 IP 在公众号 IP 白名单内**。
- **Vercel 的 Serverless Function 没有固定出口 IP**（每次冷启动 / 区域调度 IP 都可能变化），
  无法稳定加入白名单，因此**这套后端不能跑在 Vercel**。同理，多数无服务器平台（Netlify Functions、
  Cloudflare Workers 默认出口等）也不行。
- 解决办法：用一台**固定公网 IP 的 VPS**（阿里云 / 腾讯云 / 华为云轻量服务器等，国内节点对微信 API 访问更稳），
  把它的公网 IP 加进白名单。
- **如果你只想保留现有 Vercel 部署**：可以让静态站点照旧放 Vercel，仅把 `/publish` 这一个接口指向
  这台 VPS（前端 `fetch` 直接打 VPS 的域名即可，二者解耦）。
- **备选：固定 IP 代理 / NAT 网关**。若你的运行环境出口 IP 会漂移，可让所有出站请求经过一个
  **固定 IP 的正向代理 / NAT 网关**，把那个固定 IP 加白名单即可（本质还是「让出口 IP 固定且可白名单」）。

---

## 五、安全提醒

- **AppSecret 只放服务器环境变量**，绝不写进前端、不进 git、不打印到日志。
- 公网暴露的 `/publish` **务必设置 `ACCESS_PASSWORD`**，否则任何人都能往你草稿箱写东西。
  口令请用足够长的随机串，并通过 HTTPS 传输。
- 建议把 `ALLOW_ORIGIN` 收紧成你的站点域名，而不是 `*`。
- `access_token` 会缓存到本目录的 `.wx_token_cache.json`（权限 0600）。该文件含有效令牌，
  不要提交到 git、不要对外可读；建议在 `.gitignore` 里忽略它。
- 接口只写草稿、不自动发布，发布前请在后台人工核对（封面、排版、错别字）。

---

## 六、流程速览

```
前端(浏览器)
   |  POST /publish  { title, body, tags, images:[dataURL...] }
   v
server.js (固定IP VPS)
   1) getAccessToken()                     —— 用 AppID/Secret 换取并缓存(约2h)
   2) material/add_material (type=image)   —— 第1张图 => 永久素材 => thumb_media_id(封面)
   3) media/uploadimg  (每张图)            —— => 正文内嵌 <img> 用的 URL（不占素材库）
   4) draft/add                            —— 组装图文，写入草稿箱
   v
微信公众号「草稿箱」 -> 你人工确认后发布
```

### 临时素材 vs 永久素材（最易踩坑）
- **封面 `thumb_media_id` 必须是永久图片素材**（`material/add_material`）。
  临时素材（`media/upload`，3 天过期）的 media_id 当封面会报 `40007 invalid media_id`。
- **正文配图**用 `media/uploadimg` 返回的 URL，它只用于图文正文 `<img>`，不占素材库、不算永久素材。

### 常见 errcode（详见 `server.js` 顶部注释，以官方文档为准）
| errcode | 常见原因 |
| --- | --- |
| `40001 / 42001` | access_token 无效 / 过期（AppSecret 错或缓存没刷新；服务已自动重试一次） |
| `40164` / `invalid ip ...` | 出口 IP 不在白名单（最高频） |
| `40007` | media_id 不合法（多半是把临时素材当封面） |
| `45009` | 接口调用频率超限 |
| `45028` | 草稿数量达上限 |
| `48001 / 53404` | 账号未认证 / 无接口权限（须为已认证服务号） |
