# OpenClaw Browser Host Extension

OpenClaw Browser Host Extension 是新的浏览器插件主线，用于替代或补充之前的 Windows `Bondie.exe` 客户侧宿主方案。

目标是在用户安装 Chrome / Edge 插件后，让 OpenClaw 能安全地触达用户常用浏览器上下文，包括通知、当前页面信息、用户确认、下载记录摘要和后续浏览器页面内容读取。

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
│   ├── implementation-plan.md
│   ├── todo.md
│   └── research
│       └── 2026-05-13-browser-extension-host.md
├── extension
│   ├── icons
│   ├── manifest.json
│   └── src
│       ├── background.js
│       ├── content.js
│       ├── options.html
│       ├── options.js
│       ├── popup.html
│       ├── popup.js
│       └── styles.css
└── README.md
```

## 本地加载

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

## PoC 能力

当前插件骨架包含：

- Manifest V3。
- 配置页：Gateway URL / token / node name。
- Popup：连接状态、测试通知、当前 tab、下载摘要。
- Background service worker：WebSocket 连接骨架、命令分发、重连、确认弹窗。
- Content script：页面标题、URL、选中文本、正文摘要。
- 浏览器内 `user.confirm` PoC：弹出确认窗口并回传允许/拒绝。

## 归档说明

之前的 Windows exe 思路已归档到 [archive/windows-exe-route.md](archive/windows-exe-route.md)。该路线仍有价值，尤其适合系统通知、托盘、开机自启动、本地文件 scope、Native Messaging host 等能力。
