# Gateway 协议对齐记录

日期：2026-05-13

## 当前状态

主线改为复用 OpenClaw node 后端，浏览器插件作为一种新的 node 类型：`browser-extension`。

插件 `background.js` 当前默认 `node-compatible`：

- `node.register`
- `node.registered`
- `node.heartbeat`
- `node.pong` / `pong`
- `node.invoke`
- `node.invoke.result`

同时保留 Browser Host Protocol fallback：

- `browser.host.register`
- `browser.host.registered`
- `browser.host.heartbeat`
- `browser.host.pong`
- `browser.host.invoke`
- `browser.host.invoke.result`
- `browser.host.event`

这样浏览器插件和 Windows/exe 可以共享同一套 pairing、identity、invoke/event、审计、权限模型。

2026-05-14 本地测试：

- `https://fuyo-aicmac-mini.tailc6f104.ts.net/health` 可达。
- 插件 WebSocket 连接现有 Gateway 返回 `WebSocket error`。
- 下一步需要确认 Gateway 是否已有 node WebSocket path 可供 browser-extension 复用，以及 register/认证消息格式。

## 插件当前声明能力

- `browser.notify`
- `browser.current_tab.info`
- `browser.current_tab.extract`
- `browser.downloads.summary`
- `user.confirm`

## Browser Extension Node 草案

### register

插件连接后发送 node-compatible register：

```json
{
  "type": "node.register",
  "protocolVersion": 1,
  "deviceId": "<stable-extension-host-id>",
  "deviceName": "OpenClaw Browser Host",
  "nodeType": "browser-extension",
  "platform": "browser",
  "runtime": "chrome-extension-mv3",
  "token": "<optional-bootstrap-or-host-token>",
  "capabilities": [
    "browser.notify",
    "browser.current_tab.info",
    "browser.current_tab.extract",
    "browser.downloads.summary",
    "user.confirm"
  ]
}
```

服务侧返回：

```json
{
  "type": "node.registered",
  "deviceId": "<stable-extension-host-id>",
  "accepted": true
}
```

### invoke

服务侧调用插件能力：

```json
{
  "type": "node.invoke",
  "id": "req_123",
  "command": "browser.current_tab.info",
  "args": {}
}
```

插件返回：

```json
{
  "type": "node.invoke.result",
  "id": "req_123",
  "command": "browser.current_tab.info",
  "ok": true,
  "payload": {}
}
```

### event

插件主动上报：

```json
{
  "type": "browser.host.event",
  "event": "notification.clicked",
  "payload": {}
}
```

## 需要向服务侧确认的问题

1. 现有 OpenClaw node WebSocket path 是否可直接复用。
2. Pairing/enrollment 使用 BootstrapToken，还是 GatewayToken。
3. `hostId` 是否由插件生成并持久化，再映射为 deviceId/nodeId。
4. 服务侧是否需要 approve flow。
5. capability registry 是否直接使用 register 中的 capabilities。
6. heartbeat/ping/pong 频率。
7. 浏览器 service worker 断线重连后，device identity 是否复用。
8. 浏览器 node 的 capabilities 是否要归类到 `browser` category。
9. Browser Host Protocol fallback 是否需要独立 endpoint，例如 `/browser-host/ws`。

## 建议方向

优先复用 OpenClaw node 后端。浏览器插件与 Windows/exe 共用后端服务、CLI、agent skill、审计和权限体系，长期维护成本更低。

建议保持：

- per-extension hostId/deviceId。
- bootstrap/enrollment。
- deviceToken 持久化在 `chrome.storage.local`。
- 能力 allowlist 明确上报。
- invoke result 和 event 都带 requestId。
