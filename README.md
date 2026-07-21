# BibiliDown

B 站视频下载工具 — 浏览器直接使用 + Electron 桌面版

[![Test](https://img.shields.io/badge/tests-55%20passed-brightgreen)](https://github.com/Luo-Feng6/bibilidown)
[![TypeScript](https://img.shields.io/badge/TypeScript-zero%20errors-blue)](https://github.com/Luo-Feng6/bibilidown)
[![Version](https://img.shields.io/badge/version-v7.7.0-9cf)](https://github.com/Luo-Feng6/bibilidown/releases)
[![License](https://img.shields.io/badge/license-Apache--2.0-orange)](LICENSE)

## 两种使用方式

| | 🌐 浏览器版 | 🖥️ 桌面版 |
|---|---|---|
| 如何使用 | 浏览器打开即可 | [下载安装包](https://github.com/Luo-Feng6/bibilidown/releases) |
| 高清下载 | ✅ | ✅ |
| FFmpeg 合并 | 手动配置 | 内置检测 |
| 扫码登录 | ✅ | ✅ |
| 下载方案 | ✅ | ✅ |
| 自定义路径 | 仅保存配置 | 完整支持 |
| 系统托盘 | — | ✅ |

> 💡 打开 App 内「关于」页面可查看完整功能对比。

## 功能

- **7 种输入**：BV 号 · av 号 · ep/ss 番剧 · b23.tv 短链 · 收藏夹
- **14 级清晰度**：240P ~ 8K（杜比视界 / 全景声 / HDR）
- **多 P 拆分**：自动识别分P，每P独立下载
- **DASH + FLV**：音视频分离 + FFmpeg 自动合并
- **弹幕 & 字幕**：.xml + .srt 独立下载
- **下载方案**：保存多套设置，一键切换
- **全站复制**：标题 · BV 号 · 链接一键复制
- **历史记录**：搜索 · 日期筛选 · 导入导出
- **亮暗主题**：跟随系统，5 色可选

## 快速开始

```bash
git clone https://github.com/Luo-Feng6/bibilidown.git
cd bibilidown
npm install

npm run dev              # 浏览器模式 → http://localhost:5173
npm run dev:electron     # Electron 桌面模式
npm run test             # 运行测试
npx tsc --noEmit         # 类型检查
```

## 技术栈

React 18 · TypeScript 5 · Vite 5 · Tailwind CSS 3 · Zustand 5 · Phosphor Icons · Vitest 4 · Electron 43

## 文档

| 文档 | 内容 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构图 · 数据流 · 组件树 · 设计决策 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 开发环境搭建 · 提交规范 · 检查清单 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新历史 |

## 致谢

从 [nICEnnnnnnnLee/BibiliDown](https://github.com/nICEnnnnnnnLee/BibiliDown)（Java Swing）完全重写的现代版本。

## License

Apache-2.0
