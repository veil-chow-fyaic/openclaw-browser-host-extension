# 本地浏览器插件烟测记录

日期：2026-05-14
版本：0.1.0-alpha.5

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

未通过 / 待对齐：

- Extension WebSocket 连接当前 Gateway 返回 `WebSocket error`。
- 原因判断：插件已默认走 OpenClaw node-compatible，但服务侧仍需确认可复用的 node WebSocket path、register 消息格式和认证方式。

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
- 0.1.0-alpha.5 起，插件默认按 OpenClaw `browser-extension` node 管理 `hostId`、register、heartbeat、invoke/result；Browser Host Protocol 仅保留为 fallback。
