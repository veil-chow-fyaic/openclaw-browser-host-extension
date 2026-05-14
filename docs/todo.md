# TODO

日期：2026-05-14

当前版本：0.1.0-alpha.5

## P0：插件功能

- 完成 Manifest V3 插件骨架。已完成。
- 配置页支持 Gateway URL / token。已完成。
- Popup 展示连接状态。已完成。
- 实现浏览器通知。已完成。
- 实现当前 tab 元信息读取。已完成。
- 实现 content script 页面摘要。已完成。
- 实现下载记录摘要。已完成。
- 实现浏览器内用户确认弹窗。已完成。
- 按 [browser-test-runbook.md](browser-test-runbook.md) 完成 Chrome/Edge 手工验证。Chrome for Testing 已完成，真实 Chrome/Edge Developer mode 待手工复核。
- 0.1.0-alpha.3 已完成 Chrome for Testing 本地烟测；0.1.0-alpha.5 已切到 OpenClaw node-compatible 主线，详见 `docs/test-results/2026-05-14-local-smoke.md`。

## P0：Gateway / Node 连接

- 明确 OpenClaw Gateway node WebSocket path 是否可复用。
- 支持 `browser-extension` node 类型。
- 适配 pairing / device token。
- 增加 WebSocket reconnect。
- 增加 heartbeat。
- 增加 invoke result 回传。
- 当前插件默认 `node-compatible`，Browser Host Protocol 仅作 fallback。
- Tailscale HTTPS `/health` 已验证可达；WebSocket 连接仍待 Gateway node path 和认证格式确认。

## P1：权限和安全

- 避免默认 `<all_urls>`。
- 页面读取走用户主动触发。
- token 改为 bootstrap/enrollment。
- 配置和日志不记录敏感 token。

## P1：体验

- Popup 状态清晰。
- Options 文案解释权限边界。
- 浏览器通知支持点击回传。
- 提供“分享当前页给 OpenClaw”按钮。
- 确认弹窗增加更清晰的来源展示和请求摘要。

## P2：Native Messaging 评估

- 若必须读取本地文件，再设计 Native Messaging。
- 明确 native host 注册和分发方式。
- 与旧 Bondie exe 路线复用能力。

## 暂不做

- 复杂安装器。
- Windows 托盘。
- 开机自启动。
- 任意本地目录扫描。
- 任意命令执行。
