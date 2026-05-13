# 浏览器插件手工测试 Runbook

日期：2026-05-13
版本：0.1.0-alpha.1

## 目标

验证 OpenClaw Browser Host Extension 能在 Chrome / Edge 中作为 unpacked extension 加载，并完成浏览器侧宿主 PoC 的基础能力测试。

## 前置条件

- Chrome 116+ 或 Edge 116+。
- 本地仓库已拉取：

```text
/Users/fuyo-aic/Projects/openclaw-browser-host-extension
```

## 加载插件

Chrome:

1. 打开 `chrome://extensions`。
2. 开启 Developer mode。
3. 点击 Load unpacked。
4. 选择：

```text
/Users/fuyo-aic/Projects/openclaw-browser-host-extension/extension
```

Edge:

1. 打开 `edge://extensions`。
2. 开启 Developer mode。
3. 点击 Load unpacked。
4. 选择 `extension/` 目录。

## 基础测试

### 配置页

1. 打开插件 Options。
2. 填写 Gateway URL、Token、Node name。
3. 点击保存。
4. 重新打开 Options，确认配置仍在。

### Popup 自测

打开任意普通网页后，点击插件图标：

- 点击“测试通知”，浏览器应出现通知。
- 点击“当前 Tab”，结果应包含当前页面 title/url。
- 点击“页面摘要”，结果应包含 title/url/selection/textPreview。
- 点击“下载摘要”，结果应返回最近下载元数据。
- 点击“确认弹窗”，应弹出确认窗口，点击允许/拒绝后返回结果。

## Gateway 测试

当前 Gateway 消息格式仍是 PoC，尚未对齐真实 OpenClaw browser node 协议。

可先验证：

- Gateway URL 为空时，连接按钮返回明确错误。
- Gateway URL 指向可用 WebSocket echo/server 时，状态可进入连接。
- 断开按钮会关闭连接。

## 预期限制

- 页面摘要仅在用户点击 popup 后触发。
- 不默认请求 `<all_urls>`。
- 浏览器关闭后插件不常驻。
- 不能读取任意本地目录。
- 下载摘要只返回下载记录元数据。

## 失败排查

- 如果“页面摘要”失败，确认当前页面不是 `chrome://`、`edge://`、扩展商店、PDF viewer 等受限页面。
- 如果通知不出现，检查系统通知权限和浏览器通知权限。
- 如果 service worker 异常，打开扩展详情页，点击 service worker inspect 查看 Console。
