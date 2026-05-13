# Gateway 协议对齐记录

日期：2026-05-13

## 当前状态

插件 `background.js` 已实现内部 PoC 消息格式：

- `browser.host.hello`
- `node.invoke`
- `node.invoke.result`
- `browser.host.event`

这只是浏览器宿主本地开发格式，后续需要与 OpenClaw Gateway 的真实 node 协议对齐。

## 插件当前声明能力

- `browser.notify`
- `browser.current_tab.info`
- `browser.current_tab.extract`
- `browser.downloads.summary`
- `user.confirm`

## 需要向 Gateway 确认的问题

1. Browser extension 是否复用现有 Windows node WebSocket 协议。
2. Pairing/enrollment 使用 GatewayToken、BootstrapToken，还是新的 BrowserToken。
3. Node hello/register 消息格式。
4. Capability registry 格式。
5. Invoke request/response 格式。
6. Node event 格式。
7. Heartbeat/ping/pong 机制。
8. 浏览器 service worker 断线重连后，device identity 是否复用。

## 建议方向

优先复用现有 node 协议，避免为 browser host 单独造一套 Gateway 协议。

如果必须新增 browser node 类型，建议保持：

- per-extension deviceId。
- bootstrap/enrollment。
- deviceToken 持久化在 `chrome.storage.local`。
- 能力 allowlist 明确上报。
- invoke result 和 event 都带 requestId。
