import { ADMIN_CONFIG_KEY, DEFAULT_PASSWORD } from "./config.js";

// HTTP 响应封装
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export function forbidden() {
  return new Response('Forbidden: Invalid or missing Bot Token', { status: 403 });
}

export function unauthorized() {
  return new Response('Unauthorized', { status: 401 });
}

// 密码管理
export async function getAdminPassword(env) {
  if (!env.TOKEN_KV) return DEFAULT_PASSWORD;
  try {
    const cfg = await env.TOKEN_KV.get(ADMIN_CONFIG_KEY, "json");
    if (cfg && cfg.password) return cfg.password;
  } catch (e) {}
  return DEFAULT_PASSWORD;
}

export async function setAdminPassword(env, newPassword) {
  if (!env.TOKEN_KV) throw new Error("KV not bound");
  const cfg = await env.TOKEN_KV.get(ADMIN_CONFIG_KEY, "json") || {};
  cfg.password = newPassword;
  await env.TOKEN_KV.put(ADMIN_CONFIG_KEY, JSON.stringify(cfg));
}

// 字符串工具
export function maskToken(t) {
  if (t.length <= 12) return t;
  return t.slice(0, 6) + "***" + t.slice(-6);
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
}
