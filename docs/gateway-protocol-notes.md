# Gateway 协议对齐记录

日期：2026-05-13

## 当前状态

插件 `background.js` 已实现 Browser Host Protocol：

- `browser.host.register`
- `browser.host.registered`
- `browser.host.heartbeat`
- `browser.host.pong`
- `browser.host.invoke`
- `browser.host.invoke.result`
- `browser.host.event`

同时保留兼容消息：

- `browser.host.hello`
- `node.invoke`
- `node.invoke.result`

这条路线不强制使用 OpenClaw node。OpenClaw 服务侧可以新增 Browser Host endpoint，按 `hostId` 管理浏览器插件宿主。

2026-05-14 本地测试：

- `https://fuyo-aicmac-mini.tailc6f104.ts.net/health` 可达。
- 插件 WebSocket 连接现有 Gateway 返回 `WebSocket error`。
- 下一步需要新增或确认 Browser Host WebSocket endpoint、认证方式和 register 消息格式。

## 插件当前声明能力

- `browser.notify`
- `browser.current_tab.info`
- `browser.current_tab.extract`
- `browser.downloads.summary`
- `user.confirm`

## Browser Host Protocol v1 草案

### register

插件连接后发送：

```json
{
  "type": "browser.host.register",
  "protocolVersion": 1,
  "hostId": "<stable-extension-host-id>",
  "hostName": "OpenClaw Browser Host",
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
  "type": "browser.host.registered",
  "hostId": "<stable-extension-host-id>",
  "accepted": true
}
```

### invoke

服务侧调用插件能力：

```json
{
  "type": "browser.host.invoke",
  "id": "req_123",
  "command": "browser.current_tab.info",
  "args": {}
}
```

插件返回：

```json
{
  "type": "browser.host.invoke.result",
  "id": "req_123",
  "hostId": "<stable-extension-host-id>",
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

1. Browser Host endpoint path，例如 `/browser-host/ws`。
2. Pairing/enrollment 使用 BootstrapToken，还是 BrowserHostToken。
3. `hostId` 是否由插件生成并持久化。
4. 服务侧是否需要 approve flow。
5. capability registry 是否直接使用 register 中的 capabilities。
6. heartbeat/ping/pong 频率。
7. 浏览器 service worker 断线重连后，host identity 是否复用。
8. 是否需要继续兼容 OpenClaw node 协议。

## 建议方向

优先新增 Browser Host endpoint，不强制复用现有 node 协议。这样更贴合浏览器插件路线，也避免把浏览器能力套进 Windows node 模型。

建议保持：

- per-extension hostId。
- bootstrap/enrollment。
- hostToken 持久化在 `chrome.storage.local`。
- 能力 allowlist 明确上报。
- invoke result 和 event 都带 requestId。
