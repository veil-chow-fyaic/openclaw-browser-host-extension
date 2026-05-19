# 浏览器智能工作流 Agent 产品化需求整理

日期：2026-05-19

来源会议：`/Users/fuyo-aic/Documents/AIC-000/录音/会议纪要/0515-浏览器智能工作流-Agent-产品化方案探讨.md`

会议主题：浏览器智能工作流 Agent 产品化方案探讨

## 一句话结论

浏览器插件路线不再只是 OpenClaw 的浏览器侧宿主，而应升级为浏览器智能工作流 Agent 门户。首期仍优先连接 OpenClaw，但产品核心从“通知和远程调用”转为：

- Pattern Memory：记忆用户真实浏览工作流，识别经常一起打开的标签页组合，并在合适时机建议一键打开。
- Context Capture：用户浏览任意页面时，可在上下文内一键把当前页面、选中文本、摘要或链接发送给 Agent 记录、总结或处理。
- Agent Push / Recap：OpenClaw 基于 Recap、规划和历史上下文，主动向插件推送今日可能需要继续打开或处理的链接。

通知仍然保留，但定位降级为辅助通道，不是产品主线。

## 当前现状

已完成的技术 PoC：

- Chrome / Edge Manifest V3 插件骨架。
- Popup / Options / Background service worker / Content script。
- OpenClaw node-compatible WebSocket 长连接。
- Ed25519 device identity、pairing、deviceToken 持久化。
- invoke/result/event 基础协议。
- 浏览器通知、点击回传、当前 tab、页面摘要、下载摘要、用户确认。
- paired 与 online 生命周期分离，避免重连时反复出现“已配对”类用户通知。
- zip 内测分发脚本和快速安装文档。

尚未完成的产品能力：

- 没有 Pattern 数据模型。
- 没有定时 tab/window 快照。
- 没有关联规则提取。
- 没有“为你打开”建议 UI。
- 没有用户主动保存当前 Pattern 的入口。
- 没有 Context Capture 的产品化入口和 Agent 指令模板。
- 没有 OpenClaw Recap 接口规范。
- 没有每日首次打开浏览器/打开特定页面时的主动建议机制。
- 没有多 Agent adapter 抽象。
- 没有 The Tailor 品牌化 UI 和说明。

## 产品定位

产品定位：浏览器智能工作流 Agent 门户。

插件应作为用户浏览器内的轻量入口，尽量把 Agent 能力嵌入用户当前上下文，减少在浏览器、聊天窗口、后台系统、文档系统之间来回切换。

首期支持 OpenClaw。架构上保留 Agent adapter 边界，后续可由社区或内部继续接入 Harmony、Mercury 等 Agent。

## 核心用户场景

### 场景 1：工作流 Pattern 记忆

用户经常把多个相关页面作为一个工作单元同时打开，例如：

- OpenClaw 控制台 + 本地 localhost 应用。
- GitHub 仓库 + 对应项目管理页。
- 飞书应用 + 飞书开发者后台。
- Rose Cloud 相关多个后台。

插件应观察这些共现关系，提取“这几个页面通常一起打开”的 Pattern。用户再次打开其中一个页面时，插件提示是否一键打开其他相关页面。

### 场景 2：主动“为你打开”

在合适时机，插件应提供低打扰建议：

- 每日首次打开浏览器时，根据 OpenClaw Recap 推荐今日可能继续使用的链接。
- 打开某个已知工作页面时，提示“你通常还会打开这些页面”。
- 用户从历史项目上下文返回时，建议恢复昨日或上次工作流。

### 场景 3：上下文捕获

用户浏览任意页面时，可以一键让 Agent 处理当前上下文：

- 记录当前页面到 OpenClaw Recap。
- 摘要当前页面。
- 保存选中文本。
- 把当前页面关联到某个项目或任务。
- 后续让 Agent 基于这些浏览上下文继续推送建议。

### 场景 4：Agent 主动推送

OpenClaw 可基于 Recap、任务、日程或用户历史行为，向插件推送建议：

- 今日要继续看的页面。
- 某个项目相关的后台入口。
- 昨天未完成的页面集合。
- Agent 判断当前页面相关的下一步动作。

插件负责展示建议、打开链接、回传用户操作结果。

## 功能需求

### P0：Pattern Memory MVP

- 采集浏览器窗口和标签页快照。
- 默认每小时采集一次快照。
- 采集粒度首期控制在 URL origin / hostname / title，不采集页面正文。
- 记录 windowId、tabId、url、title、active、pinned、timestamp。
- 基于快照提取域名级或 URL 级共现关系。
- 生成 Pattern：
  - id
  - name
  - urls
  - origins
  - confidence
  - firstSeenAt
  - lastSeenAt
  - useCount
  - source：auto / manual / agent
- 支持用户手动保存当前窗口为 Pattern。
- 支持用户在 popup 中查看最近识别的 Patterns。
- 支持一键打开 Pattern 中的链接。

### P0：Context Capture MVP

- Popup 提供“发送当前页给 Agent”入口。
- 支持捕获：
  - 当前 URL
  - title
  - selected text
  - page text preview
  - capturedAt
- 支持用户选择 capture 类型：
  - 记录
  - 总结
  - 关联到当前工作
  - 稍后继续
- 通过 OpenClaw node event 或 invoke result 上报。
- 保持用户主动触发，不默认读取全站页面内容。

### P0：OpenClaw Recap 接口草案

插件需要和 OpenClaw 约定最小接口：

- `browser.pattern.snapshot`：上报浏览器快照摘要。
- `browser.pattern.detected`：上报识别出的 Pattern。
- `browser.pattern.opened`：用户打开某个 Pattern。
- `browser.context.capture`：用户主动捕获当前页面。
- `browser.suggestion.show`：OpenClaw 推送建议给插件展示。
- `browser.suggestion.accepted`：用户接受建议。
- `browser.suggestion.dismissed`：用户忽略建议。

首期可以先走现有 `req/node.event` 和 `event/node.invoke.request`，不额外发明新传输层。

### P1：主动建议 UI

- 每日首次打开浏览器时展示今日建议。
- 打开匹配 Pattern 的页面时展示关联链接建议。
- 建议 UI 应轻量、可关闭、不过度打扰。
- 支持用户反馈：
  - 打开全部
  - 只打开某几个
  - 不再提示这个 Pattern
  - 稍后提醒

### P1：Pattern 管理

- Pattern 列表页。
- 编辑 Pattern 名称。
- 删除 Pattern。
- 合并相似 Pattern。
- 固定常用 Pattern。
- 禁用某些域名参与 Pattern 学习。

### P1：权限与隐私

- 默认不采集页面正文。
- 默认不上传完整浏览历史。
- 快照数据尽量本地存储，上传前做摘要化。
- 用户可暂停采集。
- 用户可清空 Pattern 数据。
- 用户可配置允许采集的站点 scope。
- 明确说明数据会发给哪个 Agent。

### P2：多 Agent adapter

- 抽象 AgentProvider：
  - name
  - connection status
  - capabilities
  - sendEvent
  - invoke
  - showSuggestion
- 首期只实现 OpenClawProvider。
- Harmony / Mercury 后续作为 adapter 扩展，不在 MVP 阶段实现。

### P2：品牌与分发

- 产品品牌从 OpenClaw Browser Host 过渡到 The Tailor / Bondie 相关命名需要单独决策。
- The Tailor 作为工作室品牌；插件是工作室首个浏览器智能工作流产品。
- 需要 Logo、扩展商店描述、隐私政策、官网/域名落点。

## 非目标

首期不做：

- 任意本地目录扫描。
- 浏览器关闭后的常驻能力。
- 全量浏览历史上传。
- 全站默认内容读取。
- 多 Agent 全量兼容。
- 复杂安装器。
- Native Messaging。

## 关键设计原则

- 情境内交互：用户正在浏览哪里，Agent 能力就出现在哪里。
- 低打扰：建议应可忽略，不要用系统通知承载所有事情。
- 用户主动授权：内容读取、Pattern 上传、Agent 处理都需要清晰边界。
- 本地优先：Pattern 学习先在插件本地完成，上传摘要和用户确认过的事件。
- 单一主线：MVP 只服务 Pattern Memory 和 Context Capture，通知是辅助能力。
- 协议复用：继续复用 OpenClaw node 协议，避免另起传输层。

## 近期验收标准

下一阶段 MVP 可按以下标准验收：

1. 插件能每小时保存一次 tabs/windows 快照。
2. 插件能手动保存当前窗口为 Pattern。
3. 插件能展示本地 Pattern 列表并一键打开。
4. 插件能基于简单共现规则自动生成候选 Pattern。
5. 插件能在打开匹配页面时提示相关链接。
6. 插件能把当前页作为 Context Capture 发送给 OpenClaw。
7. OpenClaw 能向插件下发一条建议，插件展示并回传 accept/dismiss。
8. 所有采集能力都有开关和清空入口。

## 风险

- Chrome Web Store 对浏览数据权限较敏感，需要提前设计权限说明和隐私政策。
- MV3 service worker 生命周期会影响定时采集和长连接稳定性，需要用 alarms / storage / reconnect 设计兜底。
- Pattern 学习如果过度复杂，会拖慢 MVP。首期只做共现频率和用户手动保存。
- 多 Agent 兼容过早做会导致抽象膨胀。首期只抽边界，不实现多个 provider。
- 品牌命名如果未定，会影响扩展商店、包名、文案和视觉资产。
