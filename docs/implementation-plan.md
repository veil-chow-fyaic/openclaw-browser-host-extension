# 实施计划

日期：2026-05-13

## 阶段 0：调研与边界确认

状态：已完成初版。

产出：

- 官方资料调研。
- 纯插件能力边界。
- 与 Windows exe 路线差异。

## 阶段 1：插件 PoC

目标：验证浏览器插件作为 OpenClaw client host 的可行性。

状态：0.1.0-alpha.1 已实现本地自测能力，待真实浏览器加载验证。

范围：

- Manifest V3 插件骨架。
- Gateway URL/token 配置。
- WebSocket 连接骨架。
- 浏览器通知。
- 当前 tab 信息读取。
- 当前页选中文本/正文摘要。
- 下载记录摘要。
- 浏览器内确认弹窗。

验收：

- Chrome/Edge 能加载 unpacked extension。
- 插件能保存配置。
- 插件能显示浏览器通知。
- 插件能读取当前 tab 元信息。
- 插件能通过 content script 获取页面摘要。
- 插件能弹出用户确认窗口并回传结果。

## 阶段 2：Gateway 协议适配

目标：插件注册为 OpenClaw node。

状态：待启动。当前 `background.js` 使用 PoC 消息格式，需与 OpenClaw Gateway 真实 node 协议对齐。

范围：

- pairing/enrollment。
- capability registry。
- node invoke 结果回传。
- 心跳和重连。

验收：

- OpenClaw 能看到 Browser Host node online。
- OpenClaw 能调用 `browser.notify`。
- OpenClaw 能调用 `browser.current_tab.info`。

## 阶段 3：权限和用户体验

目标：让用户明确知道插件在做什么。

范围：

- 权限说明页。
- 用户主动分享当前页面。
- 域名 scope。
- 操作审计。

## 暂缓

- Native Messaging。
- 本地目录监听。
- 全盘文件读取。
- 系统级操作。
