# 浏览器插件宿主调研

日期：2026-05-13

## 调研问题

领导希望把 OpenClaw 客户侧宿主从 Windows 本地 exe 改成 Chrome / Edge 浏览器插件形态。核心问题是：纯浏览器插件能覆盖哪些能力，哪些能力必须借助本地组件。

## 官方资料依据

- Chrome Native Messaging 官方文档：扩展可通过 native messaging 与本地应用通信；Chrome 会以独立进程启动 native host，Windows 上 native host manifest 需要注册到注册表；扩展需声明 `nativeMessaging` 权限。来源：[Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)。
- Edge Native Messaging 官方文档：Edge 同样要求 native messaging host manifest，并说明浏览器不负责安装或管理 native host manifest；Windows 上需注册表指向 manifest。来源：[Microsoft Edge Native Messaging](https://learn.microsoft.com/en-us/microsoft-edge/extensions/developer-guide/native-messaging)。
- Chrome Manifest V3 service worker 生命周期：Chrome 116 起，扩展 service worker 中的 WebSocket 收发会延长 service worker 生命周期，但 service worker 仍由浏览器生命周期管理。来源：[Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)。
- Chrome notifications API：扩展可声明 `notifications` 权限并创建系统托盘通知。来源：[chrome.notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications)。
- Chrome storage API：`chrome.storage.local` 适合存储扩展本地配置，默认上限 10MB。来源：[chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)。
- Chrome tabs API：`tabs` 权限可访问 tab 的敏感属性，`activeTab` 可在用户触发后临时授予当前 tab 访问能力。来源：[chrome.tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)。
- Chrome content scripts：内容脚本可在页面上下文中读取 DOM，并通过消息传递与扩展 service worker 通信。来源：[Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)。

## 能力边界

### 纯插件可做

- OpenClaw 到浏览器通知：`chrome.notifications`。
- 当前 tab 元信息：title、url、favIconUrl。
- 用户主动分享当前页。
- 内容脚本读取页面标题、选中文本、正文片段。
- 下载记录摘要：基于 `chrome.downloads` 元数据。
- 浏览器内配置：`chrome.storage.local`。
- 与 Gateway 建立 WebSocket：由 extension service worker 管理，需处理生命周期与重连。

### 纯插件不适合做

- 浏览器关闭后常驻。
- Windows 托盘。
- 开机自启动。
- 任意本地目录扫描。
- 读取任意本地文件内容。
- 系统级操作或进程管理。

### 需要 Native Messaging 才能做

- 安全的本地文件 scope。
- 本地目录变化监听。
- 系统托盘/本地 app 深度集成。
- 调用本机受控能力。

但 Native Messaging 需要本地安装和注册 native host，和“只装浏览器插件”的目标存在冲突。

## 架构建议

第一阶段采用纯插件：

- 验证 OpenClaw Gateway 与插件 WebSocket 链路。
- 实现通知、当前页面、用户确认、下载摘要。
- 不承诺本地目录扫描。

第二阶段再决策是否引入 Native Messaging：

- 如果用户强需求是“浏览器页面能力”，继续纯插件。
- 如果用户强需求是“本地文件/系统能力”，回到混合方案：Extension + Native Host。

## 关键风险

- MV3 service worker 生命周期会影响长连接稳定性，需要重连和状态恢复。
- 扩展权限声明过宽会影响 Chrome Web Store / Edge Add-ons 审核体验。
- 远程 Gateway token 不应明文散落，需要 bootstrap/enrollment。
- 页面内容读取必须有用户授权和域名 scope。
