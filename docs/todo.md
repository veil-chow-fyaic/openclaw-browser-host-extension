# TODO

日期：2026-05-13

## P0：插件功能

- 完成 Manifest V3 插件骨架。
- 配置页支持 Gateway URL / token。
- Popup 展示连接状态。
- 实现浏览器通知。
- 实现当前 tab 元信息读取。
- 实现 content script 页面摘要。
- 实现下载记录摘要。

## P0：Gateway 连接

- 明确 OpenClaw Gateway 对 browser node 的注册协议。
- 适配 pairing / device token。
- 增加 WebSocket reconnect。
- 增加 heartbeat。
- 增加 invoke result 回传。

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
