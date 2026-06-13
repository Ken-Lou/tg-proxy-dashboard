export default `<!DOCTYPE html>
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
