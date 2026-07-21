# BibiliDown

B 站视频下载桌面应用 — Electron + React + TypeScript + Tailwind CSS

[![Test](https://img.shields.io/badge/tests-55%20passed-green)](https://github.com/Luo-Feng6/bibilidown)
[![TypeScript](https://img.shields.io/badge/TypeScript-zero%20errors-blue)](https://github.com/Luo-Feng6/bibilidown)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/Luo-Feng6/bibilidown)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)

## 功能

- **7 种输入格式**：BV 号、av 号、ep 剧集、ss 番剧、md 媒体、ml 收藏夹、b23.tv 短链接
- **DASH 下载**：音视频分离下载 + FFmpeg 自动合并
- **14 级清晰度**：240P ~ 8K（含杜比视界/全景声/HDR）
- **登录系统**：QR 码 / 密码 / 短信三种登录，Cookie 持久化
- **收藏夹/番剧**：分页加载、批量操作、多 P 独立下载
- **历史记录**：自动记录、搜索筛选、JSON 导出导入
- **亮暗双主题**：CSS 变量驱动的完整主题系统
- **桌面体验**：系统托盘、原生对话框、最小化到托盘

## 开发

### 环境要求

- Node.js ≥ 18
- FFmpeg（可选，运行时自动检测）

### 安装与运行

```bash
# 安装依赖
npm install

# 浏览器开发模式
npm run dev

# Electron 开发模式
npm run dev:electron

# 运行测试
npm run test

# 类型检查
npx tsc --noEmit
```

### 构建

```bash
# 生成应用图标
npm run gen-icons

# Vite 生产构建
npm run build

# Electron 打包（NSIS 安装包 + 便携版）
npm run build:electron
```

## 项目结构

```
├── src/               ← React 渲染进程
│   ├── services/      ← B 站 API、下载引擎、登录、Cookie、WBI 签名
│   ├── stores/        ← Zustand 状态管理（7 个 Store）
│   ├── components/    ← UI 组件（12 个）
│   ├── pages/         ← 页面组件
│   ├── styles/        ← 设计 Token（tokens.css）
│   └── __tests__/     ← 单元测试（55 个）
├── electron/          ← Electron 主进程 + Preload
├── scripts/           ← 构建脚本（图标生成）
├── build/             ← 应用图标源文件
└── legacy-java/       ← 旧 Java Swing 版（归档参考）
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 43 |
| UI 框架 | React 18 + TypeScript 5 |
| 构建工具 | Vite 5 |
| 样式 | Tailwind CSS 3 + CSS Variables |
| 状态管理 | Zustand 5 |
| 图标 | Phosphor Icons |
| 测试 | Vitest 4 |
| 打包 | electron-builder 26 |

## 致谢

本项目是从 [nICEnnnnnnnLee/BibiliDown](https://github.com/nICEnnnnnnnLee/BibiliDown)（Java Swing）完全重写的现代版本。

## License

Apache-2.0
