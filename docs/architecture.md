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

## Gateway 连接

插件 service worker 直接连接 OpenClaw Gateway：

```text
Extension service worker -> wss://<openclaw-gateway>
```

注意：

- 纯插件不开放本地端口。
- 插件 service worker 生命周期由浏览器管理。
- WebSocket 断开后需重连。
- 首版可使用 GatewayToken，产品化应改为短期 bootstrap + per-extension device token。

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
- 当前 PoC 不默认注入全站 content script；用户在 popup 中主动触发页面摘要时才通过 `chrome.scripting.executeScript` 注入。

## 与 Windows exe 路线的关系

浏览器插件路线是新的主线，但不是完全替代 Windows exe。

- 插件适合浏览器上下文。
- Windows exe 适合系统上下文、本地目录、托盘、开机自启动。
- 如果后续需要两者结合，可采用 Extension + Native Messaging + Bondie native host。
