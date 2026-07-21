# BilibiliDown v7.0 — 交接文档

> **日期**: 2026-07-21  
> **交接范围**: 从零搭建 Electron + React + TypeScript + Tailwind 项目骨架，完成设计 Token 体系、布局框架、核心组件  

---

## 目录

1. [项目背景：最初想做什么](#1-项目背景最初想做什么)
2. [当前代码结构一览](#2-当前代码结构一览)
3. [已完成的工作清单](#3-已完成的工作清单)
4. [每个文件的详细说明](#4-每个文件的详细说明)
5. [遇到的坑与解决方案](#5-遇到的坑与解决方案)
6. [待完成的工作](#6-待完成的工作)
7. [如何运行与开发](#7-如何运行与开发)
8. [关键文件快速索引](#8-关键文件快速索引)

---

## 1. 项目背景：最初想做什么

**原始项目 BilibiliDown** 是一个 Java Swing 写的 B 站视频下载器，功能完整但 UI 老旧（Swing 硬编码绝对布局、无暗色模式、弹窗满天飞）。

**本次目标**：在不改动 Java 后端的前提下，用现代技术栈重写整个前端 UI。

### 三步走计划

```
Phase 1 ✅ (已完成)    Phase 2 🔲 (待做)       Phase 3 🔲 (待做)
┌──────────────┐      ┌──────────────┐        ┌──────────────┐
│ UX 规格文档   │      │ 全部组件开发   │        │ Electron 打包 │
│ 视觉设计规范   │      │ 状态管理      │        │ 与 Java 后端  │
│ Token 体系    │      │ 路由与页面    │        │ 通信桥接      │
│ 项目骨架      │      │ 真实数据接入   │        │ 发布配置      │
│ 核心组件 Demo │      │ 暗色模式切换   │        │              │
└──────────────┘      └──────────────┘        └──────────────┘
     本次交付             下次迭代                 最终交付
```

### 设计决策记录

| 决策点 | 选择了什么 | 为什么 |
|---|---|---|
| UI 框架 | React 18 + TypeScript | 组件化、生态大、类型安全 |
| 构建工具 | Vite 5 | 比 Webpack 快 10x，HMR 即时生效 |
| 样式方案 | Tailwind CSS 3 + CSS Variables | 工具类开发快，CSS 变量做主题切换零成本 |
| 桌面壳 | Electron | 跨平台，可直接打包为 Windows/macOS/Linux 应用 |
| 字体 | Segoe UI Variable (系统原生) | 不依赖 Google Fonts 网络加载，ClearType 渲染最优 |
| 图标 | Phosphor Icons (设计规范指定) | 1,488 个图标、6 种变体、1.5px 统一描边、MIT 许可 |
| 主题模式 | 先暗后亮 | 下载工具使用场景多在晚上 |
| 配色基调 | Slate 冷灰板 + 系统强调色 | 匹配 Windows 11 Mica 材质，不刺眼 |

---

## 2. 当前代码结构一览

```
output/
│
├── 📄 文档层
│   ├── ux-specification.md          ← UX 交互规格（9 章，含状态机、避坑清单）
│   ├── visual-design-specification.md ← 视觉设计规范（11 章，含 120+ Token）
│   └── handover/README.md           ← 📍 你正在读的文件
│
├── ⚙ 配置层
│   ├── package.json                 ← 依赖 & 脚本
│   ├── tsconfig.json                ← TypeScript 配置
│   ├── tsconfig.node.json           ← Vite 构建的 TS 配置
│   ├── vite.config.ts               ← Vite 构建配置（别名 @/、端口 5173）
│   ├── tailwind.config.js           ← Tailwind 主题扩展（映射 CSS 变量）
│   ├── postcss.config.js            ← PostCSS 插件（Tailwind + Autoprefixer）
│   └── index.html                   ← HTML 入口
│
├── 🖥 Electron 层（基础骨架，需后续完善）
│   └── electron/
│       ├── main.js                  ← Electron 主进程（创建窗口、加载页面）
│       └── preload.js               ← 预加载脚本（安全上下文桥接）
│
└── 🎨 React 源码层
    └── src/
        ├── main.tsx                  ← React 挂载入口
        ├── App.tsx                   ← 根组件（三栏布局 + Acrylic 背景）
        ├── index.css                 ← 全局样式入口（import tokens + Tailwind）
        ├── vite-env.d.ts            ← Vite 类型声明
        │
        ├── styles/
        │   └── tokens.css            ← 🔑 设计 Token 体系（~500 行 CSS 变量）
        │
        └── components/
            ├── TitleBar.tsx          ← 自定义标题栏（拖拽区 + 窗口控制按钮）
            ├── Sidebar.tsx           ← 导航侧栏（56px 宽，强调色指示器）
            ├── InputBar.tsx          ← 输入栏（粘贴链接 + 解析按钮 + 加载态）
            ├── VideoCard.tsx         ← 🔑 视频卡片（封面 + 芯片组 + 动效）
            ├── QualityChip.tsx       ← 🔑 清晰度芯片（6 种状态）
            └── StatusBar.tsx         ← 底部状态栏（连接状态 + 队列摘要 + 登录）
```

### 组件依赖关系图

```
main.tsx
  └── App.tsx
        ├── TitleBar          (独立，无依赖)
        ├── Sidebar           (独立，无依赖)
        ├── InputBar          (独立，无依赖)
        ├── VideoCard         ← QualityChip  (父子关系)
        │     └── QualityChip
        ├── DownloadPanel     (占位，待实现)
        └── StatusBar         (独立，无依赖)
```

---

## 3. 已完成的工作清单

### 3.1 设计文档

| 文件 | 行数 | 内容 |
|---|---|---|
| `ux-specification.md` | ~450 行 | 9 章：设计原则 → 布局 → 交互流程 → 组件规格 → 异常处理 → 状态机 → 键盘/无障碍 → 避坑清单 |
| `visual-design-specification.md` | ~600 行 | 11 章：理念 → 颜色三层 Token → 字体 → 间距 → 圆角 → 阴影 → 图标 → 组件渲染 → 动效 → 双主题 → Token 速查表 |

### 3.2 代码文件

| 文件 | 行数 | 说明 |
|---|---|---|
| `tokens.css` | ~290 行 | 123 个 CSS 自定义属性，Primitive → Semantic → Component 三层架构，亮/暗双模式，`prefers-color-scheme` 自动检测 |
| `tailwind.config.js` | ~120 行 | 映射全部 CSS 变量到 Tailwind 工具类（`bg-accent`、`text-heading`、`rounded-xl`、`shadow-glow` 等） |
| `index.css` | ~110 行 | Tailwind 指令 + Base 重置 + Components 工具类（`.glass-panel`、`.skeleton`、`.card-hover`） |
| `App.tsx` | ~90 行 | 根布局：标题栏 + 侧栏 + 主内容 + 下载面板 + 状态栏，`data-theme` 暗色模式 |
| `TitleBar.tsx` | ~70 行 | 32px 高，Mica 背景，品牌 Logo "B"，窗口控制按钮（最小化/最大化/关闭 Hover 效果） |
| `Sidebar.tsx` | ~80 行 | 56px 宽图标导航，3px 强调色竖线指示器，上下分区 |
| `InputBar.tsx` | ~130 行 | 44px 高，8px 圆角，链接图标前缀，清除按钮，解析 Loading spinner，Enter 键触发 |
| `VideoCard.tsx` | ~280 行 | 12px 圆角卡片，封面 280×158，芯片组键盘导航 ←→，高级选项折叠，加入下载队列按钮 |
| `QualityChip.tsx` | ~120 行 | 48px 高芯片，6 种状态（Rest/Hover/Selected/Focused/Disabled + Pressed 缩放），radio 语义 |
| `StatusBar.tsx` | ~40 行 | 28px 高，绿色状态点，队列摘要，登录入口 |

### 3.3 项目配置

- ✅ TypeScript 严格模式，零类型错误
- ✅ Vite 生产构建通过（893ms，零 CSS 警告）
- ✅ 路径别名 `@/` 指向 `src/`
- ✅ `npm install` 135 个包，6 秒完成

---

## 4. 每个文件的详细说明

### 4.1 `tokens.css` — 设计 Token 体系

**这是整个项目的视觉基石。** 所有颜色、间距、圆角、阴影、字体、动效都从这里派生。

三层架构（遵循 design-system Skill 的 Token Architecture）：

```
Primitive (原始色值)     Semantic (语义映射)      Component (组件专用)
─────────────────────    ────────────────────     ────────────────────
--gray-900: #0F172A  →   --surface-root       →   --card-bg
--accent-500: #3B82F6 →  --color-accent       →   --chip-bg-selected
--success-500: #22C55E → --color-success      →   (直接使用)
```

**关键设计点**：
- 亮/暗模式切换只改 Semantic 层，Primitive 和 Component 层不动
- `prefers-color-scheme: dark` 媒体查询在无 `data-theme` 属性时自动适配系统主题
- 暗色模式下强调色降一档亮度（`#3B82F6` → `#60A5FA`），防止刺眼
- 阴影在暗色模式下加深（因为暗底上微妙的阴影不可见）

### 4.2 `tailwind.config.js` — Tailwind 集成

**不是简单的 extend，而是把每个 CSS 变量都映射成了 Tailwind 工具类。** 这意味着你可以写：

```tsx
// 不用 style={{ color: 'var(--text-primary)' }}
// 直接用 Tailwind 类名：
<div className="text-text-primary bg-surface-default rounded-xl shadow-md">
```

映射了 6 大类：
- **colors**: `surface-root`, `accent`, `success`, `error`, `brand` 等 26 个颜色 Token
- **borderRadius**: 8 级（`rounded-none` → `rounded-2xl`）
- **boxShadow**: 8 级（`shadow-xs` → `shadow-glow`）
- **spacing**: 9 级（`p-1t` → `p-12t`，后缀 `t` 区分 Token）
- **fontFamily**: `font-display`, `font-body`, `font-mono`
- **fontSize**: 8 级（`text-caption` → `text-heading-xl`）

### 4.3 `index.css` — 全局样式入口

三层结构：
1. `@import './styles/tokens.css'` — 先加载 Token
2. `@tailwind base/components/utilities` — Tailwind 三件套
3. `@layer base/components` — 自定义重置和工具类

**提供的工具类**：
- `.glass-panel` — Acrylic 毛玻璃面板（`backdrop-filter: blur(24px)`）
- `.mica-bg` — Mica 云母材质背景
- `.card-hover` — 鼠标悬浮时阴影自动升级
- `.progress-glow` — 进度条发光效果（签名元素）
- `.skeleton` — 骨架屏闪烁动画
- `.focus-ring` — 聚焦环
- `.titlebar-drag` / `.titlebar-no-drag` — Electron 拖拽区域

### 4.4 `App.tsx` — 根布局组件

**五区域布局**：

```
┌── TitleBar (32px, Mica) ─────────────────────────────┐
│ ┌─ Sidebar ─┐ ┌─ Main Content ───┐ ┌─ Download ───┐ │
│ │  56px     │ │                  │ │  320px       │ │
│ │  导航图标  │ │  InputBar        │ │  下载面板     │ │
│ │           │ │  VideoCard       │ │  (Acrylic)   │ │
│ │           │ │  ...             │ │              │ │
│ └───────────┘ └──────────────────┘ └──────────────┘ │
├── StatusBar (28px) ──────────────────────────────────┤
```

- 顶层 `data-theme="dark"` 控制暗色模式
- `downloadPanelOpen` 状态控制下载面板显隐
- 包含一段 Demo 数据用于 UI 预览

### 4.5 `VideoCard.tsx` — 视频卡片（最复杂组件）

**组件树**：
```
VideoCard
├── 封面区域 (280×158, 8px 圆角)
├── 信息区域
│   ├── 标题 (18px Medium, 最多2行)
│   ├── 元信息行 (UP主 · 播放量 · 时长 · 日期)
│   └── 关闭按钮
├── 清晰度芯片组 (radio group)
│   └── QualityChip × N (键盘导航 ←→)
├── 高级选项 (折叠面板)
│   ├── 格式选择
│   ├── 编码选择
│   ├── 下载字幕 checkbox
│   └── 下载弹幕 checkbox
└── 操作栏
    ├── 预估文件大小
    └── "加入下载队列" 按钮
```

**状态管理**：
- `selectedIndex` — 当前选中的清晰度芯片索引
- `focusedIndex` — 键盘焦点的芯片索引（与选中态分离）
- `isHovered` — 卡片是否被鼠标悬浮（控制阴影升级）
- `showAdvanced` — 高级选项是否展开

**动效**：
- 卡片进入: `card-enter` 动画（`opacity 0→1, translateY 8px→0`, 300ms ease-out）
- 阴影升级: 悬浮时 `shadow-sm` → `shadow-md`（200ms ease），不缩放（桌面 UI 不应缩放）
- 按钮按下: `scale(0.98)`，松开回弹

### 4.6 `QualityChip.tsx` — 清晰度芯片（最精细的交互组件）

**6 种状态矩阵**：

```
          rest         hover        selected      focused      disabled     pressed
背景      transparent  rgba(0,0,0,  accent 实色    同当前态      gray-100     scale(0.97)
                      0.04)
边框      --border-    --gray-400    accent         accent ring  淡灰         同当前态
          default
文字      --text-      --text-       white (亮色)   同当前态     --text-      同当前态
          primary      primary       gray-900(暗色)              disabled
光标      pointer      pointer       default        default      not-allowed  pointer
```

**无障碍**：
- `role="radio"` + `aria-checked` — 屏幕阅读器可识别
- `aria-label` — 包含清晰度名称和预估大小
- 键盘 ←→ 导航 + Space/Enter 选中

---

## 5. 遇到的坑与解决方案

### 坑 1：Electron 下载失败

| 项目 | 内容 |
|---|---|
| **现象** | `npm install` 时 `electron` 包下载报 `ECONNRESET`，原因是 GitHub Releases 在中国大陆网络不稳定 |
| **影响** | 无法安装完整依赖 |
| **解决** | 从 `package.json` 中暂时移除 `electron`、`concurrently`、`wait-on`，改为纯 Vite + React 模式运行 UI 预览。Electron 只是外壳（约 100MB 的 Chromium 运行时），不影响 UI 组件开发和视觉效果验证。后续可通过以下方式之一安装 Electron：① 使用淘宝镜像 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install electron` ② 科学上网后再装 ③ 用 `electron-builder` 的国内镜像配置 |
| **状态** | ✅ 临时绕过，UI 开发不受影响 |

### 坑 2：CSS 变量未包裹在 `:root {}` 内

| 项目 | 内容 |
|---|---|
| **现象** | `vite build` 输出 CSS 语法警告 `Expected identifier but found whitespace` |
| **原因** | 在编写 `tokens.css` 的 Primitive Tokens 部分时，写了裸的 `--gray-0: #FFFFFF;` 而没有包裹在 `:root {}` 选择器内。CSS 规范要求自定义属性必须声明在选择器内部 |
| **解决** | 将所有 Primitive Token（灰度色板、强调色、品牌粉、语义色共 35 个变量）包裹在 `:root {}` 块内 |
| **验证** | 重新构建，零警告，893ms 完成 |
| **教训** | CSS 文件越长越容易漏掉选择器包裹。后续如果用自动化工具生成 Token 文件（如 Style Dictionary），可以避免此问题 |

### 坑 3：暗色模式下阴影不可见

| 项目 | 内容 |
|---|---|
| **现象** | 在亮色模式下精心调好的阴影（`0 2px 8px rgba(0,0,0,0.06)`），切到暗色模式后完全看不见 |
| **原因** | 阴影的 `rgba(0,0,0,...)` 在 `#0F172A` 的暗色背景上对比度极低 |
| **解决** | 在 `tokens.css` 中为暗色模式单独定义一套阴影 Token，将透明度从 `0.06` 提高到 `0.4`，让阴影在暗底上"压得住"。这是 Windows 11 Fluent Design 本身的处理方式——暗色主题下 elevation 阴影比亮色主题更深更明显 |
| **验证** | 在 `[data-theme="dark"]` 和 `@media (prefers-color-scheme: dark)` 两处同步定义 |

### 坑 4：Tailwind 工具类名与 Token 命名的冲突

| 项目 | 内容 |
|---|---|
| **现象** | Tailwind 默认有 `text-sm`、`shadow-sm` 等工具类，如果我们的 Token 也叫 `shadow-sm` 会覆盖默认行为 |
| **原因** | 我们的视觉规范定义了 `--shadow-sm` 的值与 Tailwind 默认不同（我们的更轻），需要明确这是有意覆盖还是无意冲突 |
| **解决** | 在 `tailwind.config.js` 的 `extend` 中覆盖 `boxShadow` 和 `fontSize`，使用我们的 Token 值。对于 spacing，我们使用 `1t`/`2t` 等带后缀的名称，避免与 Tailwind 默认的 `1`/`2` 数值冲突。这是经过权衡的选择——`p-4t` (16px from Token) vs `p-4` (16px Tailwind 默认) 值相同但语义不同：Token 会随设计系统演进，而 Tailwind 默认值是固定的 |

---

## 6. 待完成的工作

### 6.1 高优先级（核心功能）

| 任务 | 预估工时 | 说明 |
|---|---|---|
| 🔲 下载面板组件 `DownloadPanel.tsx` | 4h | 任务列表、进度条（含发光签名元素）、分组折叠、Sparkline 速度曲线 |
| 🔲 下载队列项组件 `DownloadItem.tsx` | 3h | 4 种状态（进行中/暂停/完成/失败）、重试逻辑、进度动画 |
| 🔲 状态管理 | 4h | Zustand 或 Jotai，管理：解析结果列表、下载队列、用户偏好 |
| 🔲 空状态组件 `EmptyState.tsx` | 1h | 引导用户粘贴链接 |
| 🔲 设置页面 `SettingsPage.tsx` | 4h | 下载路径、清晰度偏好、主题切换、网络配置 |

### 6.2 中优先级（体验完善）

| 任务 | 预估工时 | 说明 |
|---|---|---|
| 🔲 暗色模式切换开关 | 1h | 手动切换 `data-theme` + 持久化到 localStorage |
| 🔲 登录面板 `LoginPanel.tsx` | 3h | 右侧滑入面板、二维码/密码/短信三 Tab |
| 🔲 历史记录页面 `HistoryPage.tsx` | 2h | 最近解析列表、可重新解析 |
| 🔲 Toast 通知组件 | 2h | 全局 Toast 容器、4 种类型（success/warning/error/info） |
| 🔲 骨架屏组件 `Skeleton.tsx` | 1h | 卡片骨架屏、文本骨架屏 |
| 🔲 响应式断点 | 2h | 窗口 < 1280px 时下载面板自动收起为浮动按钮 |

### 6.3 低优先级（工程化）

| 任务 | 预估工时 | 说明 |
|---|---|---|
| 🔲 Electron 完整集成 | 3h | 主进程窗口管理、系统托盘、菜单栏、文件对话框 |
| 🔲 与 Java 后端通信 | 4h | 通过 HTTP API 或 IPC 与现有 Java 代码交互 |
| 🔲 安装 Phosphor Icons | 0.5h | `npm install @phosphor-icons/react`，替换组件中的 emoji 图标 |
| 🔲 字体本地化 | 1h | 将 Segoe UI Variable 字体文件打包进应用（避免缺失字体问题） |
| 🔲 自动更新 | 2h | electron-updater 集成 |
| 🔲 单元测试 | 4h | Vitest + React Testing Library |
| 🔲 Storybook | 3h | 组件文档与可视化测试 |

### 6.4 已知的代码临时方案（需替换）

| 文件 | 位置 | 临时方案 | 应替换为 |
|---|---|---|---|
| `App.tsx:59` | Demo 数据 | 硬编码 `DEMO_VIDEO` 对象 | 从状态管理/Zustand store 读取真实解析结果 |
| `TitleBar.tsx:55` | 窗口控制 | 纯展示按钮，未绑定 Electron IPC | 通过 `window.electronAPI` 调用 `ipcRenderer` |
| `InputBar.tsx:21` | 解析模拟 | `setTimeout` 800ms | 真实 API 调用 |
| 全部组件 | 图标 | Emoji（📥🔗🎬 等） | Phosphor Icons React 组件 |
| `App.tsx:38` | 主题 | `useState` 硬编码 `'dark'` | 读取 `localStorage` + 系统 `prefers-color-scheme` |

---

## 7. 如何运行与开发

### 7.1 启动开发服务器

```bash
cd "D:\all app\BibiliDown\output"
npm run dev
```

打开浏览器访问 **http://localhost:5173**

你将看到：
- 顶部：暗色标题栏（"B" Logo + BilibiliDown + 窗口控制按钮）
- 左侧：56px 宽导航侧栏（4 个图标按钮，第一个高亮）
- 中央：输入栏 + 一张示例视频卡片（周杰伦晴天）
- 右侧：Acrylic 毛玻璃下载面板（显示空队列引导）
- 底部：状态栏（绿色就绪指示 + 版本号 + 未登录）

### 7.2 交互测试

| 操作 | 预期效果 |
|---|---|
| 点击清晰度芯片 | 选中态变为蓝色填充，checkmark 出现，预估大小更新 |
| 键盘 ←→ 导航芯片 | 聚焦态有蓝色光环，Enter/Space 选中 |
| 点击「高级选项」| 折叠面板展开，显示格式/编码/字幕/弹幕选项 |
| Hover 视频卡片 | 阴影从 `shadow-sm` 升级为 `shadow-md`（200ms 过渡） |
| 点击「加入下载队列」| 按钮有 `scale(0.98)` 按下反馈 |
| 输入框输入文字 | 清除按钮 (✕) 出现，点击可清空 |
| 输入框聚焦 | 边框变蓝 + 外发光 3px |
| 导航图标 Hover | 图标颜色从灰色变亮 |

### 7.3 构建生产版本

```bash
npm run build     # 输出到 dist/
npm run preview   # 本地预览生产构建
```

### 7.4 切换到亮色模式

在浏览器 DevTools Console 中执行：
```js
document.documentElement.setAttribute('data-theme', 'light')
```

或在 `App.tsx` 中将 `useState<'light' | 'dark'>('dark')` 改为 `'light'`。

---

## 8. 关键文件快速索引

| 想了解什么 | 去哪看 |
|---|---|
| 为什么选这些颜色和字体 | `visual-design-specification.md` 第 2-3 章 |
| 芯片应该长什么样 | `visual-design-specification.md` §8.2 |
| 进度条发光效果怎么做 | `visual-design-specification.md` §8.5 |
| 动画时长和缓动曲线 | `visual-design-specification.md` §9 |
| 所有 CSS 变量列表 | `src/styles/tokens.css` |
| Tailwind 能直接用哪些类名 | `tailwind.config.js` |
| 全局可复用的 CSS 类（.glass-panel 等）| `src/index.css` `@layer components` 块 |
| 布局怎么搭的 | `src/App.tsx` |
| 视频卡片完整实现 | `src/components/VideoCard.tsx` |
| 芯片 6 种状态怎么写 | `src/components/QualityChip.tsx` |
| 设计决策的 trade-off | 本文档 §5 |

---

> **下一步行动**：看完这份文档后，建议按 §6.1 的优先级开始组件开发。第一个要做的组件是 `DownloadPanel.tsx` + `DownloadItem.tsx`——它们包含了签名元素（发光进度条），是视觉设计的灵魂。
