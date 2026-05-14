# 本地浏览器插件烟测记录

日期：2026-05-14
版本：0.1.0-alpha.6

## 环境

- macOS 本机。
- Playwright Chrome for Testing。
- 插件目录：`extension/`。
- 测试页面：`https://example.com/`。
- Gateway URL：`wss://fuyo-aicmac-mini.tailc6f104.ts.net`。

## 结果摘要

通过：

- Manifest JSON 校验。
- JS 语法检查。
- Chrome for Testing 加载 unpacked extension。
- 首次加载生成稳定 `browserHostIdentity.hostId`。
- Options 保存 Gateway URL / Node name / autoConnect。
- Popup 当前 Tab 获取。
- 页面摘要：用户授权 `example.com` 后成功读取 title/url/textPreview。
- 下载摘要。
- 浏览器通知。
- 浏览器内 `user.confirm` 确认弹窗。
- Tailscale HTTPS `/health` 可达。
- 本地 mock Gateway 验证真实 OpenClaw node 协议：
  - 插件收到 `connect.challenge`。
  - 插件生成并持久化 Ed25519 设备身份。
  - mock Gateway 按 Windows node 同款 payload 验证签名成功。
  - 插件发送 `connect`，包含 `caps`、`commands`、`auth`、`device.publicKey`、`device.signature`。
  - mock Gateway 返回 `hello-ok` 后，插件保存 `browserDeviceToken`。
  - mock Gateway 下发 `node.invoke.request` 调用 `browser.notify`，插件返回 `node.invoke.result`。

未通过 / 待对齐：

- 远端真实 Gateway 尚未完成插件联调。
- 原因判断：插件侧已对齐 Windows node 真实 JSON-RPC 握手形态，下一步需要用真实 OpenClaw Gateway 验证 node WebSocket path、Origin 策略、GatewayToken/BootstrapToken 和 approve 流程。

## 关键输出

当前 Tab：

```json
{
  "ok": true,
  "payload": {
    "title": "Example Domain",
    "url": "https://example.com/"
  }
}
```

页面摘要：

```json
{
  "ok": true,
  "payload": {
    "title": "Example Domain",
    "url": "https://example.com/",
    "selection": "",
    "textPreview": "Example Domain This domain is for use in documentation examples without needing permission. Avoid use in operations. Learn more"
  }
}
```

确认弹窗：

```json
{
  "ok": true,
  "payload": {
    "confirmed": true,
    "action": "confirmed"
  }
}
```

Gateway health：

```json
{
  "ok": true,
  "status": "live"
}
```

## 注意事项

- 访问 Tailscale `.ts.net` 地址时需要绕过本机 HTTP proxy；`curl --noproxy '*'` 可成功访问。
- 浏览器实际使用中也可能需要确认系统代理没有拦截 Tailscale 流量。
- 页面摘要第一次访问站点会触发站点权限授权，需要用户手动允许。
- 0.1.0-alpha.6 起，插件默认按 OpenClaw Windows node 同款 Gateway 协议管理 Ed25519 device identity、签名 `connect`、deviceToken、invoke/result；Browser Host Protocol 仅保留为 fallback。
