<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Luo-Feng6/bibilidown/master/build/icon-256.png">
  <img alt="BibiliDown" src="https://raw.githubusercontent.com/Luo-Feng6/bibilidown/master/build/icon-256.png" width="80" align="right">
</picture>

# BibiliDown

B 站视频下载工具 — 浏览器直接使用 + Electron 桌面版

[![Version](https://img.shields.io/badge/version-v7.7.4-9cf)](https://github.com/Luo-Feng6/bibilidown/releases)
[![Test](https://img.shields.io/badge/tests-55%20passed-brightgreen)](https://github.com/Luo-Feng6/bibilidown/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-zero%20errors-blue)](https://github.com/Luo-Feng6/bibilidown)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/Luo-Feng6/bibilidown/releases)
[![Electron](https://img.shields.io/badge/Electron-43-47848f?logo=electron)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)

> 从 [nICEnnnnnnnLee/BibiliDown](https://github.com/nICEnnnnnnnLee/BibiliDown)（Java Swing）完全重写的现代版本 — 全新的 UI、完整的类型安全、55 个单元测试。

---

## 两种使用方式

| | 🌐 浏览器版 | 🖥️ 桌面版 |
|---|---|---|
| 获取方式 | `git clone` + 开发运行 | [下载安装包](https://github.com/Luo-Feng6/bibilidown/releases) |
| 前置要求 | Node.js ≥ 18 | 无需额外安装 |
| 启动方式 | `npm run dev` → 浏览器打开 | 双击桌面图标 |
| 视频下载 | ✅（走本地代理） | ✅（直连 CDN） |
| FFmpeg 合并 | 手动配置路径 | 内置自动检测 |
| 下载路径 | 浏览器下载目录 | 任意文件夹 |
| 系统托盘 | — | ✅ |
| 开机自启 | — | ✅ |
| 原生对话框 | — | ✅ |

> 💡 浏览器版计划部署到线上（Vercel / GitHub Pages），届时打开链接即可使用。

---

## 功能一览

### 📥 视频下载
- **14 级清晰度**：240P / 360P / 480P / 720P / 1080P / 1080P+ / 1080P60 / 4K / 8K / 杜比视界 / HDR / 全景声
- **DASH 音视频分离下载**：视频 (.m4v) + 音频 (.m4a) + FFmpeg 自动合并 (.mp4)
- **FLV 单流下载**：兼容旧格式，单文件直接下载
- **多 P 拆分**：自动识别分 P，每 P 独立下载，批量加入队列
- **弹幕下载**：XML 格式弹幕 + 实时弹幕
- **字幕下载**：JSON + SRT 双格式字幕独立下载
- **下载方案**：保存多套清晰度/格式/路径配置，一键切换

### 🔗 输入格式
输入框支持 7 种 B 站链接 / ID 格式，自动识别并解析：

| 格式 | 示例 | 说明 |
|------|------|------|
| BV 号 | `BV1xx41c7eD` 或 `av170001` | 单个视频 |
| ep 号 | `ep12345` | 番剧 / 影视剧集 |
| ss 号 | `ss12345` | 番剧 / 影视整季 |
| md 号 | `md12345` | 媒体合集 |
| ml 号 | `ml12345` | 收藏夹，支持分页加载 |
| b23.tv | `https://b23.tv/xxxxx` | 短链接自动跳转 |
| 完整 URL | `https://www.bilibili.com/video/BV...` | 直接粘贴链接 |

### 🔐 登录系统
- **QR 码登录**：扫码即登，最快捷
- **密码登录**：手机号/邮箱 + 密码
- **短信登录**：手机号 + 验证码
- **Cookie 持久化**：登录态自动保存，下次启动自动恢复
- **退出登录 / 更换账号**：支持切换账号

### 📊 历史记录
- **自动记录**：每次下载自动记录标题、BV 号、清晰度、时间
- **搜索筛选**：按标题搜索、按日期范围筛选
- **导入导出**：JSON 格式导入导出，方便数据备份与迁移
- **容量上限**：自动截断至 500 条，防止占用过多存储

### 🎨 主题与外观
- **亮色 + 暗色**：双主题完整覆盖，跟随系统自动切换
- **5 色强调色**：蓝 / 粉 / 青 / 紫 / 琥珀，一键切换
- **CSS 变量驱动**：统一的设计 Token 系统，所有颜色语义化管理
- **Windows 11 Fluent Design 风格**：亚克力质感、圆角、微动画

### 🖥️ 桌面体验（Electron 专属）
- **系统托盘**：最小化到托盘，后台继续下载
- **原生对话框**：保存路径 / 打开文件夹等系统级操作
- **自动启动**：开机自动启动（可配置）
- **NSIS 安装包**：标准 Windows 安装程序，可选便携版

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **FFmpeg**（可选，运行时自动检测）— 仅浏览器模式下需手动指定路径

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Luo-Feng6/bibilidown.git
cd bibilidown

# 安装依赖
npm install

# 浏览器开发模式（推荐开发者使用）
npm run dev
# → 浏览器打开 http://localhost:5173

# Electron 桌面模式
npm run dev:electron
# → 启动 Electron 窗口

# 运行测试
npm run test
# → 55 passed / 3 skipped

# TypeScript 类型检查
npx tsc --noEmit
# → 零错误
```

### 构建与打包

```bash
# 生成应用图标（首次打包前执行一次）
npm run gen-icons

# Vite 生产构建
npm run build

# Electron 打包
npm run build:electron
# → 输出到 release/ 目录
#   - BibiliDown Setup x.x.x.exe  (NSIS 安装包)
#   - BibiliDown-x.x.x-win.zip    (便携版)
```

---

## 项目结构

```
├── src/                        ← React 渲染进程
│   ├── services/               ← 服务层（8 个服务）
│   │   ├── api-base.ts         # API 基础 URL（Electron 生产模式自适应）
│   │   ├── bilibili-api.ts     # B 站 API（解析 / URL 识别 / playurl / WBI 签名）
│   │   ├── download-manager.ts # 下载引擎（队列消费 / 并发控制 / 流式下载）
│   │   ├── login-service.ts    # 登录服务（QR / 密码 / 短信）
│   │   ├── cookie-manager.ts   # Cookie 解析 / 验证 / 刷新
│   │   ├── dialog-service.ts   # React 对话框服务（确认 / 警告 / 下载选择）
│   │   ├── wbi-sign.ts         # WBI 签名（img_key + sub_key → MD5）
│   │   └── md5.ts              # MD5 哈希（spark-md5）
│   │
│   ├── stores/                 ← Zustand 状态管理（8 个 Store）
│   │   ├── downloadStore.ts    # 下载队列 + CRUD + 智能重排队
│   │   ├── parseStore.ts       # 解析结果 + 分页状态
│   │   ├── userPrefsStore.ts   # 用户偏好（持久化）— 主题 / Cookie / 路径
│   │   ├── presetStore.ts      # 下载方案（持久化）— 保存 / 切换 / 删除
│   │   ├── historyStore.ts     # 下载历史（持久化，上限 500 条）
│   │   ├── ffmpegStore.ts      # FFmpeg 检测状态
│   │   ├── toastStore.ts       # Toast 通知队列
│   │   └── navigationStore.ts  # 页面路由状态
│   │
│   ├── components/             ← UI 组件（12 个）
│   │   ├── InputBar.tsx        # 输入栏 + 解析按钮
│   │   ├── VideoCard.tsx       # 视频信息卡片 + 清晰度选择器
│   │   ├── EpisodeList.tsx     # 分集表格（收藏夹 / 番剧批量操作）
│   │   ├── DownloadPanel.tsx   # 下载面板（可拖拽 / 折叠）
│   │   ├── DownloadItem.tsx    # 单个下载任务（进度 / 速度 / 状态）
│   │   ├── DownloadChoiceDialog.tsx  # 下载模式选择弹窗
│   │   ├── ConfirmDialog.tsx   # 通用确认弹窗
│   │   ├── LoginPanel.tsx      # 登录面板（QR / 密码 / 短信 / 已登录）
│   │   ├── Sidebar.tsx         # 侧边栏导航
│   │   ├── StatusBar.tsx       # 底部状态栏
│   │   ├── QualityChip.tsx     # 清晰度选择 Chip
│   │   └── ...
│   │
│   ├── pages/                  ← 页面组件
│   │   ├── SettingsPage.tsx    # 设置页（18+ 配置项）
│   │   ├── HistoryPage.tsx     # 历史记录页
│   │   └── AboutPage.tsx       # 关于页
│   │
│   ├── styles/                 ← 样式
│   │   └── tokens.css          # 设计 Token（CSS 变量）
│   │
│   └── __tests__/              ← 单元测试（55 个）
│       ├── stores/             # Store 测试
│       └── services/           # Service 测试
│
├── electron/                   ← Electron 主进程
│   ├── main.ts                 # 主进程入口 + 窗口管理
│   └── preload.ts              # Preload 脚本（安全的 IPC 桥接）
│
├── scripts/                    ← 构建脚本
│   └── gen-icons.js            # 图标生成（SVG → PNG → ICO）
│
├── build/                      ← 应用图标源文件
│   ├── icon.svg                # 图标源文件
│   └── icon-256.png            # 256×256 PNG
│
├── handover/                   ← 开发交接文档（21 轮迭代记录）
│   ├── INDEX.md                # 总索引
│   ├── rounds/                 # 轮次文档
│   └── specs/                  # UX / 视觉设计规范
│
├── legacy-java/                ← 旧 Java Swing 版（归档参考）
└── public/                     ← 静态资源
```

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面壳 | [Electron](https://electronjs.org) | 43 |
| UI 框架 | [React](https://react.dev) | 18 |
| 类型系统 | [TypeScript](https://typescriptlang.org) | 5.x（strict） |
| 构建工具 | [Vite](https://vitejs.dev) | 5 |
| CSS 框架 | [Tailwind CSS](https://tailwindcss.com) | 3 |
| 状态管理 | [Zustand](https://zustand.docs.pmnd.rs) | 5 |
| 图标库 | [Phosphor Icons](https://phosphoricons.com) | 2 |
| 测试框架 | [Vitest](https://vitest.dev) | 4 |
| 打包工具 | [electron-builder](https://electron.build) | 26 |

### 核心架构

```
用户输入 URL
  → bilibili-api.ts（URL 识别 / 正则匹配）
  → API 请求（Vite 代理 → api.bilibili.com）
  → 解析结果 → parseStore
  → 视频卡片 / 分集列表
  → 用户选择清晰度 + 下载模式
  → download-manager.ts（队列消费 / 并发控制）
  → 下载完成 → FFmpeg 合并（DASH 模式）
  → 系统通知 + 历史记录
```

---

## 文档

| 文档 | 内容 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构图 · 数据流 · 组件树 · Store 依赖 · 设计决策 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 开发环境搭建 · 提交规范 · 代码审查清单 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新历史（v7.0.0 ~ v7.7.4） |
| [handover/](./handover/) | 21 轮开发交接文档 · UX 规格 · 调试报告 |

---

## 常见问题

<details>
<summary><b>为什么浏览器版下载需要走本地代理？</b></summary>

B 站 CDN（Akamai）会校验下载请求的 `Origin` / `Referer` 头，必须来自 `https://www.bilibili.com`。浏览器安全策略禁止 `fetch` 手动设置 `Origin` 头，因此开发模式通过 Vite 代理转发（`/api/proxy-download`），以服务端身份请求 CDN 绕过防盗链。

桌面版（Electron）不受此限制，可直连 CDN。
</details>

<details>
<summary><b>下载需要登录吗？</b></summary>

- **普通视频**：无需登录
- **1080P+ / 4K / 8K / 杜比 / HDR**：需要登录（大会员）
- **收藏夹**：部分需要登录才可查看
- **番剧**：按版权方要求可能需要登录
</details>

<details>
<summary><b>FFmpeg 需要手动安装吗？</b></summary>

桌面版（Electron）会自动检测系统中已安装的 FFmpeg，或引导下载。浏览器版需要在设置中手动指定 FFmpeg 可执行文件路径。
</details>

<details>
<summary><b>DASH 模式和 FLV 模式有什么区别？</b></summary>

| | DASH（推荐） | FLV |
|---|---|---|
| 文件 | 音视频分离 (.m4v + .m4a) | 单文件 (.flv) |
| 合并 | 需 FFmpeg 合并 → .mp4 | 无需合并 |
| 清晰度 | 最高 8K / 杜比 / HDR | 最高 1080P |
| 音质 | 最高 320kbps AAC | 标准音质 |
| 速度 | 音视频并行下载，更快 | 单流下载 |
</details>

---

## 路线图

- [ ] 浏览器版线上部署（Vercel / GitHub Pages）
- [ ] 首次使用引导
- [ ] 下载速度优化（并发分片）
- [ ] 字幕批量下载
- [ ] 多语言支持（i18n）

---

## 致谢

本项目是对 [nICEnnnnnnnLee/BibiliDown](https://github.com/nICEnnnnnnnLee/BibiliDown) 的致敬与重写。原项目基于 Java Swing，功能完善、逻辑严谨。新版本使用现代 Web 技术栈重新实现，保留了原项目的核心设计思路。

特别感谢 B 站 API 逆向工程社区提供的公开接口文档。

---

## License

[Apache-2.0](LICENSE)
