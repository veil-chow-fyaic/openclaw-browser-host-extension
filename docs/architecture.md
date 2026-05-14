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

## Browser Host 连接模型

插件 service worker 直接连接 OpenClaw 服务侧入口：

```text
Extension service worker -> wss://<openclaw-browser-host-endpoint>
```

注意：

- 纯插件不开放本地端口。
- 插件 service worker 生命周期由浏览器管理。
- WebSocket 断开后需重连。
- 首版可使用 token，产品化应改为短期 bootstrap + per-extension host token。
- 插件不强制注册为 OpenClaw node；可以使用独立 Browser Host Protocol。

## Browser Host Protocol

推荐先按独立宿主协议做，不强依赖现有 OpenClaw node：

```text
browser.host.register
browser.host.registered
browser.host.heartbeat
browser.host.pong
browser.host.invoke
browser.host.invoke.result
browser.host.event
```

插件本地持久化一个 `hostId`，类似之前 Windows exe 的 device identity。服务侧可以按 `hostId` 管理授权、能力、在线状态和撤销。

当前插件也保留 `node-compatible` 配置选项，方便后续如果决定复用 OpenClaw node 协议时做兼容。

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

`background.js` 已提供命令分发层：

- Browser Host 输入：`browser.host.invoke`
- Browser Host 输出：`browser.host.invoke.result`
- 兼容输入：`node.invoke`
- 兼容输出：`node.invoke.result`
- 事件：`browser.host.event`

下一步重点是服务侧提供 browser host endpoint，而不是必须把插件塞进现有 node。

## 与 Windows exe 路线的关系

浏览器插件路线是新的主线，但不是完全替代 Windows exe。

- 插件适合浏览器上下文。
- Windows exe 适合系统上下文、本地目录、托盘、开机自启动。
- 如果后续需要两者结合，可采用 Extension + Native Messaging + Bondie native host。
