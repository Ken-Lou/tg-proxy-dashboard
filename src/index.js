import { jsonResponse } from "./utils.js";
import { handleAdminAPI } from "./api.js";
import { handleTelegramProxy } from "./proxy.js";
import setupWizardHtml from "./ui/setup-wizard.js";
import adminPanelHtml from "./ui/admin-panel.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // KV 未绑定时的友好提示
    if (!env.TOKEN_KV) {
      if (path === "/" || path === "" || path === "/admin" || path === "/admin/") {
        return new Response(setupWizardHtml, {
          headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
      }
      return new Response("KV not bound. Please bind TOKEN_KV in Dashboard.", { status: 503 });
    }

    // 根路径 302 跳转到管理面板
    if (path === "/" || path === "") {
      return Response.redirect(url.origin + "/admin", 302);
    }

    // 管理面板页面
    if (path === "/admin" || path === "/admin/") {
      return new Response(adminPanelHtml, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // 管理后台 API
    if (path.startsWith("/admin/api/")) {
      return handleAdminAPI(request, env);
    }

    // Telegram Bot API 代理
    return handleTelegramProxy(request, env);
  }
};
