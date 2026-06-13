import { jsonResponse, getAdminPassword, setAdminPassword } from "./utils.js";

export async function handleAdminAPI(request, env) {
  // 鉴权
  const auth = request.headers.get("Authorization") || "";
  const expected = "Bearer " + await getAdminPassword(env);
  if (auth !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // 修改密码
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

  // 获取所有 Token
  if (path === "/admin/api/tokens" && request.method === "GET") {
    const data = await env.TOKEN_KV.get("tokens_data", "json") || {};
    return jsonResponse(data);
  }

  // 添加 Token
  if (path === "/admin/api/tokens" && request.method === "POST") {
    const body = await request.json();
    const token = body.token?.trim();
    if (!token) return jsonResponse({ error: "Token required" }, 400);
    
    const data = await env.TOKEN_KV.get("tokens_data", "json") || {};
    data[token] = {
      enabled: body.enabled !== false,
      createdAt: new Date().toISOString(),
      note: body.note || ""
    };
    await env.TOKEN_KV.put("tokens_data", JSON.stringify(data));
    return jsonResponse({ success: true, token: maskToken(token) });
  }

  // Token 单项操作（删除、修改、验证）
  const tokenMatch = path.match(/^\/admin\/api\/tokens\/(.+?)(?:\/verify)?$/);
  if (tokenMatch) {
    const token = decodeURIComponent(tokenMatch[1]);
    return handleTokenAction(request, env, token, path);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

async function handleTokenAction(request, env, token, path) {
  const key = "tokens_data";

  if (request.method === "DELETE") {
    const data = await env.TOKEN_KV.get(key, "json") || {};
    delete data[token];
    await env.TOKEN_KV.put(key, JSON.stringify(data));
    return jsonResponse({ success: true });
  }

  if (request.method === "PATCH") {
    const body = await request.json();
    const data = await env.TOKEN_KV.get(key, "json") || {};
    if (!data[token]) return jsonResponse({ error: "Token not found" }, 404);
    if (typeof body.enabled === "boolean") data[token].enabled = body.enabled;
    if (typeof body.note === "string") data[token].note = body.note;
    await env.TOKEN_KV.put(key, JSON.stringify(data));
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

  return jsonResponse({ error: "Method not allowed" }, 405);
}

function maskToken(t) {
  if (t.length <= 12) return t;
  return t.slice(0, 6) + "***" + t.slice(-6);
}
