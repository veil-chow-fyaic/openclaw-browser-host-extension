# OpenClaw Browser Host Extension

OpenClaw Browser Host Extension 是新的浏览器插件主线，用于替代或补充之前的 Windows `Bondie.exe` 客户侧宿主方案。

目标是在用户安装 Chrome / Edge 插件后，让 OpenClaw 能安全地触达用户常用浏览器上下文，包括通知、当前页面信息、用户确认、下载记录摘要和后续浏览器页面内容读取。

当前版本：`0.1.0-alpha.7`。

## 当前结论

浏览器插件可以覆盖浏览器内能力，但不能完全等价替代本地 exe：

- 可以：浏览器通知、当前 tab 元信息、用户主动分享页面、内容脚本读取页面文本、下载记录摘要、连接 OpenClaw Gateway。
- 受限：浏览器关闭后不能常驻；Manifest V3 service worker 生命周期由浏览器管理。
- 不能纯插件实现：任意本地目录扫描、系统级托盘、开机自启动、全盘文件读取。
- 如需本地文件 scope 或系统能力，需要 Native Messaging，但这又回到“需要本地安装组件”的路线。

## 工作区结构

```text
.
├── archive
│   └── windows-exe-route.md
├── docs
│   ├── architecture.md
│   ├── browser-test-runbook.md
│   ├── gateway-protocol-notes.md
│   ├── implementation-plan.md
│   ├── quick-install.md
│   ├── todo.md
│   ├── research
│   │   └── 2026-05-13-browser-extension-host.md
│   └── test-results
│       └── 2026-05-14-local-smoke.md
├── extension
│   ├── icons
│   ├── manifest.json
│   └── src
│       ├── background.js
│       ├── confirm.html
│       ├── confirm.js
│       ├── content.js
│       ├── options.html
│       ├── options.js
│       ├── popup.html
│       ├── popup.js
│       └── styles.css
├── scripts
│   ├── package-extension.ps1
│   └── package-extension.sh
└── README.md
```

## 本地加载

内测分发和快速安装见 [快速安装 OpenClaw Browser Host](docs/quick-install.md)。

生成 zip 包：

macOS / Linux:

```bash
./scripts/package-extension.sh
```

Windows PowerShell:

```powershell
.\scripts\package-extension.ps1
```

Chrome:

1. 打开 `chrome://extensions`。
2. 打开 Developer mode。
3. 选择 Load unpacked。
4. 选择本仓库的 `extension/` 目录。

Edge:

1. 打开 `edge://extensions`。
2. 打开 Developer mode。
3. 选择 Load unpacked。
4. 选择本仓库的 `extension/` 目录。

详细手工测试见 [浏览器插件手工测试 Runbook](docs/browser-test-runbook.md)。

本地烟测记录见 [2026-05-14 local smoke](docs/test-results/2026-05-14-local-smoke.md)。

## PoC 能力

当前插件骨架包含：

- Manifest V3。
- 配置页：Gateway URL / token / token mode / node name。
- Popup：连接状态、测试通知、当前 tab、下载摘要。
- Background service worker：WebSocket 连接骨架、命令分发、重连、确认弹窗。
- Content script：页面标题、URL、选中文本、正文摘要。
- 浏览器内 `user.confirm` PoC：弹出确认窗口并回传允许/拒绝。
- OpenClaw browser-extension node 客户端：Ed25519 设备身份、`connect.challenge`、签名 `connect`、`hello-ok`、deviceToken 持久化、`node.invoke.request` / `node.invoke.result`、`node.event`。
- 连接生命周期与配对生命周期分离：paired 只表示设备已授权，online/offline 才表示 WebSocket 当前状态；断线重连不再制造重复配对体验，popup 也按“在线 / 已配对，重连中 / 等待配对”展示。
- Gateway 协议对齐记录见 [Gateway 协议对齐记录](docs/gateway-protocol-notes.md)。
- 0.1.0-alpha.7 增加 MV3 keepalive / 快速重连，并修正 paired 状态持久化；远端真实 Gateway 仍需继续做长时间在线验证。

## 归档说明

之前的 Windows exe 思路已归档到 [archive/windows-exe-route.md](archive/windows-exe-route.md)。该路线仍有价值，尤其适合系统通知、托盘、开机自启动、本地文件 scope、Native Messaging host 等能力。
