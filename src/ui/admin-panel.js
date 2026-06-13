export default `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Telegram Bot 代理管理面板</title>
<style>
:root{
  --bg:#0f172a;--card:#1e293b;--text:#f1f5f9;--muted:#94a3b8;
  --primary:#3b82f6;--success:#22c55e;--danger:#ef4444;--warning:#f59e0b;
  --border:#334155;--input-bg:#0f172a;--overlay:rgba(15,23,42,.95);
  --btn-text:#fff
}
[data-theme="light"]{
  --bg:#f1f5f9;--card:#ffffff;--text:#0f172a;--muted:#64748b;
  --primary:#2563eb;--success:#16a34a;--danger:#dc2626;--warning:#d97706;
  --border:#cbd5e1;--input-bg:#f8fafc;--overlay:rgba(241,245,249,.95);
  --btn-text:#fff
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;padding:20px;transition:background .3s,color .3s}
.container{max-width:960px;margin:0 auto}
h1{font-size:1.5rem}
.card{background:var(--card);border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid var(--border);transition:background .3s,border-color .3s}
.form-group{margin-bottom:16px}
label{display:block;font-size:.875rem;color:var(--muted);margin-bottom:6px}
input[type="text"],input[type="password"]{
  width:100%;padding:10px 14px;background:var(--input-bg);border:1px solid var(--border);
  border-radius:8px;color:var(--text);font-size:.9375rem;transition:border-color .3s
}
input:focus{outline:none;border-color:var(--primary)}
button{
  padding:10px 18px;border:none;border-radius:8px;font-size:.875rem;
  cursor:pointer;transition:opacity .2s;background:var(--primary);color:var(--btn-text)
}
button:hover{opacity:.9}
.btn-danger{background:var(--danger)}
.btn-warning{background:var(--warning);color:#000}
.btn-success{background:var(--success)}
.btn-sm{padding:6px 12px;font-size:.8125rem}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted)}
.btn-ghost:hover{border-color:var(--primary);color:var(--primary);opacity:1}

table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{text-align:left;padding:12px;border-bottom:1px solid var(--border);font-size:.875rem;vertical-align:middle}
th{color:var(--muted);font-weight:500}
.badge{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.75rem;font-weight:600}
.badge-success{background:rgba(34,197,94,.15);color:var(--success)}
.badge-danger{background:rgba(239,68,68,.15);color:var(--danger)}
.badge-muted{background:rgba(148,163,184,.15);color:var(--muted)}
.badge-primary{background:rgba(59,130,246,.15);color:var(--primary)}
.actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.actions .spacer{width:1px;height:16px;background:var(--border);margin:0 4px}

.login-overlay{
  position:fixed;inset:0;background:var(--overlay);display:flex;
  align-items:center;justify-content:center;z-index:50;transition:background .3s
}
.hidden{display:none!important}

.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;margin-bottom:20px}
.stat{background:var(--card);padding:16px;border-radius:12px;border:1px solid var(--border);transition:background .3s}
.stat-value{font-size:1.5rem;font-weight:700;margin-top:4px}
.stat-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}

.toast{
  position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:8px;
  color:#fff;font-size:.875rem;animation:slideIn .3s ease;z-index:40
}
@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
.toast-success{background:var(--success)}
.toast-error{background:var(--danger)}

code{font-family:ui-monospace,Menlo,monospace;font-size:.9em}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:60;align-items:center;justify-content:center}
.error-box{background:var(--danger);color:#fff;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:.875rem}

.header-bar{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:12px}
.header-actions{display:flex;gap:10px;align-items:center}
.theme-btn{font-size:1.25rem;padding:6px 10px;background:var(--card);border:1px solid var(--border)}
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
    <button style="width:100%" onclick="doLogin()">进入面板</button>
    <p style="margin-top:12px;font-size:.8125rem;color:var(--muted)">首次登录后请立即修改密码</p>
  </div>
</div>

<div class="container hidden" id="app">
  <div class="header-bar">
    <h1>Telegram Bot 代理管理</h1>
    <div class="header-actions">
      <button class="theme-btn btn-ghost" onclick="toggleTheme()" title="切换主题">🌓</button>
      <button class="btn-sm" onclick="showChangePw()">修改密码</button>
    </div>
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
      <button onclick="addToken()">添加</button>
    </div>
  </div>

  <div class="card">
    <h3 style="margin-bottom:1rem">Token 列表</h3>
    <div id="tokenTableContainer"><p style="color:var(--muted)">加载中...</p></div>
  </div>
</div>

<!-- 修改密码 Modal -->
<div class="modal" id="pwModal">
  <div class="card" style="width:90%;max-width:380px">
    <h3 style="margin-bottom:1rem">修改管理密码</h3>
    <div class="form-group"><label>旧密码</label><input type="password" id="oldPw"></div>
    <div class="form-group"><label>新密码</label><input type="password" id="newPw"></div>
    <div class="form-group"><label>确认新密码</label><input type="password" id="newPw2"></div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn-sm btn-ghost" onclick="hideChangePw()">取消</button>
      <button class="btn-sm" onclick="doChangePw()">保存</button>
    </div>
  </div>
</div>

<!-- 修改备注 Modal -->
<div class="modal" id="noteModal">
  <div class="card" style="width:90%;max-width:380px">
    <h3 style="margin-bottom:1rem">修改备注</h3>
    <div class="form-group">
      <label>备注内容</label>
      <input type="text" id="editNoteInput" placeholder="输入备注...">
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn-sm btn-ghost" onclick="hideEditNote()">取消</button>
      <button class="btn-sm" onclick="saveEditNote()">保存</button>
    </div>
  </div>
</div>

<script>
// ============ 主题切换 ============
function initTheme(){
  var saved;
  try{ saved = localStorage.getItem('theme'); }catch(e){}
  var hour = new Date().getHours();
  var theme = saved || (hour >= 7 && hour < 18 ? 'light' : 'dark');
  document.documentElement.setAttribute('data-theme', theme);
}
function toggleTheme(){
  var cur = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try{ localStorage.setItem('theme', next); }catch(e){}
}
initTheme();

// ============ 数据与 API ============
var password = '';
try{ password = localStorage.getItem('admin_pw') || ''; }catch(e){}

function savePw(pw){ try{ localStorage.setItem('admin_pw', pw); }catch(e){} }
function clearPw(){ try{ localStorage.removeItem('admin_pw'); }catch(e){} }

function showLoginError(msg){
  var el = document.getElementById('loginError');
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideLoginError(){ document.getElementById('loginError').classList.add('hidden'); }

function api(path, opts){
  opts = opts || {};
  return fetch(path, {
    method: opts.method || 'GET',
    headers: Object.assign({
      'Authorization': 'Bearer ' + password,
      'Content-Type': 'application/json'
    }, opts.headers || {}),
    body: opts.body
  }).then(function(res){
    if(res.status === 401){ clearPw(); location.reload(); throw new Error('Unauthorized'); }
    if(!res.ok) return res.json().then(function(err){ throw new Error(err.error || 'Request failed'); });
    return res.json();
  });
}

function maskToken(t){ return t.length <= 12 ? t : t.slice(0,6) + '***' + t.slice(-6); }

function showToast(msg, type){
  type = type || 'success';
  var div = document.createElement('div');
  div.className = 'toast toast-' + type;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(function(){ div.remove(); }, 3000);
}

// ============ Token 管理 ============
function loadTokens(){
  api('/admin/api/tokens').then(function(data){ renderTokens(data); })
  .catch(function(e){ showToast(e.message, 'error'); });
}

function renderTokens(data){
  var tokens = Object.entries(data);
  document.getElementById('statTotal').textContent = tokens.length;
  document.getElementById('statEnabled').textContent = tokens.filter(function(x){return x[1].enabled;}).length;
  document.getElementById('statDisabled').textContent = tokens.filter(function(x){return !x[1].enabled;}).length;

  if(tokens.length === 0){
    document.getElementById('tokenTableContainer').innerHTML = '<p style="color:var(--muted)">暂无 Token，请添加。</p>';
    return;
  }

  var html = '<table><thead><tr><th>Token</th><th>备注</th><th>状态</th><th>验证结果</th><th>操作</th></tr></thead><tbody>';
  for(var i=0;i<tokens.length;i++){
    var token = tokens[i][0];
    var info = tokens[i][1];
    var statusBadge = info.enabled ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-danger">停用</span>';
    var verifyId = 'verify-' + encodeURIComponent(token).replace(/[^a-zA-Z0-9_-]/g, '_');
    var toggleClass = info.enabled ? 'btn-warning' : 'btn-success';
    var toggleText = info.enabled ? '停用' : '启用';
    var safeToken = token.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
    html += '<tr>' +
      '<td><code>' + maskToken(token) + '</code></td>' +
      '<td style="color:var(--muted)">' + (info.note || '-') + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td id="' + verifyId + '"><span class="badge badge-muted">未验证</span></td>' +
      '<td><div class="actions">' +
        '<button class="btn-sm ' + toggleClass + '" onclick="toggleToken(\\'' + safeToken + '\\',' + (!info.enabled) + ')">' + toggleText + '</button>' +
        '<button class="btn-sm btn-primary" onclick="checkToken(\\'' + safeToken + '\\')">验证</button>' +
        '<div class="spacer"></div>' +
        '<button class="btn-sm btn-ghost" onclick="openEditNote(\\'' + safeToken + '\\',\\'' + (info.note||'').replace(/'/g,"\\\\'") + '\\')">修改备注</button>' +
        '<button class="btn-sm btn-danger" onclick="deleteToken(\\'' + safeToken + '\\')">删除</button>' +
      '</div></td>' +
    '</tr>';
  }
  html += '</tbody></table>';
  document.getElementById('tokenTableContainer').innerHTML = html;
}

function addToken(){
  var token = document.getElementById('newToken').value.trim();
  var note = document.getElementById('newNote').value.trim();
  if(!token) return showToast('请输入 Token', 'error');
  api('/admin/api/tokens', {
    method: 'POST',
    body: JSON.stringify({ token: token, note: note, enabled: true })
  }).then(function(){
    document.getElementById('newToken').value = '';
    document.getElementById('newNote').value = '';
    showToast('添加成功');
    loadTokens();
  }).catch(function(e){ showToast(e.message, 'error'); });
}

function toggleToken(token, enabled){
  api('/admin/api/tokens/' + encodeURIComponent(token), {
    method: 'PATCH',
    body: JSON.stringify({ enabled: enabled })
  }).then(function(){
    showToast(enabled ? '已启用' : '已停用');
    loadTokens();
  }).catch(function(e){ showToast(e.message, 'error'); });
}

function deleteToken(token){
  if(!confirm('确定要删除这个 Token 吗？')) return;
  api('/admin/api/tokens/' + encodeURIComponent(token), { method: 'DELETE' })
  .then(function(){ showToast('删除成功'); loadTokens(); })
  .catch(function(e){ showToast(e.message, 'error'); });
}

function checkToken(token){
  var id = 'verify-' + encodeURIComponent(token).replace(/[^a-zA-Z0-9_-]/g, '_');
  var cell = document.getElementById(id);
  if(cell) cell.innerHTML = '<span class="badge badge-primary">验证中...</span>';
  api('/admin/api/tokens/' + encodeURIComponent(token) + '/verify', { method: 'POST' })
  .then(function(res){
    if(res.valid){
      var name = res.botInfo && res.botInfo.username ? res.botInfo.username : 'Bot';
      cell.innerHTML = '<span class="badge badge-success">有效 @' + name + '</span>';
    }else{
      cell.innerHTML = '<span class="badge badge-danger">无效</span>';
    }
  }).catch(function(){ cell.innerHTML = '<span class="badge badge-danger">错误</span>'; });
}

// ============ 修改备注 ============
var editingToken = '';

function openEditNote(token, currentNote){
  editingToken = token;
  document.getElementById('editNoteInput').value = currentNote || '';
  document.getElementById('noteModal').style.display = 'flex';
}

function hideEditNote(){
  document.getElementById('noteModal').style.display = 'none';
  editingToken = '';
}

function saveEditNote(){
  if(!editingToken) return;
  var note = document.getElementById('editNoteInput').value.trim();
  api('/admin/api/tokens/' + encodeURIComponent(editingToken), {
    method: 'PATCH',
    body: JSON.stringify({ note: note })
  }).then(function(){
    showToast('备注已更新');
    hideEditNote();
    loadTokens();
  }).catch(function(e){ showToast(e.message, 'error'); });
}

// ============ 修改密码（成功后强制重登） ============
function showChangePw(){ document.getElementById('pwModal').style.display = 'flex'; }
function hideChangePw(){ document.getElementById('pwModal').style.display = 'none'; }

function doChangePw(){
  var oldPw = document.getElementById('oldPw').value;
  var newPw = document.getElementById('newPw').value;
  var newPw2 = document.getElementById('newPw2').value;
  if(!newPw || newPw.length < 4) return showToast('新密码至少4位', 'error');
  if(newPw !== newPw2) return showToast('两次输入不一致', 'error');
  api('/admin/api/password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw })
  }).then(function(){
    showToast('密码已修改，请重新登录');
    password = '';
    clearPw();
    setTimeout(function(){ location.reload(); }, 800);
  }).catch(function(e){ showToast(e.message, 'error'); });
}

// ============ 登录 ============
function doLogin(){
  hideLoginError();
  var pw = document.getElementById('adminPassword').value.trim();
  if(!pw){ showLoginError('请输入密码'); return; }
  password = pw;
  savePw(password);
  api('/admin/api/tokens').then(function(data){
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderTokens(data);
  }).catch(function(e){
    password = '';
    clearPw();
    showLoginError('密码错误或请求失败: ' + e.message);
  });
}

if(password){
  api('/admin/api/tokens').then(function(data){
    document.getElementById('loginOverlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderTokens(data);
  }).catch(function(){ clearPw(); password = ''; });
}
</script>
</body>
</html>`;
