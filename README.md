# BibiliDown

B 站视频下载工具 — 支持浏览器直接使用 + Electron 桌面版

[![Test](https://img.shields.io/badge/tests-55%20passed-brightgreen)](https://github.com/Luo-Feng6/bibilidown)
[![TypeScript](https://img.shields.io/badge/TypeScript-zero%20errors-blue)](https://github.com/Luo-Feng6/bibilidown)
[![Version](https://img.shields.io/badge/version-v7.7.0-9cf)](https://github.com/Luo-Feng6/bibilidown/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/Luo-Feng6/bibilidown)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)

## 两种使用方式

| | 浏览器版 | 桌面版 |
|---|---|---|
| 如何使用 | 浏览器打开即可 | 下载安装包 |
| 下载地址 | GitHub Pages（部署后） / 本地 `npm run dev` | [GitHub Releases](https://github.com/Luo-Feng6/bibilidown/releases) |
| 高清下载 | ✅ | ✅ |
| DASH + FLV | ✅ | ✅ |
| FFmpeg 合并 | ✅（手动配置路径） | ✅（内置检测） |
| 扫码登录 | ✅ | ✅ |
| 下载方案（预设） | ✅ | ✅ |
| 历史记录 | ✅ | ✅ |
| 自定义下载路径 | 仅保存配置 | ✅ 完整支持 |
| 自动打开文件夹 | — | ✅ |
| 系统托盘 | — | ✅ |

> 💡 打开 App 内的「关于」页面可随时查看完整功能对比表，浏览器版会直接告诉你如何获取桌面版。

## 功能

- **7 种输入格式**：BV 号 · av 号 · ep 剧集 · ss 番剧 · md 媒体 · ml 收藏夹 · b23.tv 短链
- **14 级清晰度**：240P ~ 8K（含杜比视界 / 全景声 / HDR）
- **多 P 拆分**：自动识别分 P，每 P 独立下载
- **DASH + FLV**：音视频分离下载 + FFmpeg 自动合并
- **弹幕 & 字幕**：.xml 弹幕 + .srt 字幕独立下载
- **登录系统**：QR 码 / 密码 / 短信三种登录，Cookie 持久化
- **下载方案**：保存多套设置（清晰度 / 格式 / 模式等），一键切换
- **全站复制**：标题 · BV 号 · 链接一键复制到剪贴板
- **历史记录**：自动记录，支持搜索 · 日期范围筛选 · JSON 导入导出
- **亮暗双主题**：跟随系统，5 种主题色可选
- **账号管理**：退出登录 / 更换账号

## 快速开始

### 环境要求

- Node.js ≥ 18
- FFmpeg（可选，浏览器版需手动配置路径；桌面版运行时自动检测）

### 安装

```bash
git clone https://github.com/Luo-Feng6/bibilidown.git
cd bibilidown
npm install
```

### 开发

```bash
# 浏览器开发模式（http://localhost:5173）
npm run dev

# Electron 桌面开发模式
npm run dev:electron

# 运行测试（Vitest）
npm run test

# TypeScript 类型检查
npx tsc --noEmit
```

### 构建

```bash
# 生成应用图标
npm run gen-icons

# Vite 生产构建（输出到 dist/）
npm run build

# Electron 打包（输出到 release/）
npm run build:electron
```

## 项目结构

```
├── src/
│   ├── services/       ← B 站 API · 下载引擎 · 登录 · Cookie · WBI 签名（6 个）
│   ├── stores/         ← Zustand 状态管理（8 个 Store）
│   ├── components/     ← UI 组件（12 个）
│   ├── pages/          ← 页面组件（3 个：设置 · 历史 · 关于）
│   ├── utils/          ← 工具函数（剪贴板 · 环境检测）
│   └── __tests__/      ← 单元测试（55 个）
├── electron/           ← Electron 主进程 + Preload
├── scripts/            ← 构建脚本（图标生成）
├── build/              ← 应用图标源文件
├── public/             ← 静态资源（favicon）
└── legacy-java/        ← 旧 Java Swing 版（归档参考，不再维护）
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 43 |
| UI 框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3 + CSS Variables（Fluent Design） |
| 状态管理 | Zustand 5 |
| 图标 | Phosphor Icons |
| 测试 | Vitest 4 |
| 打包 | electron-builder 26 |

## 贡献

🐛 发现问题？欢迎 [提交 Issue](https://github.com/Luo-Feng6/bibilidown/issues/new/choose) 或 Pull Request。附上版本号和错误日志会更快定位。

## 致谢

本项目是从 [nICEnnnnnnnLee/BibiliDown](https://github.com/nICEnnnnnnnLee/BibiliDown)（Java Swing）完全重写的现代版本。

## License

Apache-2.0 © 2025-2026
