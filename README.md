# tg-proxy-dashboard
# Telegram Bot API 代理

一个可公开 Fork 的 Cloudflare Workers 模板。  
**代码中不含任何密钥**，部署后通过 Web 面板管理 Bot Token，支持验证、启用/停用、删除等操作。

## 特性

- **公开安全**：仓库零硬编码密钥，默认密码首次登录后可在面板修改
- **一键部署**：连接 GitHub 即可自动部署，无需本地配置 Wrangler
- **在线管理**：Web 面板查看 Token 状态、一键验证有效性、随时停用/删除
- **边缘代理**：仅白名单 Token 可访问 Telegram API，全球低延迟

## 项目结构
```text
telegram-bot-proxy/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions 自动部署（可选）
├── src/
│   ├── index.js                    # 入口：请求路由分发
│   ├── config.js                   # 配置：常量与默认值
│   ├── utils.js                    # 工具：HTTP 响应、密码管理、字符串处理
│   ├── proxy.js                    # 代理：Telegram API 转发与 Token 校验
│   ├── api.js                      # 后端 API：Token CRUD、密码修改、Bot 验证
│   └── ui/
│       ├── setup-wizard.js         # 前端：KV 未绑定时的安装向导页面
│       └── admin-panel.js          # 前端：管理面板 HTML + CSS + JS
├── wrangler.toml                   # Workers 配置（无敏感信息）
├── package.json                    # 项目依赖与脚本
├── .gitignore                      # Git 忽略规则
└── README.md                       # 项目文档

```
## 一键部署（推荐）

### 步骤 1：Fork 或创建仓库

点击本仓库右上角的 **Fork**，将其复制到你的 GitHub 账户下（保持公开即可，代码中无敏感信息）。

### 步骤 2：Cloudflare 导入仓库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** → **创建** → **导入 Git 存储库**
3. 选择你 Fork 的仓库，点击 **开始设置**
4. 部署配置保持默认（构建命令留空，输出目录留空），点击 **保存并部署**

> 此时 Worker 已成功部署，但还**无法直接使用**，因为缺少 KV 绑定，继续下一步。

### 步骤 3：绑定 KV 存储

1. 在 Dashboard 中进入刚部署的 Worker
2. 点击 **Settings** → **Bindings** → **Add** → **KV Namespace**
3. 填写：
   - **Variable name**：`TOKEN_KV`（必须严格一致）
   - **KV namespace**：选择已有或点击 **Create a namespace** 新建一个
4. 点击 **Deploy** 保存

### 步骤 4：进入管理面板

访问 `https://你的项目名.你的子域名.workers.dev/admin`

- **默认密码**：`admin123`
- 登录后点击右上角 **修改密码**，立即更换为你的专属密码

### 步骤 5：添加 Bot Token

在面板中：
1. 输入 Bot Token（从 [@BotFather](https://t.me/BotFather) 获取）
2. 填写备注（可选）
3. 点击 **添加**
4. 点击 **验证** 确认 Token 有效

## 使用代理

将 Telegram API 地址中的 `api.telegram.org` 替换为你的 Worker 域名：

https://api.telegram.org/bot/getMe ↓ https://你的项目名.你的子域名.workers.dev/bot/getMe


只有面板中**已启用**的 Token 才能通过代理访问。

## 面板功能说明

| 功能 | 说明 |
|------|------|
| **验证** | 调用 Telegram `getMe` 接口，实时检测 Token 是否有效，并显示 Bot 用户名 |
| **停用/启用** | 临时关闭某个 Token 的代理权限，无需删除 |
| **删除** | 永久移除 Token |
| **修改密码** | 将默认的 `admin123` 修改为你自己的密码，保存在 KV 中 |

## 手动部署（Wrangler CLI）

如果你更喜欢命令行：

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/telegram-bot-proxy.git
cd telegram-bot-proxy

# 2. 安装依赖
npm install

# 3. 创建 KV（仅需一次）
npx wrangler kv:namespace create TOKEN_KV
# 将返回的 id 填入 wrangler.toml 的 [[kv_namespaces]] 中（可选，也可只在 Dashboard 绑定）

# 4. 部署
npx wrangler deploy
安全提示
默认密码：首次部署后密码为 admin123，请务必在面板中修改
密码存储：修改后的密码保存在你绑定的 KV 中，不会泄露在代码里
HTTPS：Cloudflare Workers 强制 HTTPS，通信全程加密
Token 脱敏：面板中 Token 中间部分用 *** 隐藏，但拥有管理员密码的人仍可操作
故障排查
现象	原因	解决
打开 /admin 显示"一键部署成功！还需最后一步"	KV 未绑定	按页面提示去 Dashboard 绑定 TOKEN_KV
登录提示 Unauthorized	密码错误	默认是 admin123，如果改过又忘了，去 Dashboard 的 KV 中删除 admin_config 键即可恢复默认
代理返回 403	Token 不在白名单或已被停用	在面板中添加或启用该 Token
代理返回 502	Telegram API 暂时不可用	稍后重试
许可证
MIT
---
### 5. 部署后首次访问流程图
Fork 仓库 → Dashboard 导入 Git → 自动部署成功 ↓ 访问 /admin 看到 KV 绑定向导 ↓ Dashboard → Worker → Settings → Bindings ↓ 添加 TOKEN_KV ↓ 刷新 /admin → 输入 admin123 ↓ 修改密码 → 添加 Token → 开始使用
