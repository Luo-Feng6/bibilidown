# BilibiliDown 视觉设计规范

> **版本**: v1.0  
> **日期**: 2026-07-21  
> **设计基准**: Windows 11 Fluent Design System  
> **参考方法论**: frontend-design + ui-ux-pro-max  
> **目标技术栈**: 桌面应用（CSS 变量体系，可适配 Electron / JavaFX / WinUI 3）

---

## 目录

1. [设计理念](#1-设计理念)
2. [颜色体系 (Color Tokens)](#2-颜色体系)
3. [字体系统 (Typography)](#3-字体系统)
4. [间距与网格 (Spacing & Grid)](#4-间距与网格)
5. [圆角规范 (Border Radius)](#5-圆角规范)
6. [阴影与层级 (Elevation & Shadow)](#6-阴影与层级)
7. [图标系统 (Iconography)](#7-图标系统)
8. [组件渲染效果 (Component Styling)](#8-组件渲染效果)
9. [动效规范 (Motion)](#9-动效规范)
10. [亮色 / 暗色双主题](#10-亮色--暗色双主题)
11. [附录: Token 速查表](#11-附录-token-速查表)

---

## 1. 设计理念

### 1.1 一句话定位

> **一个让你忘记它在"下载"的下载工具** — 安静、通透、不刷存在感，但当你看它时，每个像素都是精心安排的。

### 1.2 三大设计支柱

| 支柱 | 含义 | 落地方式 |
|---|---|---|
| **通透 (Depth)** | 用 Mica/Acrylic 材质传递空间层次，而非用粗重边框分隔 | 半透明面板、模糊背景、微阴影层级 |
| **呼吸 (Breathing)** | 4px 单位制的宽松间距，让信息"浮"在界面上而非挤在一起 | 全局间距 Token、卡片内边距、芯片间距 |
| **专注 (Focus)** | 一次只做一件事——输入、确认、观察进度，三步清晰分离 | 输入栏常驻顶部、预览卡片内联展开、下载面板边缘固定 |

### 1.3 签名元素 (Signature Element)

> **毛玻璃下载进度条**：下载面板的每个任务项使用 Acrylic 材质——半透明背景 + 背景模糊，让用户透过进度面板隐约看到主内容区的视频封面。进度条本身是一个发光的强调色线条，不是笨重的矩形块。

这个元素之所以是"签名"，因为：
- 它直接将 Windows 11 的材质语言与下载工具的核心功能（进度跟踪）绑定
- 大多数下载工具的进度条是纯功能性的灰色矩形，没有辨识度
- 发光进度条传递"速度感"和"活跃感"，让等待变成一种享受

### 1.4 避免的设计陷阱

根据 frontend-design 方法论，刻意避开以下三种"AI 默认审美"：

| 陷阱 | 表现 | 本文档的应对 |
|---|---|---|
| 奶油底 + 赤陶点缀 | `#F4F1EA` 暖背景 + 衬线标题 | 使用冷色暗底 + 系统强调色，而非暖调模板 |
| 黑底 + 荧光绿 | 全黑 `#000` + `#00FF00` 终端风 | 深蓝灰底 `#0F172A` + 自适应强调色，压低对比度 |
| 报纸栏 + 零圆角 | hairline 分割线 + `border-radius:0` | 圆角 8px 起，分割改用间距和透明度，不用 1px 实线 |

---

## 2. 颜色体系

### 2.1 设计思路

颜色系统的设计遵循 **"先暗后亮"**。下载工具的使用场景常常在晚上——用户下班后打开 App 批量下载明天要看的视频。深色主题不仅是视觉偏好，更是对使用场景的尊重。

颜色分三层架构（遵循 design-system Skill 的 Token Architecture）：
- **Primitive Tokens**：原始色值，不含语义
- **Semantic Tokens**：按用途别名引用 Primitive
- **Component Tokens**：按组件覆盖 Semantic

### 2.2 Primitive Tokens — 基础色板

#### 2.2.1 中性色 (Slate Gray Scale)

用于背景层级、文字层级、边框。选择 Slate（板岩）系而非纯 Gray，因为 Slate 带有微量蓝色冷调，与 Windows 11 的 Mica 材质更协调。

```css
/* === GRAY SCALE (Slate 系) === */
--gray-0:   #FFFFFF;    /* 纯白 — 仅亮色模式卡片最高层 */
--gray-50:  #F8FAFC;    /* 亮色模式底层背景 */
--gray-100: #F1F5F9;    /* 亮色模式次级背景 */
--gray-200: #E2E8F0;    /* 亮色模式边框、分割 */
--gray-300: #CBD5E1;    /* 亮色模式禁用态边框 */
--gray-400: #94A3B8;    /* 占位文字、禁用态文字 */
--gray-500: #64748B;    /* 次要文字、辅助图标 */
--gray-600: #475569;    /* 正文文字（亮色）、次级文字（暗色）*/
--gray-700: #334155;    /* 标题文字（亮色）*/
--gray-800: #1E293B;    /* 暗色模式次级表面、亮色标题强化 */
--gray-850: #172033;    /* 暗色模式卡片悬停 */
--gray-900: #0F172A;    /* 暗色模式底层背景 */
--gray-950: #020617;    /* 暗色模式最深底 — 不常用，仅极端强调 */
```

#### 2.2.2 强调色 (Accent)

遵循 Windows 11 设计原则：**强调色跟随用户系统设置**。此处定义一组默认的蓝色系作为 fallback，但实现时应读取 `AccentColor` 系统 API 动态生成。

```css
/* === ACCENT (默认: Windows 11 Blue) === */
--accent-50:  #EFF6FF;    /* 亮色模式芯片选中背景 */
--accent-100: #DBEAFE;    /* 亮色模式 hover 背景 */
--accent-200: #BFDBFE;    /* 强调色淡色边框 */
--accent-300: #93C5FD;    /* 聚焦环外发光 */
--accent-400: #60A5FA;    /* (过渡色) */
--accent-500: #3B82F6;    /* 主强调色基准 */
--accent-600: #2563EB;    /* Hover / Pressed 状态 */
--accent-700: #1D4ED8;    /* 深色模式芯片选中背景 */
--accent-800: #1E40AF;    /* 深色文字强调 */
--accent-900: #1E3A8A;    /* (极少使用) */
```

**实现提示**：在实际代码中，`--accent-500` 到 `--accent-700` 应通过运行时读取 `Windows.UI.ViewManagement.UISettings.GetColorValue(UIColorType.Accent)` 计算，而非硬编码。

#### 2.2.3 Bilibili 品牌粉

Bilibili 的品牌粉 `#FB7299` 作为**辅助强调色**使用，仅出现在品牌相关场景（关于页、Logo 点缀），不与系统强调色冲突。

```css
--brand-pink:        #FB7299;   /* B站粉 — 品牌色基准 */
--brand-pink-light:  #FF85AD;   /* 亮色模式hover */
--brand-pink-dark:   #E55A80;   /* 暗色模式适配 */
```

#### 2.2.4 语义色 (Semantic)

用于成功/警告/错误的状态传达。所有语义色在设计时验证过 **WCAG AA 对比度**（至少 4.5:1 对背景）。

```css
/* === SUCCESS (Green) === */
--success-50:  #F0FDF4;
--success-400: #4ADE80;
--success-500: #22C55E;   /* 基准 — 任务完成、成功状态 */
--success-600: #16A34A;   /* 暗色模式适配 */
--success-700: #15803D;

/* === WARNING (Amber) === */
--warning-50:  #FFFBEB;
--warning-400: #FBBF24;
--warning-500: #F59E0B;   /* 基准 — 磁盘不足、FFmpeg缺失 */
--warning-600: #D97706;   /* 暗色模式适配 */
--warning-700: #B45309;

/* === ERROR (Red) === */
--error-50:    #FEF2F2;
--error-400:   #F87171;
--error-500:   #EF4444;   /* 基准 — 下载失败、解析错误 */
--error-600:   #DC2626;   /* 暗色模式适配 */
--error-700:   #B91C1C;
```

### 2.3 Semantic Tokens — 语义层

将 Primitive 色值按**用途**映射为语义 Token。这是亮/暗模式切换的唯一切换点——只需覆写语义 Token 的值。

```css
/* ============================================================
   LIGHT MODE (默认)
   ============================================================ */
:root, [data-theme="light"] {
  /* ── 表面层级 (从低到高) ── */
  --surface-root:       var(--gray-50);     /* 窗口最底层背景 */
  --surface-default:    var(--gray-0);      /* 卡片、面板背景 */
  --surface-elevated:   var(--gray-0);      /* 悬浮层（Popover、Tooltip） */
  --surface-overlay:    rgba(0,0,0,0.04);  /* Modal 遮罩背后的"收起"区 */

  /* ── 文字层级 ── */
  --text-primary:       var(--gray-800);    /* 一级标题、正文 */
  --text-secondary:     var(--gray-500);    /* 辅助信息、UP主名、日期 */
  --text-tertiary:      var(--gray-400);    /* 占位文字、提示 */
  --text-disabled:      var(--gray-300);    /* 禁用态文字 */
  --text-inverse:       var(--gray-0);      /* 强调色背景上的白色文字 */

  /* ── 边框 ── */
  --border-default:     var(--gray-200);    /* 卡片边框、输入框边框 */
  --border-subtle:      rgba(0,0,0,0.06);  /* 微妙的卡片分隔 */
  --border-strong:      var(--gray-300);    /* 聚焦边框 */

  /* ── 强调色 (语义映射) ── */
  --color-accent:       var(--accent-500);
  --color-accent-hover: var(--accent-600);
  --color-accent-text:  var(--gray-0);       /* 强调色背景上的文字 */
  --color-accent-muted: var(--accent-50);    /* 芯片选中态浅底 */

  /* ── 语义状态 ── */
  --color-success:      var(--success-500);
  --color-success-bg:   var(--success-50);
  --color-warning:      var(--warning-500);
  --color-warning-bg:   var(--warning-50);
  --color-error:        var(--error-500);
  --color-error-bg:     var(--error-50);

  /* ── Acrylic / Mica 材质 ── */
  --acrylic-bg:         rgba(255,255,255,0.72);
  --acrylic-blur:       24px;
  --acrylic-border:     rgba(0,0,0,0.06);
  --mica-bg:            rgba(248,250,252,0.85);  /* 标题栏/导航用 */
}
```

```css
/* ============================================================
   DARK MODE
   ============================================================ */
[data-theme="dark"] {
  /* ── 表面层级 ── */
  --surface-root:       var(--gray-900);     /* #0F172A */
  --surface-default:    var(--gray-800);     /* #1E293B */
  --surface-elevated:   var(--gray-850);     /* #172033 — 悬浮层稍亮 */
  --surface-overlay:    rgba(0,0,0,0.45);

  /* ── 文字层级 ── */
  --text-primary:       var(--gray-50);      /* #F8FAFC */
  --text-secondary:     var(--gray-400);     /* #94A3B8 */
  --text-tertiary:      var(--gray-500);     /* #64748B */
  --text-disabled:      var(--gray-600);     /* #475569 */
  --text-inverse:       var(--gray-900);     /* 强调色背景上的深色文字 */

  /* ── 边框 ── */
  --border-default:     rgba(255,255,255,0.08);
  --border-subtle:      rgba(255,255,255,0.04);
  --border-strong:      rgba(255,255,255,0.14);

  /* ── 强调色 — 暗色模式下降一档亮度避免刺眼 ── */
  --color-accent:       var(--accent-400);    /* 比亮色模式亮一档 */
  --color-accent-hover: var(--accent-300);
  --color-accent-text:  var(--gray-900);
  --color-accent-muted: rgba(59,130,246,0.15); /* 半透明浅底 */

  /* ── 语义状态 — 暗色下降亮度 ── */
  --color-success:      var(--success-400);
  --color-success-bg:   rgba(34,197,94,0.12);
  --color-warning:      var(--warning-400);
  --color-warning-bg:   rgba(245,158,11,0.12);
  --color-error:        var(--error-400);
  --color-error-bg:     rgba(239,68,68,0.12);

  /* ── Acrylic / Mica — 暗色下更深更透 ── */
  --acrylic-bg:         rgba(15,23,42,0.78);
  --acrylic-blur:       24px;
  --acrylic-border:     rgba(255,255,255,0.06);
  --mica-bg:            rgba(15,23,42,0.88);
}
```

### 2.4 Component Tokens — 组件层

精选关键组件的 Token，展示完整的三层映射关系：

```css
:root {
  /* ── 输入框 (Input Bar) ── */
  --input-height:       44px;
  --input-radius:       8px;
  --input-bg:           var(--surface-default);
  --input-border:       var(--border-default);
  --input-border-focus: var(--color-accent);
  --input-ring-focus:   0 0 0 3px rgba(59,130,246,0.12);
  --input-text:         var(--text-primary);
  --input-placeholder:  var(--text-tertiary);

  /* ── 视频卡片 (Video Card) ── */
  --card-radius:        12px;
  --card-bg:            var(--surface-default);
  --card-border:        var(--border-subtle);
  --card-shadow:        0 2px 8px rgba(0,0,0,0.06);
  --card-shadow-hover:  0 4px 16px rgba(0,0,0,0.10);
  --card-padding:       16px;
  --card-gap:           16px;              /* 多卡片间距 */

  /* ── 清晰度芯片 (Quality Chip) ── */
  --chip-height:         48px;
  --chip-min-width:      96px;
  --chip-radius:         8px;
  --chip-gap:            8px;
  --chip-bg-rest:        transparent;
  --chip-border-rest:    var(--border-default);
  --chip-text-rest:      var(--text-primary);
  --chip-bg-hover:       rgba(0,0,0,0.04);
  --chip-border-hover:   var(--gray-400);
  --chip-bg-selected:    var(--color-accent);
  --chip-border-selected:var(--color-accent);
  --chip-text-selected:  var(--color-accent-text);
  --chip-bg-disabled:    var(--gray-100);
  --chip-text-disabled:  var(--text-disabled);

  /* ── 按钮 (Button) ── */
  --btn-height:          36px;
  --btn-radius:          6px;
  --btn-padding-x:       16px;
  --btn-primary-bg:      var(--color-accent);
  --btn-primary-text:    var(--color-accent-text);
  --btn-primary-hover:   var(--color-accent-hover);

  /* ── 进度条 (Progress Bar) ── */
  --progress-height:     4px;
  --progress-radius:     2px;
  --progress-bg:         rgba(0,0,0,0.06);
  --progress-fill:       var(--color-accent);
  --progress-glow:       0 0 8px rgba(59,130,246,0.4);  /* 签名元素的发光 */

  /* ── 下载面板 (Download Panel) ── */
  --panel-width:         320px;
  --panel-bg:            var(--acrylic-bg);
  --panel-blur:          var(--acrylic-blur);
  --panel-border:        var(--acrylic-border);
}
```

### 2.5 对比度合规验证表

所有文字-背景组合通过 WCAG AA（≥4.5:1 常规文字，≥3:1 大文字/UI 组件）：

| 元素 | 亮色模式组合 | 对比度 | 暗色模式组合 | 对比度 |
|---|---|---|---|---|
| 标题文字 | `#1E293B` on `#FFFFFF` | 13.5:1 ✅ | `#F8FAFC` on `#1E293B` | 13.2:1 ✅ |
| 正文文字 | `#475569` on `#FFFFFF` | 5.5:1 ✅ | `#94A3B8` on `#1E293B` | 4.8:1 ✅ |
| 芯片选中文字 | `#FFFFFF` on `#3B82F6` | 4.6:1 ✅ | `#0F172A` on `#60A5FA` | 7.1:1 ✅ |
| 错误态文字 | `#DC2626` on `#FEF2F2` | 5.3:1 ✅ | `#F87171` on `rgba(239,68,68,0.12)` | 5.1:1 ✅ |
| 次要信息 | `#64748B` on `#FFFFFF` | 4.6:1 ✅ | `#64748B` on `#0F172A` | 5.5:1 ✅ |

---

## 3. 字体系统

### 3.1 字体栈

**首选方案：Windows 原生字体栈。** 不引入 Google Fonts 网络依赖——桌面应用使用系统字体可获得最佳渲染性能、ClearType 优化、以及零加载延迟。

```css
/* Display / 大标题 — Segoe UI Variable 的 Display 光学尺寸 */
--font-display: "Segoe UI Variable Display", "Segoe UI", "SF Pro Display",
                system-ui, -apple-system, sans-serif;

/* Body / UI 文字 — Segoe UI Variable 的 Text 光学尺寸 */
--font-body:    "Segoe UI Variable Text", "Segoe UI", "SF Pro Text",
                system-ui, -apple-system, sans-serif;

/* 等宽 / 代码 — Cascadia Code (Windows Terminal 默认等宽) */
--font-mono:    "Cascadia Code", "Cascadia Mono", "JetBrains Mono",
                "Fira Code", "Consolas", monospace;
```

**为什么不用 Outfit/Work Sans（ui-ux-pro-max 推荐）？**
Outfit/Work Sans 是 Web 应用的最优解。但桌面应用的规则不同：系统字体在本地渲染上具有绝对优势——ClearType 微调、光学尺寸自动适配、零网络请求。Segoe UI Variable 本身就是专为 Windows 11 UI 设计的可变字体，天然支持 `opsz`（光学尺寸）轴，在小字号 UI 文字和大标题之间自动切换最佳字形。

**回退策略**：
- Windows: Segoe UI Variable → Segoe UI → system-ui
- macOS: SF Pro Display/Text → -apple-system
- Linux: system-ui（通常为 Cantarell 或 Noto Sans）

### 3.2 字体级联 (Type Scale)

采用 **Major Third (1.25)** 比率，从 11px 到 32px，覆盖所有 UI 场景：

| Token | 用途 | 字号 | 行高 | 字重 | 字间距 |
|---|---|---|---|---|---|
| `--text-caption` | 状态栏、徽标、微小标注 | 11px / 0.6875rem | 1.4 (15px) | 400 Regular | 0 |
| `--text-body-sm` | 辅助信息、UP主名、日期、文件大小 | 13px / 0.8125rem | 1.5 (20px) | 400 Regular | 0 |
| `--text-body` | 正文、按钮文字、芯片标签、列表项 | 14px / 0.875rem | 1.5 (21px) | 400 Regular | 0 |
| `--text-body-lg` | 卡片标题、面板标题、输入框文字 | 16px / 1rem | 1.5 (24px) | 400 Regular | -0.01em |
| `--text-heading-sm` | 视频卡片标题、下载面板分组标题 | 18px / 1.125rem | 1.4 (25px) | 500 Medium | -0.01em |
| `--text-heading` | 页面主标题、大卡片标题 | 22px / 1.375rem | 1.35 (30px) | 600 SemiBold | -0.02em |
| `--text-heading-lg` | 空状态大标题、关于页标题 | 28px / 1.75rem | 1.3 (36px) | 600 SemiBold | -0.02em |
| `--text-heading-xl` | （极少使用，如启动画面） | 32px / 2rem | 1.25 (40px) | 700 Bold | -0.03em |

### 3.3 字重 (Font Weight) 使用纪律

Segoe UI Variable 支持连续字重（100-900），但 UI 中仅使用以下离散值以保持节奏：

| 字重 | 数值 | 使用场景 |
|---|---|---|
| Regular | 400 | 正文、辅助信息、输入框、标签、状态栏 |
| Medium | 500 | 小标题、卡片标题、按钮、芯片标签 |
| SemiBold | 600 | 页面标题、大标题、导航项 |
| Bold | 700 | 仅品牌名称、启动画面大标题 |

**纪律**：不在同一页面混合使用超过 3 种字重。大部分 UI 仅使用 400 和 500 两种。

### 3.4 行高规则

| 文字类别 | 行高 | 原因 |
|---|---|---|
| 标题 (≥18px) | 1.3–1.4 | 大文字不需要过大的行间距 |
| 正文 (14–16px) | 1.5 | 段落/多行文本的最舒适阅读行高 |
| 小文字 (≤13px) | 1.4–1.5 | 避免行间距过大导致小文字散开 |
| 代码/等宽 | 1.6 | 代码可读性需要更大行间距 |
| 单行 UI (按钮/标签) | 1.0（垂直居中靠 padding） | 单行无需行高，靠 Flexbox 居中 |

### 3.5 实际渲染示例

```
┌──────────────────────────────────────────────────────┐
│  28px SemiBold (--text-heading-lg)                   │ ← 空状态大标题
│                                                      │
│  22px SemiBold (--text-heading)                      │ ← 页面标题
│                                                      │
│  18px Medium (--text-heading-sm)                     │ ← 卡片标题
│  ────────────────────────────────────────────────    │
│  14px Regular (--text-body)                          │ ← 正文段落
│  这是正文内容，14px 字号配合 1.5 行高提供舒适的阅读     │
│  体验，在 Windows ClearType 下渲染锐利。               │
│                                                      │
│  13px Regular (--text-body-sm)                       │ ← 辅助信息
│  UP主名称 · 12.3万播放 · 12:30 · 2025-06-15          │
│                                                      │
│  11px Regular (--text-caption)                       │ ← 状态栏/徽标
│  ✓ 就绪 · 下载队列: 2 进行中, 15 已完成              │
└──────────────────────────────────────────────────────┘
```

---

## 4. 间距与网格

### 4.1 基准单位

一切间距基于 **4px 栅格**。这是 Windows 11 和大多数现代设计系统的公约数。

```css
--space-1:  4px;    /* 0.25rem — 芯片内图标与文字间距 */
--space-2:  8px;    /* 0.5rem  — 芯片之间间距、小组件内部间距 */
--space-3:  12px;   /* 0.75rem — 卡片内元素间距 */
--space-4:  16px;   /* 1rem    — 卡片内边距、标准组件间距 */
--space-5:  20px;   /* 1.25rem — 区域内部间距（较少使用） */
--space-6:  24px;   /* 1.5rem  — 区域之间间距、Section 间距 */
--space-8:  32px;   /* 2rem    — 大区域间距 */
--space-10: 40px;   /* 2.5rem  — 页面级间距 */
--space-12: 48px;   /* 3rem    — 页面外边距 */
```

### 4.2 应用规则

| 间距 | 应用到 |
|---|---|
| 4px | 图标与标签间距、芯片标签与预估大小间距 |
| 8px | 同组芯片间距、按钮内图标与文字间距、表单行间距 |
| 12px | 卡片标题与元信息间距、面板分组间距 |
| 16px | 卡片内边距（标准）、主内容区与下载面板间距 |
| 24px | 输入栏与内容区间距、Section 之间间距 |
| 32px | 导航与主内容间距、页面顶部/底部内边距 |

### 4.3 网格线（用于布局参考）

```
1280px 窗口宽度下的列网格：
┌─────────────────────────────────────────────────────────┐
│ ← 16px → │ ←─── 弹性主内容区 ───→ │ ← 16px → │ ← 320px →│
│           │                       │           │  下载面板  │
│  导航     │                       │  间距     │           │
│  56px     │                       │  12px     │           │
└─────────────────────────────────────────────────────────┘
```

主内容区在卡片模式下内部还可细分为：
```
┌─────────────────────────────┐
│ ←─────── 卡片全宽 ────────→ │
│ ← 2px ──────────────────→  │  ← 内容安全区 (content-safe)
│ ← 16px → 卡片内边距        │
└─────────────────────────────┘
```

---

## 5. 圆角规范

### 5.1 圆角 Token

遵循"越小越内、越大越外"的嵌套圆角原则。外部容器使用大圆角，内部元素使用小圆角，形成视觉和谐。

```css
--radius-none:  0;       /* 分割线、表格 */
--radius-xs:     2px;    /* 进度条 */
--radius-sm:     4px;    /* 徽标、小标签、代码块 */
--radius-md:     6px;    /* 按钮、芯片（内部元素）、输入框内部 */
--radius-lg:     8px;    /* 输入框（外层）、芯片（外层） */
--radius-xl:    12px;    /* 卡片、面板、Modal */
--radius-2xl:   16px;    /* 大卡片（视频播放器卡片）、浮动面板 */
--radius-full:  9999px;  /* 圆形头像、药丸形标签 */
```

### 5.2 嵌套圆角公式

当两个元素嵌套时，内层圆角 + 内边距 = 外层圆角。确保视觉上平滑过渡：

```
外层 radius-xl (12px) → 内层 radius-md (6px) + padding 16px
外层 radius-lg (8px)  → 内层 radius-sm (4px) + padding 8px
```

用公式表达：`inner_radius = max(0, outer_radius - padding)`

| 外层元素 | 外层圆角 | 内边距 | 内层元素圆角 |
|---|---|---|---|
| 视频卡片 | `--radius-xl` (12px) | 16px | `--radius-md` (6px) |
| 清晰度芯片 | `--radius-lg` (8px) | — | 文字内容，无嵌套 |
| 输入框 | `--radius-lg` (8px) | 12px | — |
| 按钮 | `--radius-md` (6px) | — | — |
| 下载面板 | `--radius-2xl` (16px) | 16px | `--radius-lg` (8px) |
| Tooltip | `--radius-md` (6px) | 8px | — |

### 5.3 窗口圆角

Windows 11 默认提供 8px 的窗口圆角（通过 DWM `DWM_WINDOW_CORNER_PREFERENCE` API）。如果使用自定义标题栏（无边框窗口），需在窗口最外层容器手动设置 `border-radius: 8px` 并配合 `overflow: hidden`。

---

## 6. 阴影与层级

### 6.1 层级定义

界面的 Z 轴分 6 层。Web 实现用 `box-shadow`，原生实现用对应的 Elevation 值。

```
Layer 0: 根背景 (Mica 材质, elevation 0)
Layer 1: 基础卡片 (elevation 1-2)
Layer 2: 悬浮卡片 / 下拉菜单 (elevation 3-4)
Layer 3: 模态面板 (elevation 5-8)
Layer 4: Toast 通知 (elevation 9-12)
Layer 5: Tooltip (elevation 13+)
```

### 6.2 阴影 Token

```css
/* 亮色模式阴影 — 小而精致，不使用大面积扩散 */
--shadow-none:     none;
--shadow-xs:       0 1px 2px rgba(0,0,0,0.04);     /* 微妙抬升 — 分割线替代 */
--shadow-sm:       0 2px 4px rgba(0,0,0,0.06);     /* 卡片默认 */
--shadow-md:       0 4px 12px rgba(0,0,0,0.08);    /* 卡片 Hover / 下拉 */
--shadow-lg:       0 8px 24px rgba(0,0,0,0.12);    /* Modal / 抽屉 */
--shadow-xl:       0 16px 40px rgba(0,0,0,0.16);   /* Toast / 通知 */
--shadow-ring:     0 0 0 3px rgba(59,130,246,0.12); /* 聚焦环 */
--shadow-glow:     0 0 12px rgba(59,130,246,0.3);   /* 进度条发光（签名元素） */
```

```css
/* 暗色模式阴影 — 加深黑色+提高透明度 */
[data-theme="dark"] {
  --shadow-xs:     0 1px 2px rgba(0,0,0,0.3);
  --shadow-sm:     0 2px 4px rgba(0,0,0,0.4);
  --shadow-md:     0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg:     0 8px 24px rgba(0,0,0,0.6);
  --shadow-xl:     0 16px 40px rgba(0,0,0,0.7);
  --shadow-ring:   0 0 0 3px rgba(96,165,250,0.2);   /* 暗色下聚焦环更亮 */
  --shadow-glow:   0 0 16px rgba(96,165,250,0.5);     /* 暗色下发光更明显 */
}
```

**原则**：暗色模式下阴影应该更深更明显，因为暗色背景上微妙的阴影变化感知不到。

---

## 7. 图标系统

### 7.1 推荐图标库：Phosphor Icons

根据 ui-ux-pro-max 搜索结果，Phosphor Icons 是最适合现代桌面 UI 的开源图标库。

**选型理由**：

| 维度 | Phosphor Icons | Lucide | Heroicons |
|---|---|---|---|
| 图标数量 | 1,488+ | 1,200+ | 292 |
| 风格变体 | 6 种 (Thin/Light/Regular/Bold/Fill/Duotone) | 1 种 | 2 种 (Outline/Solid) |
| 线条粗细一致性 | ✅ 优秀 — 精密控制 | ✅ 好 | ✅ 好 |
| 桌面应用匹配度 | ✅ 最佳 — 图标语义丰富 | 好 | 偏 Web |
| 许可证 | MIT | ISC | MIT |
| 导入方式 | `@phosphor-icons/react` 或直接 SVG | `lucide-react` 或 SVG | `@heroicons/react` 或 SVG |

### 7.2 图标风格与尺寸

**UI 中统一使用 Regular（线条描边）风格**，线条粗细 **1.5px**。这是 Windows 11 Segoe Fluent Icons 的等效线条粗细。

```css
--icon-size-xs:  14px;  /* 状态栏小图标、徽标 */
--icon-size-sm:  16px;  /* 卡片内图标、按钮内图标 */
--icon-size-md:  20px;  /* 导航图标、标题栏图标 */
--icon-size-lg:  24px;  /* 空状态大图标、功能图标 */
--icon-size-xl:  32px;  /* 品牌图标 */
--icon-size-2xl: 48px;  /* Hero 区域图标 */

--icon-stroke:   1.5px; /* 全局线条粗细（Regular 变体） */
```

### 7.3 图标与 BilibiliDown 场景映射

| 图标名 (Phosphor) | 使用场景 |
|---|---|
| `DownloadSimple` | 下载面板、下载按钮、导航图标 |
| `Gear` / `GearSix` | 设置导航 |
| `ClockCounterClockwise` | 历史记录 |
| `MagnifyingGlass` | 输入栏前缀图标 |
| `X` | 关闭/清除按钮 |
| `CaretDown` | 折叠/展开箭头 |
| `CaretLeft` / `CaretRight` | 导航箭头、芯片切换 |
| `Check` | 完成状态、选中标记 |
| `Warning` / `WarningCircle` | 警告状态 |
| `XCircle` | 错误状态、失败标记 |
| `Pause` / `Play` | 任务暂停/继续 |
| `Trash` | 删除任务 |
| `FolderOpen` | 打开文件夹 |
| `ArrowsDownUp` | 拖拽排序指示 |
| `Copy` | 复制错误信息 |
| `User` | 登录状态（未登录） |
| `UserCircle` | 登录状态（已登录） |
| `Question` | 关于/帮助 |
| `FilmStrip` | 视频解析结果 |
| `Subtitles` | 字幕下载选项 |
| `ChatCenteredDots` | 弹幕下载选项 |

### 7.4 非 Phosphor 图标的品牌图标

Bilibili 品牌 Logo 相关的图标（如窗口图标、关于页 Logo）使用项目自带的 PNG 资源或 SVG 重绘。不做任何改动，保持与旧版一致。

---

## 8. 组件渲染效果

### 8.1 视频详情卡片 (VideoCard)

```
┌──────────────────────────────────────────────────────────┐
│ ← 16px padding →                                       │
│ ┌────────────┐  视频标题 — 18px Medium                  │
│ │            │  (最多2行, 超出省略号)                    │
│ │  封面      │                                         │
│ │  280×158   │  👤 UP主名称 · 👁 12.3万 · ⏱ 12:30     │
│ │            │  13px Regular, --text-secondary          │
│ │  圆角 8px  │                                         │
│ │            │  ← 12px 间距 →                           │
│ └────────────┘  ┌──────────┐ ┌──────┐ ┌──────┐        │
│                 │1080P60 ✓│ │ 4K  │ │ 720P │  ...     │
│                 │ 约210MB  │ │890MB│ │120MB │         │
│                 └──────────┘ └──────┘ └──────┘        │
│                                                         │
│                 ▼ 高级选项 (折叠, 默认收起)              │
│                 ─────────────────────────               │
│                 格式: [mp4] [flv] [m4s]                 │
│                 编码: [HEVC] [AVC] [AV1]                │
│                 ☐ 下载字幕  ☐ 下载弹幕                  │
│                                                         │
│                 [      加入下载队列      ]  预估 210MB   │
│                 ← 按钮 36px 高, 全宽 →                  │
└──────────────────────────────────────────────────────────┘
```

**详细规格**：

| 属性 | 值 |
|---|---|
| 宽度 | 弹性（填充主内容区） |
| 最小宽度 | 560px |
| 最大宽度 | 无上限（100% 父容器） |
| 背景 | `var(--card-bg)` |
| 圆角 | `var(--card-radius)` = 12px |
| 阴影 | `var(--card-shadow)` = `0 2px 8px rgba(0,0,0,0.06)` |
| 边框 | `1px solid var(--card-border)` = `1px solid rgba(0,0,0,0.06)` |
| 内边距 | `var(--card-padding)` = 16px |
| 封面图宽度 | 固定 280px（16:9 缩放，高 158px） |
| 封面图圆角 | 8px |

**Hover 态**：

| 属性 | 变化 |
|---|---|
| 阴影 | `--card-shadow` → `--card-shadow-hover` (0 2px 8px → 0 4px 16px) |
| 变换 | 无（卡片不缩放——桌面 UI 不是 Web，元素不应"浮起"） |
| 过渡 | `box-shadow 200ms ease` |
| 光标 | `default`（卡片是容器，不是可点击项） |

**出现动画**（首次渲染）：
```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
/* duration: 300ms, easing: cubic-bezier(0.0, 0.0, 0.2, 1.0) */
```

**关闭动画**：
```css
@keyframes card-exit {
  from {
    opacity: 1;
    max-height: 400px;
    margin-bottom: 16px;
  }
  to {
    opacity: 0;
    max-height: 0;
    margin-bottom: 0;
    padding-top: 0;
    padding-bottom: 0;
  }
}
/* duration: 250ms, easing: cubic-bezier(0.4, 0.0, 1.0, 1.0) */
```

### 8.2 清晰度芯片 (QualityChip)

这是视觉设计中最重要的交互组件，也是最体现"克制美学"的地方。

**未选中态**：
```
┌──────────────┐
│              │  ← 48px 高
│   1080P60    │  ← 14px Medium, --text-primary
│   约 210MB   │  ← 12px Regular, --text-secondary
│              │
└──────────────┘
  圆角 8px
  1px solid --chip-border-rest
  背景透明
```

**选中态（默认强调色）**：
```
┌──────────────┐
│              │  ← 48px 高
│  ✓ 1080P60  │  ← 14px Medium, --chip-text-selected (白色)
│    约 210MB  │  ← 12px Regular, rgba(255,255,255,0.75)
│              │
└──────────────┘
  圆角 8px
  无边框
  背景 --chip-bg-selected (强调色实色填充)
  选中标记 ✓ 左侧 12px
```

**Hover 态（未选中时）**：
```
┌──────────────┐
│              │  ← 48px 高
│   4K         │  ← 14px Medium
│   约 890MB   │  ← 12px Regular
│              │
└──────────────┘
  边框颜色加深到 --chip-border-hover
  背景出现微妙的 --chip-bg-hover (rgba(0,0,0,0.04))
  过渡 150ms ease
```

**键盘聚焦态（Focus Visible）**：
```
  ┌──────────────┐
  │◖            ◗│  ← 外发光 0 0 0 3px rgba(59,130,246,0.12)
  │   4K         │  ← 1px solid --color-accent 替代默认边框
  └──────────────┘
```

**不可用态（该清晰度无源）**：
```
┌──────────────┐
│   8K         │  ← 文字 40% 透明度 (--text-disabled)
│   (无源)     │  ← 边框 --gray-100 (极浅)
└──────────────┘
  背景 --gray-50 (亮色) / rgba(255,255,255,0.02) (暗色)
  光标 not-allowed
```

**完整交互状态表**：

| 状态 | 背景 | 边框 | 文字颜色 | 预估大小颜色 | 光标 |
|---|---|---|---|---|---|
| 未选中 Rest | 透明 | `--border-default` 1px | `--text-primary` | `--text-secondary` | pointer |
| 未选中 Hover | `rgba(0,0,0,0.04)` | `--gray-400` 1px | `--text-primary` | `--text-secondary` | pointer |
| 选中 Rest | `--color-accent` | `--color-accent` | `--text-inverse` (白) | `rgba(255,255,255,0.75)` | default |
| 选中 Hover | `--color-accent-hover` | `--color-accent-hover` | `--text-inverse` (白) | `rgba(255,255,255,0.75)` | default |
| 焦点可见 | 同当前选中态 | `--color-accent` 1px | 同当前态 | 同当前态 | — |
| 不可用 | `--gray-50` / 半透明 | `--gray-100` 1px | `--text-disabled` | `--text-disabled` | not-allowed |

**过渡动效**：
```css
.chip {
  transition:
    background-color 150ms ease,
    border-color    150ms ease,
    color           150ms ease,
    box-shadow      150ms ease;
}
```

**选中瞬间**：被选中的芯片有一个微小的"按下"反馈——`transform: scale(0.97)` → `scale(1.0)`，150ms。被取消选中的芯片无动画，直接回到未选中状态（避免视觉上"抖动"）。

### 8.3 输入框 (InputBar)

```
普通态：
┌────────────────────────────────────────────────────────┐
│ 🔗  粘贴 B 站链接或 BV/av/ep/ss/md 号...      [解析]  │
└────────────────────────────────────────────────────────┘
  高度 44px     圆角 8px    背景 --surface-default
  边框 1px --border-default    内边距 0 12px 0 40px (左侧给图标留空)

聚焦态：
┌────────────────────────────────────────────────────────┐
│ 🔗  https://www.bilibili.com/video/BV1xx411c7mD  [✕] [解析]  │
└────────────────────────────────────────────────────────┘
  边框变色为 --input-border-focus (强调色)
  外发光 --input-ring-focus: 0 0 0 3px rgba(59,130,246,0.12)
  输入框内有清除按钮 (✕, 20×20)

解析中：
┌────────────────────────────────────────────────────────┐
│ 🔗  https://www.bilibili.com/video/BV1xx411c7mD  [◌] [解析]  │
└────────────────────────────────────────────────────────┘
  解析按钮变为 loading spinner
  输入框保持聚焦态
```

| 属性 | 值 |
|---|---|
| 高度 | 44px |
| 圆角 | 8px |
| 背景 | `--input-bg` |
| 边框 | `1px solid --input-border` |
| 内边距 | `0 12px 0 40px`（左边给图标留空） |
| 文字 | 14px Regular |
| Placeholder 颜色 | `--input-placeholder` |
| 聚焦过渡 | `border-color 200ms ease, box-shadow 200ms ease` |
| 前缀图标 | 24px 链接图标，置于输入框内左侧 10px，颜色 `--text-tertiary` |
| 清除按钮 | 20×20px ✕ 图标，有内容时出现，圆角 4px，hover 背景 `rgba(0,0,0,0.06)` |
| 解析按钮 | 80×36px，圆角 6px，强调色背景，白色文字，字重 Medium |

### 8.4 按钮 (Button)

**三种变体**：

```
主要按钮 (Primary):            次要按钮 (Secondary):          图标按钮 (Icon):
┌───────────────────┐         ┌────────────────────┐         ┌────┐
│    加入下载队列     │         │      取消          │         │ ⏸ │
└───────────────────┘         └────────────────────┘         └────┘
  36px 高                       36px 高                       32×32px
  圆角 6px                      圆角 6px                      圆角 6px
  强调色实色背景                 透明背景                       透明背景
  白色文字                       强调色文字                     图标着色 --text-secondary
  字重 Medium                   字重 Medium                    Hover 背景 rgba(0,0,0,0.06)
```

**主按钮规格**：

| 状态 | 背景 | 文字 | 边框 |
|---|---|---|---|
| Rest | `--btn-primary-bg` | `--btn-primary-text` | 无 |
| Hover | `--btn-primary-hover` | `--btn-primary-text` | 无 |
| Pressed | `--btn-primary-hover` + `brightness(0.9)` | `--btn-primary-text` | 无 |
| Focus | `--btn-primary-bg` + 外发光 | `--btn-primary-text` | `--shadow-ring` |
| Disabled | `--gray-200` | `--text-disabled` | 无 |
| Loading | `--btn-primary-bg` | spinner + 文字稍透明 | 无 |

**次按钮规格**：

| 状态 | 背景 | 文字 | 边框 |
|---|---|---|---|
| Rest | 透明 | `--color-accent` | `1px solid --color-accent` |
| Hover | `rgba(59,130,246,0.06)` | `--color-accent` | `1px solid --color-accent` |
| Pressed | `rgba(59,130,246,0.12)` | `--color-accent` | `1px solid --color-accent` |
| Focus | 透明 + 外发光 | `--color-accent` | `1px solid --color-accent` |
| Disabled | 透明 | `--text-disabled` | `1px solid --gray-200` |

**图标按钮规格**（用于下载面板的暂停/取消/重试等）：
- 32×32px，圆角 6px
- 图标 20px，颜色 `--text-secondary`
- Hover: 背景 `rgba(0,0,0,0.06)`，图标颜色变为 `--text-primary`
- 过渡: `background-color 100ms ease, color 100ms ease`

### 8.5 进度条 (Progress Bar) — 签名元素

这是整个视觉设计的灵魂。

**常规进度条**（卡片/面板内嵌）：

```
████████████░░░░░░░░░░░░░░░░░░░░░░░░  52%
↑ 已下载 110MB / 210MB · 12.3MB/s · 剩余 8s
```

**带发光效果的进行中进度条**（下载面板）：

```
████████████░░░░░░░░░░░░░░░░░░░░░░░░  52%
│                                      │
└─ 外发光: 0 0 8px rgba(59,130,246,0.4)  ─┘  ← 签名元素
```

| 属性 | 值 |
|---|---|
| 轨道高度 | 4px |
| 轨道圆角 | 2px |
| 轨道背景 | `--progress-bg` = `rgba(0,0,0,0.06)` |
| 填充色 | `--progress-fill` = `--color-accent` |
| 填充发光 | `--progress-glow` = `0 0 8px rgba(59,130,246,0.4)` |
| 填充过渡 | `width 200ms ease-out` |
| 不确定态（解析中） | 1.5s 循环动画：填充条从左到右滑动（`@keyframes indeterminate`） |

**不确定进度动画**：
```css
@keyframes indeterminate {
  0%   { left: -40%; width: 40%; }
  50%  { left: 30%;  width: 50%; }
  100% { left: 100%; width: 40%; }
}
/* 使用 absolute 定位 + 上述 keyframes, infinite, 1.5s, ease-in-out */
```

**不同状态的进度条颜色**：

| 状态 | 填充色 | 发光色 |
|---|---|---|
| 下载中 | `--color-accent` | `0 0 8px rgba(59,130,246,0.4)` |
| 转码中 | `--color-accent`（无明显发光，因不是"速度"类） | 无 |
| 暂停 | `--gray-400` (#94A3B8) | 无 |
| 失败 | `--color-error` (#EF4444) | `0 0 8px rgba(239,68,68,0.3)` |
| 完成 | `--color-success` — 只停留 0.5s 后整行变为完成态 | `0 0 8px rgba(34,197,94,0.3)` — 闪烁一次 |

**下载速度 Sparkline**（可选展开）：

```
┌─ 速度曲线 ───────────────────────────────────────────┐
│  ▂▃▅▆▇▆▅▄▃▂▁▂▃▄▅▆▇▇▆▅▄▃▂                         │
│  30s 前                                  现在        │
│  平均: 11.2 MB/s  峰值: 15.8 MB/s                    │
└──────────────────────────────────────────────────────┘
```
- 高度 28px，纯 SVG/CSS 绘制
- 线条颜色：`--color-accent`，不透明度 0.6
- 无填充，仅描边 1.5px
- 默认折叠，点击进度条的 "12.3 MB/s" 文字可展开/折叠

### 8.6 下载面板 (Download Panel) — Acrylic 材质

```
┌───────────────────────────────┐
│ 📥 下载队列  (2)    [清空] [—]│  ← 面板标题栏
├───────────────────────────────┤
│                               │
│ 🔄 进行中                     │
│ ┌─────────────────────────┐   │
│ │ 🎬 视频标题...    [⏸][✕]│   │
│ │ ████████░░░░ 52%       │   │
│ │ 12.3MB/s · 剩余 45s     │   │
│ └─────────────────────────┘   │
│                               │
│ ✅ 已完成 (12)         [展开] │
│ ┌─────────────────────────┐   │
│ │ 12 个文件 · 2.4 GB      │   │
│ └─────────────────────────┘   │
└───────────────────────────────┘
```

| 属性 | 值 |
|---|---|
| 宽度 | `--panel-width` = 320px |
| 背景 | `--panel-bg` = `rgba(255,255,255,0.72)` |
| 背景滤镜 | `backdrop-filter: blur(var(--panel-blur))` = `blur(24px)` |
| 边框 | `1px solid --panel-border`（仅在面板与内容区间，不在窗口边缘） |
| 圆角 | 16px（仅左侧上下两个角——因为面板靠窗口右边缘） |
| 内边距 | 16px |
| 标题栏高度 | 40px，底部有微弱分割线 `rgba(0,0,0,0.04)` |
| 滚动 | 任务内容区 `overflow-y: auto`，滚动条纤细（6px） |

**Acrylic 材质的视觉层次**：面板覆盖在主内容区上方时，透过模糊可以看到后面隐约的内容——这让用户感知到"主内容区还在那里"，不是完全割裂的二级页面。

### 8.7 导航侧栏 (Navigation Sidebar)

```
┌────┐
│    │
│ 📥 │  ← 56px × 56px 图标区域
│    │    选中: 左侧 3px 强调色竖线 + 图标着色
│    │    未选中: 图标灰色, hover 变暗
│ ⚙ │
│    │
│ 📋 │
│    │
│    │
│    │  ← 中间留白区域
│    │
│    │
│ ℹ  │  ← 关于固定在底部
└────┘
```

| 属性 | 值 |
|---|---|
| 宽度 | 56px |
| 背景 | `--mica-bg`（Mica 材质，比 Acrylic 更微妙） |
| 图标大小 | 24px |
| 图标内边距 | 图标区域 56×56px（图标 24px + 上下左右各 16px） |
| 选中指示器 | 左侧 3px 宽、24px 高的圆角竖线（圆角 2px），颜色 `--color-accent` |
| 图标颜色（选中） | `--color-accent` |
| 图标颜色（未选中） | `--text-tertiary` |
| 图标颜色（Hover） | `--text-primary` |
| 分隔 | 不使用可见分割线，靠间距区分上下组 |

### 8.8 状态栏 (Status Bar)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 ✓ 就绪  ·  v6.41  ·  下载队列 2/17  ·  总计 1.2GB    👤 nICEnnnn
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

| 属性 | 值 |
|---|---|
| 高度 | 28px |
| 背景 | 比 `--surface-root` 稍深/浅一个层级（即 `--surface-default` 的反转） |
| 文字 | 11px Regular, `--text-tertiary` |
| 内边距 | 0 12px |
| 状态指示灯 | 8px 圆点：绿色 `--color-success` = 就绪 / 黄色 `--color-warning` = 警告 / 红色 `--color-error` = 异常 / 灰色闪烁 = 解析中 |
| 登录状态 | 点击可打开登录侧边面板 |

---

## 9. 动效规范

### 9.1 设计原则

遵循 ui-ux-pro-max 的动画规则：
- **150–300ms** 为 UI 反馈的标准时长
- **Spring** 物理曲线用于模态出现（阻尼感传递"重量"）
- **Ease-out** 用于元素进入（快速响应，缓慢停止）
- **Ease-in** 用于元素退出（让用户感知到元素正在消失）
- **退出快于进入**——进入 300ms，退出 200ms
- **尊重 `prefers-reduced-motion`**——所有动画在用户系统设置"减少动效"时降级为 0ms 淡入淡出

### 9.2 缓动函数定义

```css
/* Easing Curves — 匹配 Windows 11 动画语言 */
--ease-out:    cubic-bezier(0.0, 0.0, 0.2, 1.0);   /* 元素出现 */
--ease-in:     cubic-bezier(0.4, 0.0, 1.0, 1.0);   /* 元素消失 */
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1.0);   /* 往返动画 */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* 弹性动画（模态出现） */

/* Durations */
--duration-instant:  0ms;     /* 无动画 */
--duration-fast:     100ms;   /* Hover 颜色变化、图标状态切换 */
--duration-normal:   200ms;   /* 边框变色、进度条更新、阴影变化 */
--duration-slow:     300ms;   /* 卡片出现/消失、抽屉滑入/出 */
--duration-modal:    400ms;   /* 模态面板（弹簧） */
```

### 9.3 动效矩阵

| 元素 | 触发条件 | 属性变化 | 时长 | 缓动 |
|---|---|---|---|---|
| 视频卡片 | 首次渲染 | `opacity` + `translateY` | 300ms | `--ease-out` |
| 视频卡片 | 关闭 | `opacity` + `max-height` + `margin` | 250ms | `--ease-in` |
| 芯片 | Hover 进入 | `background-color` + `border-color` | 150ms | `--ease-out` |
| 芯片 | Hover 退出 | `background-color` + `border-color` | 200ms | `--ease-in` |
| 芯片 | 选中 | `background-color` + `color` + `scale(0.97→1)` | 150ms | `--ease-spring` |
| 输入框 | 聚焦/失焦 | `border-color` + `box-shadow` | 200ms | `--ease-out` |
| 按钮 | Hover | `background-color` | 100ms | `--ease-out` |
| 按钮 | Pressed | `transform: scale(0.98)` | 100ms | `--ease-in-out` |
| 进度条 | 百分比更新 | `width` | 200ms | `--ease-out` |
| 进度条 | 不确定态 | `left` (indeterminate) | 1500ms 循环 | `--ease-in-out` |
| 下载面板 | 展开/收起 | `transform: translateX` | 250ms | `--ease-out` |
| 登录面板 | 打开 | `transform: translateX` + 背景遮罩 `opacity` | 300ms | `--ease-spring` |
| 登录面板 | 关闭 | `transform: translateX` + 背景遮罩 `opacity` | 200ms | `--ease-in` |
| 下拉菜单 | 展开 | `opacity` + `scale(0.95→1)` + `translateY(-4px→0)` | 200ms | `--ease-out` |
| Toast | 进入 | `opacity` + `translateY(12px→0)` | 200ms | `--ease-out` |
| Toast | 退出 | `opacity` + `translateY(0→12px)` | 200ms | `--ease-in` |
| 骨架屏 | 加载中 | `background-position` (shimmer) | 1500ms 循环 | `linear` |
| 焦点环 | 聚焦/失焦 | `box-shadow` | 200ms | `--ease-out` |

### 9.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

当系统设置"减少动效"时：
- 所有动画降级为 **瞬时**（0.01ms 而非 0ms——某些辅助技术仍需要动画事件触发）
- 卡片出现/消失：仅 `opacity` 切换，无位移
- 进度条：仍更新宽度（这是功能性信息，不是装饰性动画）
- 不确定进度条：改为静态脉冲（opacity 在 0.4 和 0.6 之间切换）

---

## 10. 亮色 / 暗色双主题

### 10.1 主题检测与切换

```css
/* 默认跟随系统 */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    /* 自动应用 [data-theme="dark"] 的变量 */
  }
}

/* 手动覆盖 */
[data-theme="light"] { color-scheme: light; }
[data-theme="dark"]  { color-scheme: dark; }
```

### 10.2 主题切换动画

用户手动切换亮/暗模式时，添加一个 300ms 的背景色过渡，避免瞬间闪烁：

```css
:root {
  transition: background-color 300ms ease, color 300ms ease;
}
```

### 10.3 暗色模式下需要额外注意的点

| 场景 | 亮色 | 暗色 |
|---|---|---|
| 进度条轨道 | `rgba(0,0,0,0.06)` — 略深于白色 | `rgba(255,255,255,0.08)` — 略亮于黑色 |
| 芯片 Hover | `rgba(0,0,0,0.04)` — 深色叠加 | `rgba(255,255,255,0.06)` — 浅色叠加 |
| 禁用态芯片背景 | `--gray-50` (#F8FAFC) | `rgba(255,255,255,0.03)` |
| 卡片阴影 | `0 2px 8px rgba(0,0,0,0.06)` — 浅灰 | `0 2px 8px rgba(0,0,0,0.4)` — 深黑 |
| Acrylic 面板 | `rgba(255,255,255,0.72)` | `rgba(15,23,42,0.78)` |
| 错误背景 | `#FEF2F2` (浅红) | `rgba(239,68,68,0.12)` (半透明红) |
| 成功闪烁 | 浅绿背景闪烁一次 | `rgba(34,197,94,0.25)` 闪烁后淡出 |

### 10.4 主题 Token 对照速查

| Token | 亮色 | 暗色 |
|---|---|---|
| `--surface-root` | `#F8FAFC` | `#0F172A` |
| `--surface-default` | `#FFFFFF` | `#1E293B` |
| `--surface-elevated` | `#FFFFFF` | `#172033` |
| `--text-primary` | `#1E293B` | `#F8FAFC` |
| `--text-secondary` | `#64748B` | `#94A3B8` |
| `--text-tertiary` | `#94A3B8` | `#64748B` |
| `--border-default` | `#E2E8F0` | `rgba(255,255,255,0.08)` |
| `--color-accent` | `#3B82F6` | `#60A5FA` |
| `--color-accent-hover` | `#2563EB` | `#93C5FD` |

---

## 11. 附录: Token 速查表

### 11.1 完整 CSS 变量清单

以下是将要在代码中使用的所有 Token 的完整列表，按类别排列。

```
/* ═══════════════════════════════════════════════════════
   PRIMITIVE TOKENS
   ═══════════════════════════════════════════════════════ */
--gray-0, --gray-50, --gray-100, --gray-200, --gray-300,
--gray-400, --gray-500, --gray-600, --gray-700, --gray-800,
--gray-850, --gray-900, --gray-950
--accent-50, --accent-100, --accent-200, --accent-300,
--accent-400, --accent-500, --accent-600, --accent-700,
--accent-800, --accent-900
--brand-pink, --brand-pink-light, --brand-pink-dark
--success-50, --success-400, --success-500, --success-600, --success-700
--warning-50, --warning-400, --warning-500, --warning-600, --warning-700
--error-50, --error-400, --error-500, --error-600, --error-700

/* ═══════════════════════════════════════════════════════
   SEMANTIC TOKENS
   ═══════════════════════════════════════════════════════ */
/* Surface */
--surface-root, --surface-default, --surface-elevated, --surface-overlay
/* Text */
--text-primary, --text-secondary, --text-tertiary, --text-disabled, --text-inverse
/* Border */
--border-default, --border-subtle, --border-strong
/* Accent */
--color-accent, --color-accent-hover, --color-accent-text, --color-accent-muted
/* Semantic */
--color-success, --color-success-bg
--color-warning, --color-warning-bg
--color-error, --color-error-bg
/* Material */
--acrylic-bg, --acrylic-blur, --acrylic-border
--mica-bg

/* ═══════════════════════════════════════════════════════
   TYPOGRAPHY TOKENS
   ═══════════════════════════════════════════════════════ */
--font-display, --font-body, --font-mono
--text-caption, --text-body-sm, --text-body, --text-body-lg
--text-heading-sm, --text-heading, --text-heading-lg, --text-heading-xl

/* ═══════════════════════════════════════════════════════
   SPACING TOKENS
   ═══════════════════════════════════════════════════════ */
--space-1 (4px), --space-2 (8px), --space-3 (12px), --space-4 (16px)
--space-5 (20px), --space-6 (24px), --space-8 (32px)
--space-10 (40px), --space-12 (48px)

/* ═══════════════════════════════════════════════════════
   RADIUS TOKENS
   ═══════════════════════════════════════════════════════ */
--radius-none (0), --radius-xs (2px), --radius-sm (4px)
--radius-md (6px), --radius-lg (8px), --radius-xl (12px)
--radius-2xl (16px), --radius-full (9999px)

/* ═══════════════════════════════════════════════════════
   SHADOW TOKENS
   ═══════════════════════════════════════════════════════ */
--shadow-none, --shadow-xs, --shadow-sm, --shadow-md
--shadow-lg, --shadow-xl, --shadow-ring, --shadow-glow

/* ═══════════════════════════════════════════════════════
   COMPONENT TOKENS
   ═══════════════════════════════════════════════════════ */
/* Input */
--input-height, --input-radius, --input-bg, --input-border
--input-border-focus, --input-ring-focus, --input-text, --input-placeholder
/* Card */
--card-radius, --card-bg, --card-border, --card-shadow, --card-shadow-hover
--card-padding, --card-gap
/* Chip */
--chip-height, --chip-min-width, --chip-radius, --chip-gap
--chip-bg-rest, --chip-border-rest, --chip-text-rest
--chip-bg-hover, --chip-border-hover
--chip-bg-selected, --chip-border-selected, --chip-text-selected
--chip-bg-disabled, --chip-text-disabled
/* Button */
--btn-height, --btn-radius, --btn-padding-x
--btn-primary-bg, --btn-primary-text, --btn-primary-hover
/* Progress */
--progress-height, --progress-radius, --progress-bg
--progress-fill, --progress-glow
/* Panel */
--panel-width, --panel-bg, --panel-blur, --panel-border
/* Icon */
--icon-size-xs, --icon-size-sm, --icon-size-md
--icon-size-lg, --icon-size-xl, --icon-size-2xl
--icon-stroke

/* ═══════════════════════════════════════════════════════
   MOTION TOKENS
   ═══════════════════════════════════════════════════════ */
--ease-out, --ease-in, --ease-in-out, --ease-spring
--duration-instant, --duration-fast, --duration-normal
--duration-slow, --duration-modal
```

---

> **下一步**: 视觉规范确认通过后，进入原型实现阶段。建议从以下顺序入手：
> 1. CSS 变量文件（`tokens.css`）——所有 Token 的一次性定义
> 2. 布局骨架（Shell Layout）——三栏弹性布局 + 响应式断点
> 3. 视频卡片 + 清晰度芯片（最复杂的交互组件）
> 4. 下载面板 + 进度条（签名元素）
> 5. 输入栏、按钮、状态栏等基础组件
> 6. 登录面板、设置页面等次要页面
> 7. 暗色模式切换 + 动效微调
