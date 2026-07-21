# 更新日志

## v7.7.2 (2026-07-22)

- 🔧 **Electron API_BASE 修复** — 新建 `api-base.ts` 统一入口，生产模式自动切换 `https://api.bilibili.com` 绝对 URL，解决 file:// 协议下代理失效
- 📦 **下载弹窗 React 化** — 新建 `DownloadChoiceDialog.tsx`，替换 ~160 行原生 DOM 操作，支持 Escape/遮罩关闭/淡入缩放动画
- 🧩 **LoginPanel 拆分** — 1131 行 → 6 文件（主容器 184 行 + 5 子组件：QrLoginTab / PasswordLoginTab / SmsLoginTab / LoggedInView / InputField）
- 🧹 **QN_LABELS 去重** — 删除 download-manager 中重复的 QN_TO_LABEL，统一使用 bilibili-api 导出的 QN_LABEL_MAP
- 🎨 **keyframes 去重** — 5 个组件内 `<style>` 注入的 @keyframes 迁移到 `index.css`（card-enter / dialog-fade-in / dialog-scale-in / panel-slide-in），删除与 Tailwind 重复的 spin

## v7.7.1 (2026-07-22)

- 📄 关于页完全重设计 — 版本号 / 更新日志 / 10 张功能卡片
- 🖥️ 浏览器版 vs 桌面版功能对比表（自动检测当前环境）
- 🐛 修复退出登录后 cookieUsername 未清除的 bug
- 🧹 `isElectron()` 去重 → 统一 `src/utils/env.ts`

## v7.7.0 (2026-07-22)

- 🎛️ 下载方案（预设）系统：保存 / 更新 / 重命名 / 删除 / 一键切换
- 📋 全站复制按钮：标题 · BV 号 · 链接 · 错误信息
- 🚪 退出登录 / 更换账号菜单
- 🗓 历史记录日期范围筛选
- ➕ 文件名模板变量插入下拉面板（8 个变量）
- 📝 下载模式 hint 直白化
- 🔄 重复视频智能重排队（已完成/已暂停 → 重新排队）

## v7.6.0 (2026-07-20)

- 🎨 设置页下拉菜单 UI 修复
- 📝 文件名模板扩展
- ✕ 弹窗关闭按钮
- ⚡ Electron 双流并行下载
- 📂 历史记录 JSON 导入/导出

## v7.5.0 (2026-07-18)

- 🔀 下载格式系统拆分（视频格式 / 音频格式独立选择）
- 🎨 设置页 UI 重设计
- 📝 字幕独立下载
- 🌙 暗色主题全面修复
- 🎨 5 色主题选择器

## v7.1.0 (2026-07-15)

- 🔧 FFmpeg 自动下载与检测
- 🧩 极验验证码（GeeTest 滑块）
- 📚 多 P 视频拆分
- 📄 分页 API 泛型化
- ☀️ 亮色主题适配

## v7.0.0 (2026-07-01)

- 🎉 Java Swing → Electron + React + TypeScript 全面重写
- 🎨 Windows 11 Fluent Design
- 🔐 三种登录方式（QR 码 / 密码 / 短信）
- 📦 批量下载队列
