# OpenClaw Browser Host Extension 架构方案

日期：2026-05-13

## 背景

新的客户侧宿主形态优先考虑浏览器插件，而不是 Windows 本地安装程序。用户在 Edge 或 Chrome 安装插件后，OpenClaw 能触达用户浏览器上下文。

## 推荐第一阶段形态

```text
Chrome / Edge Extension
├── Manifest V3
├── service worker
│   ├── Gateway WebSocket client
│   ├── capability dispatcher
│   ├── reconnect / heartbeat
│   └── chrome.storage.local config
├── popup
│   ├── connection status
│   ├── send test event
│   └── quick actions
├── options page
│   ├── Gateway URL
│   ├── bootstrap/token config
│   └── permission notes
└── content script
    ├── current page summary
    ├── selected text
    └── explicit page share
```

## 能力设计

当前 PoC 能力：

- `browser.notify`
- `browser.current_tab.info`
- `browser.current_tab.extract`
- `browser.downloads.summary`
- `user.confirm`

暂不做：

- `files.read`
- `files.watch`
- `system.run`
- 全盘文件扫描
- 浏览器关闭后的常驻

## OpenClaw Node 连接模型

插件 service worker 直接连接 OpenClaw Gateway：

```text
Extension service worker -> wss://<openclaw-gateway>
```

注意：

- 纯插件不开放本地端口。
- 插件 service worker 生命周期由浏览器管理。
- WebSocket 断开后需重连。
- 推荐统一复用 OpenClaw node 后端能力，包括 pairing、device token、capability registry、invoke/result、event、审计和在线状态。
- 插件作为新的 node 类型：`browser-extension`。
- 产品化应改为短期 bootstrap + per-extension device token。

## Browser Extension Node

推荐主线：

```text
OpenClaw Node Protocol
├── Windows Node / Bondie.exe
└── Browser Extension Node
```

浏览器插件本地持久化 Ed25519 设备身份。`hostId` 使用 public key 的 SHA-256 hex，与 Windows node 的 deviceId 思路保持一致。服务侧统一按 node 管理授权、能力、在线状态和撤销。

当前插件默认 `node-compatible`，同时保留 `browser-host` 作为备选/fallback，避免服务侧短期还未接入 node 协议时卡死。

## 权限策略

首版尽量小权限：

- `storage`
- `notifications`
- `tabs`
- `activeTab`
- `scripting`
- `downloads`

后续按能力细化：

- 页面内容读取优先使用 `activeTab` + 用户点击触发。
- 避免默认 `host_permissions: <all_urls>`。
- 需要域名 scope 时再请求具体 host permissions。
- 当前 PoC 不默认注入全站 content script；用户在 popup 中主动触发页面摘要时，先通过 `chrome.permissions.request` 请求当前站点权限，再通过 `chrome.scripting.executeScript` 注入。

## 当前协议状态

`background.js` 已提供真实 OpenClaw node 协议路径：

- Gateway challenge：`event/connect.challenge`
- 设备注册：`req/connect`
- 注册成功：`res/hello-ok`
- 远端调用：`event/node.invoke.request` 或 `req/node.invoke`
- 调用回传：`req/node.invoke.result` 或 `res/<node.invoke id>`
- 主动事件：`req/node.event`

下一步重点是用真实远端 Gateway 联调 `browser-extension` node 的 Origin、token、approve flow 和 allowlist。

## 与 Windows exe 路线的关系

浏览器插件路线是新的主线，但不是完全替代 Windows exe。

- 插件适合浏览器上下文。
- Windows exe 适合系统上下文、本地目录、托盘、开机自启动。
- 如果后续需要两者结合，可采用 Extension + Native Messaging + Bondie native host。
