# 归档：Windows exe 宿主路线

日期：2026-05-13

## 背景

之前主线是 Windows 本地宿主 `Bondie.exe`。该程序作为轻量 Windows tray app 常驻，主动连接 macOS OpenClaw Gateway。

旧工作区：

```text
/Users/fuyo-aic/Projects/openclaw-client-host
```

GitHub：

```text
https://github.com/veil-chow-fyaic/openclaw-windows-client-host
```

## 已完成成果

- Windows Forms 托盘宿主。
- `Bondie.exe` 自包含单文件发布。
- 当前用户开机自启动。
- Tailscale / Gateway WSS 连接。
- Pairing / device token / node online。
- Windows 11 Toast 通知。
- Toast 点击回传 `notification.clicked`。
- `Paired` 属于内部授权状态，不应在每次重连时作为用户通知弹出；用户可见通知应只保留业务消息、待批准、拒绝或异常。
- `user.confirm`。
- `files.changes.summary` 元数据统计。
- 可分发 agent skill：`skills/openclaw-bondie`。

## 已发布版本

- `v0.2.0`：Bondie 品牌、单文件 exe、Toast 闭环。
- `v0.3.0-alpha.1`：agent-driven capabilities。
- `v0.3.0-alpha.2`：skill 分发与文档同步。

## 旧路线 TODO

- 短期 bootstrap + 每设备独立 DeviceToken。
- Windows Credential Manager / DPAPI。
- 日志脱敏。
- 更完整 `device.info` / `device.status`。
- 诊断包导出。
- 文件 scope 权限中心。
- 浏览器 Native Messaging 联动。

## 为什么暂停

领导希望优先尝试浏览器插件形态，降低用户侧安装感知，并把能力边界收敛到浏览器上下文。

## 仍然适合 exe 路线的场景

- 系统托盘。
- 开机自启动。
- 本地文件 scope。
- 本地目录变化监听。
- Native Messaging host。
- 浏览器关闭后仍需常驻。
