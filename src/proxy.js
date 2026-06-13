import { forbidden } from "./utils.js";

export async function handleTelegramProxy(request, env) {
  const url = new URL(request.url);
  const data = await env.TOKEN_KV.get("tokens_data", "json") || {};
  
  const match = url.pathname.match(/^\/bot([^/]+)/);
  if (!match) return forbidden();
  
  const token = match[1];
  const tokenData = data[token];
  if (!tokenData || !tokenData.enabled) return forbidden();
  
  // 转发到 Telegram
  url.host = "api.telegram.org";
  return fetch(new Request(url, {
    method: request.method,
    headers: request.headers,
    body: request.body
  }));
}
