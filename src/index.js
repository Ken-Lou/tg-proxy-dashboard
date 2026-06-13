const TOKENS_KEY = "tokens_data";
const ADMIN_CONFIG_KEY = "admin_config";
const DEFAULT_PASSWORD = "admin123";

// ============ 工具函数 ============
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function forbidden() {
  return new Response('Forbidden: Invalid or missing Bot Token', { status: 403 });
}

function unauthorized() {
  return new Response('Unauthorized', { status: 401 });
}

async function getAdminPassword(env) {
  if (!env.TOKEN_KV) return DEFAULT_PASSWORD;
  try {
    const cfg = await env.TOKEN_KV.get(ADMIN_CONFIG_KEY, "json");
    if (cfg && cfg.password) return cfg.password;
  } catch (e) {}
  return DEFAULT_PASSWORD;
}

async function setAdminPassword(env, newPassword) {
  if (!env.TOKEN_KV) throw new Error("KV not bound");
  const cfg = await env.TOKEN_KV.get(ADMIN_CONFIG_KEY, "json") || {};
  cfg.password = newPassword;
  await env.TOKEN_KV.put(ADMIN_CONFIG_KEY, JSON.stringify(cfg));
}

function proxyToTelegram(request, url) {
  url.host = "api.telegram.org";
  return fetch(new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  }));
}

// ============ Telegram 代理 ============
async function handleTelegramProxy(request, env) {
  const url = new URL(request.url);
  const data = await env.TOKEN_KV.get(TOKENS_KEY, "json") || {};
  const match = url.pathname.match(/^\/bot([^/]+)/);
  if (!match) return forbidden();
  const token = match[1];
  const tokenData = data[token];
  if (!tokenData || !tokenData.enabled) return forbidden();
  return proxyToTelegram(request, url);
}

// ============ 管理 API ============
async function handleAdminAPI(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const expected = "Bearer " + await getAdminPassword(env);
  if (auth !== expected) return unauthorized();

  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/admin/api/password" && request.method === "POST") {
    const body = await request.json();
    const current = await getAdminPassword(env);
    if (body.oldPassword !== current) return jsonResponse({ error: "旧密码错误" }, 403);
    if (!body.newPassword || body.newPassword.length < 4) {
      return jsonResponse({ error: "新密码至少4位" }, 400);
    }
    await setAdminPassword(env, body.newPassword);
    return jsonResponse({ success: true });
  }

  if (path === "/admin/api/tokens" && request.method === "GET") {
    const data = await env.TOKEN_KV.get(TOKENS_KEY, "json") || {};
    return jsonResponse(data);
  }

  if (path === "/admin/api/tokens" && request.method === "POST") {
    const body = await request.json();
    const token = body.token?.trim();
    if (!token) return jsonResponse({ error: "Token required" }, 400);
    const data = await env.TOKEN_KV.get(TOKENS_KEY, "json") || {};
    data[token] = {
      enabled: body.enabled !== false,
      createdAt: new Date().toISOString(),
      note: body.note || ""
    };
    await env.TOKEN_KV.put(TOKENS_KEY, JSON.stringify(data));
    return jsonResponse({ success: true, token: token.slice(0, 6) + "***" + token.slice(-6) });
  }

  const tokenMatch = path.match(/^\/admin\/api\/tokens\/(.+?)(?:\/verify)?$/);
  if (tokenMatch) {
    const token = decodeURIComponent(tokenMatch[1]);

    if (request.method === "DELETE") {
      const data = await env.TOKEN_KV.get(TOKENS_KEY, "json") || {};
      delete data[token];
      await env.TOKEN_KV.put(TOKENS_KEY, JSON.stringify(data));
      return jsonResponse({ success: true });
    }

    if (request.method === "PATCH") {
      const body = await request.json();
      const data = await env.TOKEN_KV.get(TOKENS_KEY, "json") || {};
      if (!data[token]) return jsonResponse({ error: "Token not found" }, 404);
      if (typeof body.enabled === "boolean") data[token].enabled = body.enabled;
      if (typeof body.note === "string") data[token].note = body.note;
      await env.TOKEN_KV.put(TOKENS_KEY, JSON.stringify(data));
      return jsonResponse({ success: true });
    }

    if (request.method === "POST" && path.endsWith("/verify")) {
      try {
        const resp = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const result = await resp.json();
        return jsonResponse({
          valid: result.ok === true,
          botInfo: result.result || null,
          error: result.description || null
        });
      } catch (e) {
        return jsonResponse({ valid: false, error: e.message }, 502);
      }
    }
  }

  return jsonResponse({ error: "Not found" }, 404);
}

// ============ 安装向导（KV 未绑定时） ============
function getSetupWizardHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>初始化配置 - Telegram Bot Proxy</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}
.box{background:#1e293b;padding:32px;border-radius:16px;max-width:600px;width:100%;border:1px solid #334155}
h1{font-size:1.25rem;margin-bottom:16px}
code{background:#0f172a;padding:2px 8px;border-radius:4px;font-family:ui-monospace,Menlo,monospace;color:#38bdf8}
ol{line-height:2.2;padding-left:20px}
p{margin:12px 0}
.btn{display:inline-block;margin-top:16px;padding:10px 20px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-size:.9375rem;border:none;cursor:pointer}
.btn:hover{opacity:.9}
.center{text-align:center}
</style>
</head>
<body>
<div class="box">
  <h1>⚙️ 部署成功！还需最后一步</h1>
  <p>本模板为公开仓库，<b>不含任何账号密码</b>。你需要在 Cloudflare Dashboard 中为 Worker 绑定 KV 存储。</p>
  <ol>
    <li>打开 <a href="https://dash.cloudflare.com/" target="_blank" style="color:#38bdf8">Cloudflare Dashboard</a></li>
    <li>进入 <b>Workers & Pages</b> → 点击本项目</li>
    <li>选择 <b>Settings</b> → <b>Bindings</b> → <b>Add</b> → <b>KV Namespace</b></li>
    <li>Variable name 必须填写：<code style="color:#38bdf8;font-weight:600">TOKEN_KV</code></li>
    <li>选择一个已有 KV，或点击 <b>Create a namespace</b> 新建</li>
    <li>点击 <b>Deploy</b> 保存配置</li>
  </ol>
  <p style="color:#94a3b8;font-size:0.875rem;">默认管理密码为 <code>admin123</code>，进入面板后请立即修改。</p>
  <div class="center">
    <button class="btn" onclick="location.reload()">🚀 我已绑定 KV，刷新进入面板</button>
  </div>
</div>
</body>
</html>`;
}

// ============ 管理面板 HTML（localStorage 安全版本） ============
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Telegram Bot 代理管理面板</title>
<style>
:root{--bg:#0f172a;--card:#1e293b;--text:#f1f5f9;--muted:#94a3b8;--primary:#3b82f6;--success:#22c55e;--danger:#ef4444;--warning:#f59e0b;--border:#334155}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:20px}
.container{max-width:960px;margin:0 auto}
h1{font-size:1.5rem}
.card{background:var(--card);border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid var(--border)}
.form-group{margin-bottom:16px}
label{display:block;font-size:.875rem;color:var(--muted);margin-bottom:6px}
input[type="text"],input[type="password"]{width:100%;padding:10px 14px;background:#0f172a;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.9375rem}
input:focus{outline:none;border-color:var(--primary)}
button{padding:10px 18px;border:none;border-radius:8px;font-size:.875rem;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.btn-primary{background:var(--primary);color:#fff}
.btn-danger{background:var(--danger);color:#fff}
.btn-warning{background:var(--warning);color:#000}
.btn-success{background:var(--success);color:#fff}
.btn-sm{padding:6px 12px;font-size:.8125rem}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{text-align:left;padding:12px;border-bottom:1px solid var(--border);font-size:.875rem;vertical-align:middle}
th{color:var(--muted);font-weight:500}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.75rem;font-weight:600}
.badge-success{background:rgba(34,197,94,.15);color:var(--success)}
.badge-danger{background:rgba(239,68,68,.15);color:var(--danger)}
.badge-muted{background:rgba(148,163,184,.15);color:var(--muted)}
.badge-primary{background:rgba(59,130,246,.15);color:var(--primary)}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.login-overlay{position:fixed;inset:0;background:rgba(15,23,42,.95);display:flex;align-items:center;justify-content:center;z-index:50}
.hidden{display:none!important}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin-bottom:20px}
.stat{background:var(--card);padding:16px;border-radius:12px;border:1px solid var(--border)}
.stat-value{font-size:1.5rem;font-weight:700;margin-top:4px}
.stat-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.toast{position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;color:#fff;font-size:.875rem;animation:slideIn .3s ease;z-index:40}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.toast-success{background:var(--success)}
.toast-error{background:var(--danger)}
code{font-family:ui-monospace,Menlo,monospace;font-size:.9em}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:60;align-items:center;justify-content:center}
.error-box{background:var(--danger);color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:.875rem}
</style>
</head>
<body>
<div id="loginOverlay" class="login-overlay">
  <div class="card" style="width:100%;max-width:360px">
    <h2 style="margin-bottom:1rem">管理面板登录</h2>
    <div id="loginError" class="error-box hidden"></div>
    <div class="form-group">
      <label>访问密码</label>
      <input type="password" id="adminPassword" placeholder="默认 admin123" onkeydown="if(event.key==='Enter')doLogin()">
    </div>
    <button class="btn-primary" style="width:100%" onclick="doLogin()">进入面板</button>
    <p style="margin-top:12px;font-size:.8125rem;color:var(--muted)">首次登录后请立即修改密码</p>
  </div>
</div>

<div class="container hidden" id="app">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:12px">
    <h1>Telegram Bot 代理管理</h1>
    <button class="btn-sm btn-primary" onclick="showChangePw()">修改密码</button>
  </div>
  
  <div class="stats">
    <div class="stat"><div class="stat-label">总 Token 数</div><div class="stat-value" id="statTotal">0</div></div>
    <div class="stat"><div class="stat-label">已启用</div><div class="stat-value" id="statEnabled">0</div></div>
    <div class="stat"><div class="stat-label">已停用</div><div class="stat-value" id="statDisabled">0</div></div>
  </div>

  <div class="card">
    <h3 style="margin-bottom:1rem">添加新 Token</h3>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
      <div style="flex:1;min-width:220px">
        <label>Bot Token</label>
        <input type="text" id="newToken" placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxyz">
      </div>
      <div style="flex:1;min-width:180px">
        <label>备注</label>
        <input type="text" id="newNote" placeholder="生产环境机器人">
      </div>
      <button class="btn-primary" onclick="addToken()">添加</button>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-bottom:1rem">Token 列表</h3>
    <div id="tokenTableContainer"><p style="color:var(--muted)">加载中...</p></div>
  </div>
</div>

<div class="modal" id="pwModal">
  <div class="card" style="width:90%;max-width:380px">
    <h3 style="margin-bottom:1rem">修改管理密码</h3>
    <div class="form-group">
      <label>旧密码</label>
      <input type="password" id="oldPw">
    </div>
    <div class="form-group">
      <label>新密码</label>
      <input type="password" id="newPw">
    </div>
    <div class="form-group">
      <label>确认新密码</label>
      <input type="password" id="newPw2">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn-sm" style="background:var(--border);color:var(--text)" onclick="hideChangePw()">取消</button>
      <button class="btn-sm btn-primary" onclick="doChangePw()">保存</button>
    </div>
  </div>
</div>

<script>
// 安全地读取 localStorage，隐私模式下不报错
var password = '';
try { password = localStorage.getItem('admin_pw') || ''; } catch(e) {}

function savePw(pw) {
  try { localStorage.setItem('admin_pw', pw); } catch(e) {}
}

function clearPw() {
  try { localStorage.removeItem('admin_pw'); } catch(e) {}
}

function showLoginError(msg) {
  var el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideLoginError() {
  document.getElementById('loginError').classList.add('hidden');
}

function api(path, opts) {
  opts = opts || {};
  return fetch(path, {
    method: opts.method || 'GET',
    headers: Object.assign({
      'Authorization': 'Bearer ' + password,
      'Content-Type': 'application/json'
    }, opts.headers || {}),
    body: opts.body
  }).then(function(res) {
    if (res.status === 401) {
      clearPw();
      location.reload();
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      return res.json().then(function(err){ throw new Error(err.error || 'Request failed'); });
    }
    return res.json();
  });
}

function maskToken(t) {
  if (t.length <= 12) return t;
  return t.slice(0,6) + '***' + t.slice(-6);
}

function showToast(msg, type) {
  type = type || 'success';
  var div = document.createElement('div');
  div.className = 'toast toast-' + type;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(function(){ div.remove(); }, 3000);
}

function loadTokens() {
  api('/admin/api/tokens').then(function(data){
    renderTokens(data);
  }).catch(function(e){
    showToast(e.message, 'error');
  });
}

function renderTokens(data) {
  var tokens = Object.entries(data);
  document.getElementById('statTotal').textContent = tokens.length;
  document.getElementById('statEnabled').textContent = tokens.filter(function(x){return x[1].enabled;}).length;
  document.getElementById('statDisabled').textContent = tokens.filter(function(x){return !x[1].enabled;}).length;

  if (tokens.length === 0) {
    document.getElementById('tokenTableContainer').innerHTML = '<p style="color:var(--muted)">暂无 Token，请添加。</p>';
    return;
  }

  var html = '<table><thead><tr><th>Token</th><th>备注</th><th>状态</th><th>验证结果</th><th>操作</th></tr></thead><tbody>';
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i][0];
    var info = tokens[i][1];
    var statusBadge = info.enabled 
      ? '<span class="badge badge-success">启用</span>' 
      : '<span class="badge badge-danger">停用</span>';
    var verifyId = 'verify-' + encodeURIComponent(token).replace(/[^a-zA-Z0-9_-]/g, '_');
    var toggleClass = info.enabled ? 'btn-warning' : 'btn-success';
    var toggleText = info.enabled ? '停用' : '启用';
    var safeToken = token.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    html += '<tr>' +
      '<td><code>' + maskToken(token) + '</code></td>' +
      '<td style="color:var(--muted)">' + (info.note || '-') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td id="' + verifyId + '"><span class="badge badge-muted">未验证</span></td>' +
      '<td><div class="actions">' +
        '<button class="btn-sm ' + toggleClass + '" onclick="toggleToken(\\'' + safeToken + '\\',' + (!info.enabled) + ')">' + toggleText + '</button>' +
        '<button class="btn-sm btn-primary" onclick="checkToken(\\'' + safeToken + '\\')">验证</button>' +
        '<button class="btn-sm btn-danger" onclick="deleteToken(\\'' + safeToken + '\\')">删除</button>' +
      '</div></td>' +
    '</tr>';
  }
  html += '</tbody></table>';
  document.getElementById('tokenTableContainer').innerHTML = html;
}

function addToken() {
  var token = document.getElementById('newToken').value.trim();
  var note = document.getElementById('newNote').value.trim();
  if (!token) return showToast('请输入 Token', 'error');
  api('/admin/api/tokens', {
    method: 'POST',
    body: JSON.stringify({ token: token, note: note, enabled: true })
  }).then(function(){
    document.getElementById('newToken').value = '';
    document.getElementById('newNote').value = '';
    showToast('添加成功');
    loadTokens();
  }).catch(function(e){
    showToast(e.message, 'error');
  });
}

function toggleToken(token, enabled) {
  api('/admin/api/tokens/' + encodeURIComponent(token), {
    method: 'PATCH',
    body: JSON.stringify({ enabled: enabled })
  }).then(function(){
    showToast(enabled ? '已启用' : '已停用');
    loadTokens();
  }).catch(function(e){
    showToast(e.message, 'error');
  });
}

function deleteToken(token) {
  if (!confirm('确定要删除这个 Token 吗？')) return;
  api('/admin/api/tokens/' + encodeURIComponent(token), { method: 'DELETE' })
  .then(function(){
    showToast('删除成功');
    loadTokens();
  }).catch(function(e){
    showToast(e.message, 'error');
  });
}

function checkToken(token) {
  var id = 'verify-' + encodeURIComponent(token).replace(/[^a-zA-Z0-9_-]/g, '_');
  var cell = document.getElementById(id);
  if (cell) cell.innerHTML = '<span class="badge badge-primary">验证中...</span>';
  api('/admin/api/tokens/' + encodeURIComponent(token) + '/verify', { method: 'POST' })
  .then(function(res){
    if (res.valid) {
      var name = res.botInfo && res.botInfo.username ? res.botInfo.username : 'Bot';
      cell.innerHTML = '<span class="badge badge-success">有效 @' + name + '</span>';
    } else {
      cell.innerHTML = '<span class="badge badge-danger">无效</span>';
    }
  }).catch(function(){
    cell.innerHTML = '<span class="badge badge-danger">错误</span>';
  });
}

function showChangePw() { document.getElementById('pwModal').style.display = 'flex'; }
function hideChangePw() { document.getElementById('pwModal').style.display = 'none'; }

function doChangePw() {
  var oldPw = document.getElementById('oldPw').value;
  var newPw = document.getElementById('newPw').value;
  var newPw2 = document.getElementById('newPw2').value;
  if (!newPw || newPw.length < 4) return showToast('新密码至少4位', 'error');
  if (newPw !== newPw2) return showToast('两次输入不一致', 'error');
  api('/admin/api/password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
  }).then(function(){
    password = newPw;
    savePw(password);
    document.getElementById('oldPw').value = '';
    document.getElementById('newPw').value = '';
    document.getElementById('newPw2').value = '';
    hideChangePw();
    showToast('密码已修改');
  }).catch(function(e){
    showToast(e.message, 'error');
  });
}

function doLogin() {
  hideLoginError();
  var pw = document.getElementById('adminPassword').value.trim();
  if (!pw) {
    showLoginError('请输入密码');
    return;
  }
  // 先保存密码，再试 API
  password = pw;
  savePw(password);
  
  // 测试一个简单请求验证密码
  api('/admin/api/tokens').then(function(data){
    // 成功：显示面板
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderTokens(data);
  }).catch(function(e){
    // 失败：恢复并提示
    password = '';
    clearPw();
    showLoginError('密码错误或请求失败: ' + e.message);
  });
}

// 页面加载：如有保存的密码自动尝试登录
if (password) {
  api('/admin/api/tokens').then(function(data){
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderTokens(data);
  }).catch(function(){
    clearPw();
    password = '';
  });
}
</script>
</body>
</html>`;

// ============ 主入口 ============
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 根路径：已绑定 KV 则 302 跳转到 /admin，未绑定则显示向导
    if (path === "/" || path === "") {
      if (!env.TOKEN_KV) {
        return new Response(getSetupWizardHtml(), {
          headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
      }
      return Response.redirect(url.origin + "/admin", 302);
    }

    if (path === "/admin" || path === "/admin/") {
      if (!env.TOKEN_KV) {
        return new Response(getSetupWizardHtml(), {
          headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
      }
      return new Response(ADMIN_HTML, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    if (path.startsWith("/admin/api/")) {
      if (!env.TOKEN_KV) return jsonResponse({ error: "KV not bound" }, 503);
      return handleAdminAPI(request, env);
    }

    if (!env.TOKEN_KV) {
      return new Response("KV not bound. Please bind TOKEN_KV in Dashboard.", { status: 503 });
    }

    return handleTelegramProxy(request, env);
  }
};
