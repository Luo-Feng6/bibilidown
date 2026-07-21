# BibiliDown 交接文档 — 总索引

> 最后更新：2026-07-22 | 当前版本：**v7.7.4** | 累计 **22 轮**迭代

---

## 快速状态

| 指标 | 数值 |
|------|------|
| 版本 | v7.7.4 |
| Git | `master`，已推送 GitHub |
| TypeScript | strict mode，零错误 |
| 测试 | 55 passed / 3 skipped |
| 源码文件 | 49 个（~13,784 行） |
| Services | 8 个 · Stores | 8 个 · Components | 20 个 · Pages | 3 个 |

---

## 目录结构说明

```
handover/
├── INDEX.md              ← 你正在看的（总导航）
├── rounds/               ← 20 轮迭代文档（按编号排序）
├── specs/                ← 设计规范（UX + 视觉）
├── reports/              ← 调试报告 / 修复会话记录
└── archive/              ← 已过时的旧总索引（保留备查）
```

- **rounds/** — 每轮做了什么、改了什么、遇到什么问题、怎么解决的。新接手先看最新的 2-3 轮。
- **specs/** — 独立的设计规范文档。做 UI 改动时参考。
- **reports/** — 单次调试/修复会话的快照。需要了解特定 bug 的排查过程时参考。
- **archive/** — 旧版总索引 MASTER.md（R1-R10）和更早的 README.md（R1-R7）。已被本 INDEX.md 取代，保留备查。

---

## 版本时间线

| 版本 | 轮次 | 日期 | 关键交付 | Git |
|------|------|------|---------|-----|
| v7.7.4 | [R21](rounds/21-第二十一轮交接文档.md) | 07-22 | CDN 代理下载修复，warning-bg token 恢复，下载弹窗图标 | `be118ef..8649220` |
| v7.7.4 | [R22](rounds/22-第二十二轮交接文档.md) | 07-22 | README 重写（~70→~250行），EpisodeList 分页 bug 修复 | `db43f23` `3571d2f` |
| v7.7.3 | [R20](rounds/20-第二十轮交接文档.md) | 07-22 | DownloadPanel 徽章 writingMode 修复，版本号同步 | `8939345` |
| v7.7.2 | [R19](rounds/19-第十九轮交接文档.md) | 07-22 | API_BASE 修复，下载弹窗 React 化，LoginPanel 拆分，keyframes 去重 | `8b54f64..009a67a` |
| v7.7.1 | [R18](rounds/18-第十八轮交接文档.md) | 07-22 | 关于页重设计，仓库整理，退出登录修复，isElectron 去重 | `f7acab5` |
| v7.7.0 | [R17](rounds/17-第十七轮交接文档.md) | 07-22 | 预设系统，全站复制，退出登录/更换账号，历史日期筛选 | `f726f46..a1062d3` |
| v7.6.0 | [R10](rounds/10-第十轮交接文档.md) ~ [R16](rounds/16-第十六轮交接文档.md) | 07-20~22 | UX 全量优化，主题色全链覆盖，下载面板重设计，设置页打磨 | 多个 commit |
| v7.5.0 | [R8](rounds/08-第八轮交接文档.md) ~ [R9](rounds/09-第九轮交接文档.md) | 07-18~21 | 格式系统拆分，设置页重设计，暗色主题修复，5 色主题 | `0790036` |
| v7.1.0 | [R6](rounds/05-06-综合交接文档.md) ~ [R7](rounds/07-第七轮交接文档.md) | 07-15~21 | FFmpeg 自动下载，极验验证码，多 P 拆分，分页泛型 | `679bcc7` |
| v7.0.0 | [R1](rounds/01-05-交接文档.md) ~ [R5](rounds/05-第五轮交接文档.md) | 07-01~21 | Java Swing → Electron + React + TS 全面重写 | `6314081` |

---

## 20 轮快速索引

| 轮次 | 标题 | 核心内容 |
|------|------|---------|
| [R1-R5](rounds/01-05-交接文档.md) | 项目奠基 | 技术选型、Phase 1-3 规划、数据模型、核心解析/下载/登录链路 |
| [R5](rounds/05-第五轮交接文档.md) | 独立交付 | 收藏夹分页、cid 懒解析、HistoryPage、Electron 打包 |
| [R5-R6](rounds/05-06-综合交接文档.md) | 功能增强 | 分页加载、FFmpeg 检测横幅、Cookie 验证、系统托盘、单元测试 55 个 |
| [R7](rounds/07-第七轮交接文档.md) | 打包与认证 | 应用图标、亮色主题、历史导入导出、CI/CD、Cookie 刷新、FFmpeg 向导、极验验证码 |
| [R7-R8](rounds/07-08-第七轮续-第八轮启动文档.md) | 过渡衔接 | 第七轮补交、Windows Defender EPERM 修复、第八轮启动 |
| [R8](rounds/08-第八轮交接文档.md) | Bug 修复 | 白屏无限重渲染、封面 403、QR 暗色不可见、字体 fallback、端口冲突等 12 个 bug |
| [R9](rounds/09-第九轮交接文档.md) | 暗色主题 + 打包 | 下载进度、音视频并行、暗色主题彻底修复（4 轮迭代）、5 色选择器、打包 exe |
| [R10](rounds/10-第十轮交接文档.md) | UX 全量优化 | 登录入口重设计、主题色全链覆盖、设置页 6→18 项、历史/关于页重设计 |
| [R11](rounds/11-第十一轮交接文档.md) | UI 打磨 + 改名 | 20+ 问题修复、项目改名 BibiliDown、SVG 图标、桌面快捷方式 |
| [R12](rounds/12-第十二轮交接文档.md) | 下载修复 | Cookie/CORS/模式选择全链路修复、头像显示、图标系统 6 方案对比 |
| [R13](rounds/13-第十三轮交接文档.md) | 面板重设计 | 下载面板可拖拽/折叠、设置 5 项接线、主题色全面审计、队列持久化 |
| [R14](rounds/14-第十四轮交接文档.md) | 下载体验打磨 | 15 项修复：打开下载文件夹、合并确认、.m4s 无法打开、字幕开关等 |
| [R15](rounds/15-第十五轮交接文档.md) | 设置完善 | 格式选择拆分、下拉 UI、历史搜索、字幕独立下载、完成项删除 |
| [R16](rounds/16-第十六轮交接文档.md) | UI 细节打磨 | 下拉背景透明、弹窗无关闭按钮、文件夹按钮、文件名模板扩展 |
| [R17](rounds/17-第十七轮交接文档.md) | 预设 + 复制 + 退出 | 预设系统、全站复制按钮、退出登录菜单、历史日期筛选 |
| [R18](rounds/18-第十八轮交接文档.md) | 关于页 + 整理 | 关于页重设计、仓库整理、浏览器/桌面端对比、退出登录修复 |
| [R19](rounds/19-第十九轮交接文档.md) | P1 收尾 | API_BASE 修复、下载弹窗 React 化、LoginPanel 拆分（1131→6文件）、keyframes 去重 |
| [R21](rounds/21-第二十一轮交接文档.md) | CDN 下载 + 配色 | CDN 代理下载、warning-bg 琥珀色恢复、下载弹窗图标、v7.7.4 |
| [R22](rounds/22-第二十二轮交接文档.md) | README + 分页修复 | README 全面重写（~70→~250行）、EpisodeList 分页 bug（两个根因） |
| [R20](rounds/20-第二十轮交接文档.md) | writingMode 修复 | DownloadPanel 折叠徽章 CSS 修复、版本号统一至 v7.7.3 |

---

## 推荐阅读顺序

### 新接手者（快速上手）

1. **本 INDEX.md** — 5 分钟了解全局
2. **[R22](rounds/22-第二十二轮交接文档.md)** — 最新改动：README 重写 + EpisodeList 分页 bug 修复
3. **[R21](rounds/21-第二十一轮交接文档.md)** — CDN 代理下载 + 配色修复
4. **[R19](rounds/19-第十九轮交接文档.md)** — 最近的重大架构改动（API_BASE / 下载弹窗 / LoginPanel）
5. **`ARCHITECTURE.md`**（项目根目录） — 系统架构、数据流、组件树
6. **`npm run dev`** — 启动，走一遍核心流程

### 想了解某个功能的历史

- **下载链路**：R12（修复）→ R13（面板）→ R14（体验）→ R19（弹窗 React 化）
- **主题系统**：R8（暗色 bug）→ R9（彻底修复）→ R10（全链覆盖）→ R11（颜色 → token）
- **设置页**：R10（扩展）→ R13（接线）→ R15（完善）→ R16（打磨）
- **登录系统**：R1-R5（基础）→ R10（入口重设计）→ R19（LoginPanel 拆分）

### 想了解最初的设计意图

- [R1-R5](rounds/01-05-交接文档.md)：为什么从 Java Swing 重写、Phase 1-3 规划、技术选型理由
- [specs/ux-specification.md](specs/ux-specification.md)：UX 交互规格
- [specs/visual-design-specification.md](specs/visual-design-specification.md)：视觉设计规范（Windows 11 Fluent Design）

---

## 公共文档

项目根目录还有这些面向公众的文档：

| 文件 | 说明 |
|------|------|
| `README.md` | 项目主页（中英双语，功能列表，快速开始） |
| `ARCHITECTURE.md` | 系统架构（目录树、数据流、Store 依赖、组件树、设计决策） |
| `CHANGELOG.md` | 版本更新日志（v7.0.0 ~ v7.7.3） |
| `CONTRIBUTING.md` | 贡献指南（环境搭建、提交规范、技术栈） |
| `LICENSE` | MIT 许可证 |

---

## 快速启动

```bash
cd "D:\all app\BibiliDown"

npm run dev              # 浏览器开发模式 → http://localhost:5173
npm run dev:electron     # Electron 桌面模式
npm run test             # Vitest 测试（55 passed / 3 skipped）
npx tsc --noEmit         # TypeScript 类型检查
npm run build:electron   # 打包 Windows 安装包
```

---

## 当前剩余任务

| # | 任务 | 优先级 |
|---|------|--------|
| 1 | 首次使用引导（空状态 3 步引导卡片） | P3 |
| 2 | Electron 合并模式临时文件清理 | P3 |
| 3 | 浏览器版线上部署（Vercel / GitHub Pages） | P3 |
