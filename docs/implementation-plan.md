# 实施计划

日期：2026-05-19

## 阶段 0：调研与边界确认

状态：已完成。

产出：

- 官方资料调研。
- 纯插件能力边界。
- 与 Windows exe 路线差异。
- 浏览器插件安装、权限、MV3 service worker 限制说明。

## 阶段 1：浏览器宿主 PoC

状态：已完成 alpha.7。

目标：验证浏览器插件作为 OpenClaw client host 的可行性。

已完成：

- Manifest V3 插件骨架。
- Gateway URL/token 配置。
- OpenClaw node-compatible WebSocket 连接。
- Ed25519 device identity。
- pairing / deviceToken。
- 心跳、重连、paired 与 online 生命周期分离。
- 浏览器通知。
- 当前 tab 信息读取。
- 当前页选中文本/正文摘要。
- 下载记录摘要。
- 浏览器内确认弹窗。

验收结果：

- Chrome 能加载 unpacked extension。
- 插件能保存配置。
- 插件能显示浏览器通知。
- 插件能读取当前 tab 元信息。
- 插件能通过 content script 获取页面摘要。
- 插件能弹出用户确认窗口并回传结果。
- 插件能连接真实 OpenClaw Gateway 并保持在线。

## 阶段 2：产品方向调整

状态：已完成需求整理。

背景：2026-05-15 产品会议明确插件不是单纯通知/远程调用工具，而是浏览器智能工作流 Agent 门户。

新主线：

- Pattern Memory：记忆并复现用户标签页组合习惯。
- Context Capture：浏览内容时一键触发 Agent 记录或处理。
- OpenClaw Recap：OpenClaw 基于历史工作流和当日规划主动推送建议。

产出：

- [product-requirements-2026-05-15.md](product-requirements-2026-05-15.md)
- [todo.md](todo.md)
- [architecture.md](architecture.md)

## 阶段 3：Pattern Memory MVP

状态：待启动。

目标：让插件能记住“这些页面通常一起打开”，并支持一键恢复工作流。

范围：

- 定义 Pattern 数据结构。
- 每小时采集 tabs/windows 快照。
- 本地存储快照与 Patterns。
- 简单共现分析。
- 手动保存当前窗口为 Pattern。
- Popup 展示 Patterns。
- 一键打开 Pattern。
- 打开匹配页面时生成候选建议。

验收：

- 手动保存当前窗口后，可在 popup 看到 Pattern。
- 点击 Pattern 可打开对应链接。
- 多次快照后，可自动生成候选 Pattern。
- 打开 Pattern 中任一页面时，插件能提示关联链接。
- 用户可关闭采集、清空本地数据。

## 阶段 4：Context Capture MVP

状态：待启动。

目标：用户浏览任意页面时，可在上下文内把页面信息发送给 OpenClaw。

范围：

- Popup 增加“发送当前页给 OpenClaw”。
- 支持记录、总结、保存选中文本、关联到当前工作。
- 上报当前 URL、title、selectedText、textPreview、capturedAt。
- 通过 OpenClaw node event 发送。
- UI 展示成功/失败结果。

验收：

- 用户主动点击 capture 后，OpenClaw 能收到 `browser.context.capture`。
- 未经用户主动触发时，插件不读取页面正文。
- Capture 失败时用户能看到错误原因。

## 阶段 5：OpenClaw Recap / Suggestion

状态：待设计接口。

目标：OpenClaw 能基于 Recap 主动给插件推送链接建议，插件展示并回传用户反馈。

范围：

- 定义 `browser.suggestion.show`。
- 定义 accept/dismiss feedback。
- 定义 Pattern / Context Capture 事件输入。
- 实现建议 UI。
- 实现打开全部/打开部分/忽略。

验收：

- OpenClaw 可推送一组建议链接。
- 插件可展示建议。
- 用户接受建议后插件打开链接并回传 accepted。
- 用户忽略建议后插件回传 dismissed。

## 阶段 6：产品化与分发

状态：待启动。

范围：

- 命名和品牌决策：OpenClaw Browser Host / The Tailor / Bondie。
- Logo 和视觉。
- Chrome Web Store / Edge Add-ons 文案。
- 权限说明和隐私政策。
- 内测升级说明。
- 长时间稳定性测试。

## 暂缓

- Native Messaging。
- 本地目录监听。
- 全盘文件读取。
- 系统级操作。
- 多 Agent 全量兼容。
