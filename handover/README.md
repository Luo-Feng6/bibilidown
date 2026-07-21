# BilibiliDown v7.1 — 项目交接文档

> **最后更新**: 2026-07-21（第七轮：全部功能完成）  
> **项目路径**: `D:\all app\BibiliDown\`  
> **新工程路径**: `D:\all app\BibiliDown\output\`  
> **原始 Java 源码**: `D:\all app\BibiliDown\src\`

> 📚 **更详细的技术文档**：见 `handover/综合交接文档.md`（第五+六轮）、`handover/第七轮交接文档.md`、`handover/第八轮交接文档.md`（Bug 修复 + 功能增强）

---

## 目录

- [1. 项目总览](#1-项目总览)
  - [1.1 最初想做什么](#11-最初想做什么)
  - [1.2 三步走计划](#12-三步走计划)
  - [1.3 设计决策记录](#13-设计决策记录)
- [2. 当前进度总表](#2-当前进度总表)
- [3. 第二轮工作详解](#3-第二轮工作详解)
  - [3.1 接入真实 B 站解析 API](#31-接入真实-b-站解析-api)
  - [3.2 下载链接解析 + 下载引擎](#32-下载链接解析--下载引擎)
- [4. 代码结构](#4-代码结构)
  - [4.1 完整目录树](#41-完整目录树)
  - [4.2 每个文件的职责](#42-每个文件的职责)
  - [4.3 组件依赖关系图](#43-组件依赖关系图)
- [5. 数据流架构](#5-数据流架构)
  - [5.1 解析数据流](#51-解析数据流)
  - [5.2 下载数据流](#52-下载数据流)
- [6. 遇到的问题和解决方案](#6-遇到的问题和解决方案)
- [7. 后续待做工作](#7-后续待做工作-全部完成)
- [8. 快速参考](#8-快速参考)

---

## 1. 项目总览

### 1.1 最初想做什么

**原始项目 BilibiliDown** 是一个 Java Swing 写的 B 站视频下载器，功能完整但 UI 老旧（Swing 硬编码绝对布局、无暗色模式、弹窗满天飞）。

**目标**：用现代技术栈重写整个前端，逐步替换 Java 后端逻辑为 TypeScript 原生实现。

### 1.2 三步走计划

```
Phase 1 ✅ (第一轮)    Phase 2 ✅ (本轮)       Phase 3 🔲 (下一轮)
┌──────────────┐      ┌──────────────┐        ┌──────────────┐
│ UX 规格文档   │      │ B 站 API 接入  │        │ 登录系统      │
│ 视觉设计规范   │      │ 下载链接解析   │        │ FFmpeg 合并   │
│ Token 体系    │      │ 下载引擎      │        │ 剧集列表 UI   │
│ 项目骨架      │      │ 数据流打通     │        │ 发布打包      │
│ 全部 UI 组件  │      │ 端到端可工作   │        │ 自动更新      │
│ Zustand Store │      │               │        │               │
│ Electron 集成 │      │               │        │               │
└──────────────┘      └──────────────┘        └──────────────┘
    第一轮                   第二轮                   下一轮
```

### 1.3 设计决策记录

| 决策点 | 选择了什么 | 为什么 |
|---|---|---|
| UI 框架 | React 18 + TypeScript | 组件化、生态大、类型安全 |
| 构建工具 | Vite 5 | 比 Webpack 快 10x，HMR 即时生效 |
| 样式方案 | Tailwind CSS 3 + CSS Variables | 工具类开发快，CSS 变量做主题切换零成本 |
| 桌面壳 | Electron 43 | 跨平台，可直接打包为 Windows/macOS/Linux |
| 状态管理 | Zustand 5 | 比 Redux 轻 10x，API 简洁，自带 persist 中间件 |
| 路由方案 | 纯 Zustand 状态切换 | 桌面应用不需要 URL 路由 |
| 图标 | Phosphor Icons | 1,488 个图标、6 种变体、MIT 许可 |
| 字体 | Segoe UI Variable (系统原生) | 不依赖外部网络加载，ClearType 渲染最优 |
| 主题模式 | 先暗后亮 | 下载工具使用场景多在晚上 |
| 配色基调 | Slate 冷灰板 + 系统强调色 | 匹配 Windows 11 Mica 材质 |
| **API 架构** | **TypeScript 直调 B 站 API（Vite 代理）** | **不依赖 Java 后端，前端独立工作** |
| **下载模式** | **DASH 流式下载（fetch + ReadableStream）** | **现代浏览器原生支持，进度精确到字节** |

---

## 2. 当前进度总表

### 第一轮完成（UI + 状态管理 + Electron）

| 模块 | 内容 |
|------|------|
| 全部 UI 组件 | TitleBar, Sidebar, InputBar, VideoCard, QualityChip, DownloadPanel, DownloadItem, LoginPanel, StatusBar |
| 页面 | SettingsPage, HistoryPage, AboutPage |
| Zustand Store | downloadStore, parseStore, userPrefsStore (persist), navigationStore |
| 图标 | Phosphor Icons 全局替换所有 emoji |
| Electron 集成 | 主进程、预加载、窗口 IPC、原生对话框、镜像安装 |
| 缓存整理 | npm + Electron 缓存迁移到 `D:\all app\` |

### 第二轮完成（API + 下载引擎）← 本轮

| 模块 | 内容 |
|------|------|
| B 站 API 服务层 | URL 识别（BV/av/ep/ss/md/b23.tv）、视频信息获取、清晰度列表、番剧解析 → `src/services/bilibili-api.ts` |
| 下载链接解析 | DASH 音视频分离 URL、编码优选（AVC>HEVC）、清晰度降级 → `resolveDownloadUrl()` |
| 下载引擎 | 队列消费、流式下载、实时进度、速度 Sparkline、暂停/取消 → `src/services/download-manager.ts` |
| Vite 代理 | `/api/bilibili` → `api.bilibili.com`（带 UA/Referer/Origin） |
| InputBar 重写 | `setTimeout` 模拟 → 真实 API，错误卡片展示 |
| App.tsx 重写 | `DEMO_VIDEO` 硬编码 → `parseStore` 驱动四态页面 |
| 全链路打通 | 粘贴链接 → 解析 → 选清晰度 → 加入队列 → 下载 → 完成 |

### 第三轮完成（登录 + Electron IPC + FFmpeg）← 本轮

| 模块 | 内容 |
|------|------|
| Cookie 管理器 | 解析/验证/持久化 B站 Cookie，提取 CSRF token，验证登录状态 → `src/services/cookie-manager.ts` |
| 登录服务 | QR 码登录（生成+轮询+扫码检测）、密码登录（RSA JSEncrypt）、短信登录 → `src/services/login-service.ts` |
| API 鉴权注入 | `bilibili-api.ts` 全局 Cookie 注入（`setGlobalCookie`）、header 自动附带 Cookie |
| Vite 代理 Cookie | `cookieDomainRewrite` 将 B站 Set-Cookie 映射到 localhost、移除 Secure flag |
| Electron 文件写入 | `download:saveToDisk` IPC（main 进程 http+fs 流式下载）、`file:move`、进度事件 `download:progress` |
| FFmpeg 合并 | `ffmpeg:merge` IPC（child_process.spawn）、`ffmpeg:check` 检测可用性、多路径搜索 |
| 下载引擎重写 | Electron 模式（IPC 下载→temp→FFmpeg→最终路径）、浏览器模式（Blob+click 兜底） |
| LoginPanel 重写 | QR 码真实生成（qrcode 库）、扫码状态叠加层（等待/已扫码/过期/成功）、密码/短信表单 API 接入 |
| userPrefsStore 扩展 | 新增 `cookieStr`/`loginName`/`loginFace` 持久化字段 |

### 第四轮完成（WBI + EpisodeList + ml + Toast + 清理）

| 模块 | 内容 |
|------|------|
| WBI 签名 | `wbi-sign.ts` — 从 nav 接口获取 img_key+sub_key、MixinKey 抽取、URL 参数排序+MD5+追加 w_rid/wts。`encWbi()` 签名后 URL 用于 wbi/view 等 API → fallback 时自动启用 |
| MD5 | `md5.ts` — 基于 spark-md5（3KB），配合 WBI 签名 |
| 剧集列表 UI | `EpisodeList.tsx` — 批量操作组件：全局清晰度选择、全选/反选/取消全选、复选框列表、批量加入队列。当解析结果 >3 集时自动切换 |
| ml 收藏夹 | `bilibili-api.ts` + `parseMediaList()` — `GET /medialist/gateway/base/detail` 解析收藏夹/合集视频列表（需登录 Cookie） |
| Toast 通知 | `toastStore.ts` + `Toast.tsx` — 4 种类型（success/error/warning/info）、自动消失+进度条、可手动关闭、无依赖。接入下载完成/失败、解析成功/失败 |
| 清理临时方案 | `DEMO_DOWNLOADS` seed 数据已移除，下载面板从真实流程获取数据 |

### 第四轮完成续（WBI + EpisodeList + ml + Toast）

| 模块 | 内容 |
|------|------|
| WBI 签名 | `wbi-sign.ts` — nav 接口获取 img_key+sub_key、MixinKey 抽取、URL 参数排序+MD5 → `encWbi()` |
| MD5 | `md5.ts` — 基于 spark-md5（3KB），配合 WBI 签名 |
| 剧集列表 UI | `EpisodeList.tsx` — 批量操作：全局清晰度选择、全选/反选、复选框列表、批量加入队列（>3集自动切换） |
| ml 收藏夹 | `parseMediaList()` — GET /medialist/gateway/base/detail 解析收藏夹（需登录 Cookie） |
| Toast 通知 | `toastStore.ts` + `Toast.tsx` — 4 种类型（success/error/warning/info）、自动消失+进度条 |
| 清理 | 移除 DEMO_DOWNLOADS seed 数据，下载面板从真实流程获取数据 |

### 第五+六轮完成（托盘 + 历史 + 打包 + Cookie + FFmpeg + 测试）

| 模块 | 内容 |
|------|------|
| ml 收藏夹分页 | parseMediaList 首次解析→存分页状态→EpisodeList 底部"加载更多"按钮→逐页 append |
| ml cid 懒解析 | `resolveCidForBvid(bvid)` — 加入队列前 GET /x/player/pagelist → 补齐 cid，批量 Promise.allSettled |
| HistoryPage 历史记录 | 自动记录下载→`historyStore` persist（上限500条）→ 搜索+筛选+重新下载+删除+清空 |
| Electron 打包发布 | electron-builder → NSIS 安装包 + 便携版 + dmg + AppImage（国内镜像加速） |
| FFmpeg 检测横幅 | 启动检测→缺失时黄色警告横幅→下载引导链接（`ffmpegStore` + `FfmpegBanner`） |
| Cookie 启动验证 | `validateCookie()` → GET /x/web-interface/nav → StatusBar 显示过期/用户名 |
| 系统托盘 | 关闭→最小化到托盘、右键菜单（显示窗口/下载状态/退出）、下载完成通知 |
| 单元测试 | Vitest 55 tests（downloadStore 17 + parseStore 16 + bilibili-api 22 passed + 3 skipped） |

### 第七轮完成（图标 + 主题 + 极验 + FFmpeg下载 + CI/CD + Git）

| 模块 | 内容 |
|------|------|
| 应用图标系统 | `build/icon.svg` → sharp → icon.png/ico/icns/tray-icon/favicon（B站粉 + 白色下载箭头） |
| 亮色主题微调 | 6 项 Light Mode token 微调 + body 淡蓝光晕 + 硬编码颜色→CSS 变量 |
| 历史记录导出/导入 | exportAll→JSON 下载 / importEntries→验证→合并→Toast |
| 打包 CI/CD | GitHub Actions push v* tag → windows-latest → tsc→test→build→upload→Release |
| Cookie 自动刷新 | `refreshCookie()` → POST /x/passport-login/web/cookie/refresh → 自动续期 |
| FFmpeg 自动下载 | `ffmpeg-downloader.cjs` — 检测OS + gyan.dev下载 + PowerShell解压 + 进度条 + 错误回退 |
| 极验验证码 | GeeTest SDK 动态加载 → 滑块弹窗 → 验证码 token 重试登录 → fallback QR 码 |
| ml 多 P 支持 | `resolvePagesForBvid()` — 全部 P 作为独立下载项加入，标题"标题 — P2 花絮" |
| 分页泛型化 | mlId/mlPage/mlTotalCount → paginationId/paginationPage/paginationTotalCount（ss/md 可复用） |

### 当前状态总结

```
✅ TS零错误  ✅ 55测试通过  ✅ Electron打包  ✅ CI/CD就绪
✅ 全链路完整：解析→下载→合并→登录→历史→打包
```

---

## 3. 第二轮工作详解

### 3.1 接入真实 B 站解析 API

#### 3.1.1 参考原 Java 代码

第二轮开始前，首先深入研究了原始 Java 代码的 API 调用架构（`D:\all app\BibiliDown\src\`）：

```
Java 架构（责任链模式）:
  InputParser (门面)
    ├── BVParser        → Regex: BV[A-Za-z0-9]+
    ├── AVParser        → Regex: av[0-9]+ → ConvertUtil.Av2Bv()
    ├── EPParser        → pgc/view/web/season?ep_id= → 找 bvid
    ├── SSParser        → pgc/view/web/season?season_id= → 全部剧集
    ├── MdParser        → pgc/review/user?media_id= → 转 ssId
    ├── B23Parser       → HEAD 跟随 b23.tv 重定向
    └── MLParser        → 收藏夹分页查询

核心 API 调用链（AbstractBaseParser.getAVDetail）:
  1. GET /x/player/pagelist?bvid=       → 获取分 P 列表
  2. GET /x/web-interface/view?bvid=    → 获取视频详情
  3. GET /x/player/playurl?cid=&bvid=&qn=&fnval=4048  → 获取可用清晰度

清晰度获取（getVideoQNList_TryNormalTypeFirst）:
  - 先试普通 API: /x/player/playurl → data.accept_quality[]
  - 失败则试 PGC:  /pgc/player/web/playurl → result.accept_quality[]
```

#### 3.1.2 TypeScript 实现

将上述 Java 逻辑重写为 `src/services/bilibili-api.ts`（~560 行）：

```
支持的输入格式:
  BV1xx411c7mD     → BV 号
  av170001         → av 号（调 view API 取 bvid）
  ep123456         → 番剧单集（season API 取 bvid → 复用 BV 解析）
  ss12345          → 番剧整季（season API → 遍历剧集列表）
  md134912         → media ID（review API 转 season_id → 复用 ss 解析）
  b23.tv/xxx       → 短链接（HEAD 跟随重定向 → 再识别）
  https://... 完整URL → 正则提取 ID → 按类型分发

API 端点（均通过 Vite 代理 /api/bilibili → api.bilibili.com）:
  - view 接口:   无需 WBI 签名，可直接获取标题/UP主/封面/播放量
  - pagelist:    获取分 P 列表（cid, page, part）
  - playurl:     获取可用清晰度数组 accept_quality[]
  - season:      ep_id 查询（稳定），season_id 直接查询（部分 -404）
```

#### 3.1.3 关键改造

**InputBar.tsx**（原 146 行 → 现 ~170 行）：
- `setTimeout(800ms)` 模拟 → `await parseBilibiliUrl(trimmed)`
- 新增加载 spinner 动画（解析按钮内）
- 新增错误信息卡片（红色边框 + Warning 图标 + API 错误消息）
- 链接去重：相同链接不重复解析
- 清空按钮同时清除解析结果
- 输入时自动清除错误状态

**App.tsx**（原 270 行 → 现 ~240 行）：
- `DEMO_VIDEO` 硬编码 → `parseStore.videos` 动态数据
- 四个解析状态：
  - `idle`: 空状态引导（虚线框 + "粘贴 B 站链接开始解析"）
  - `parsing`: Loading spinner（"正在解析链接..."）
  - `success`: 渲染 VideoCard 列表（支持多 P/多集）
  - `error`: 由 InputBar 内部展示（不重复）
- "加入下载队列" 按钮 → 真实调用 `downloadStore.addItem(item)`，保存 bvid/cid

**数据模型扩展**：
- `ParsedVideo` 新增 `bvid?: string` 和 `cid?: number`（用于下载链接解析）
- `DownloadItemData` 新增 `bvid?: string` 和 `cid?: number`

### 3.2 下载链接解析 + 下载引擎

#### 3.2.1 resolveDownloadUrl() 实现

参考原始 Java `AbstractBaseParser.getVideoLinkByFormat()`（~100 行 Java），在 `bilibili-api.ts` 中追加了 `resolveDownloadUrl()` 函数：

```
调用链:
  1. 判断视频类型（普通/PGC）: /x/web-interface/view?bvid=
  2. 普通视频: /x/player/playurl?bvid=&cid=&qn=&fnval=4048  (DASH)
  3. PGC 内容: /pgc/player/web/playurl?avid=&cid=&qn=&fnval=4048
  4. 解析返回:
     data.dash.video[] → 选匹配清晰度 + 最优编码 (AVC codecid=7 > HEVC 12)
     data.dash.audio[] → 优先 FLAC > 高质量 AAC
     data.dash.flac.audio → 无损音频（如有）
  5. 返回 { quality, videoUrl, audioUrl, format }

编码选择优先级（与 Java 版一致）:
  videoCodecPriority = [7 (AVC/H.264), 12 (HEVC/H.265), 13 (AV1)]
  audioQualityPriority = [flac, 30280 (320k), 30216 (64k)]
```

#### 3.2.2 DownloadManager 下载引擎

参考原始 Java 的 `DownloadRunnable` + `DownloadExecutors` + `M4SDownloader`，创建了 `src/services/download-manager.ts`（~270 行）：

```
架构:
  startDownloadManager()
    ├── pollTimer: 每秒轮询队列
    ├── subscribe: 监听 store 变化（新 queued / 恢复暂停）
    └── processQueue()
          ├── 统计活跃下载数，受 maxConcurrent 限制
          ├── 取队列头部 queued 项
          └── processDownload(item)
                ├── Step 1: resolveDownloadUrl(bvid, cid, qn)
                ├── Step 2: downloadWithProgress(videoUrl, onProgress)
                │     ├── fetch(url, { signal: AbortController })
                │     ├── ReadableStream.getReader() 逐块读取
                │     ├── 每 500ms 更新进度/速度/ETA
                │     └── 采集最近 20 个速度点 → speedHistory[]
                ├── Step 3: 浏览器模式 → Blob → URL.createObjectURL → <a>.click()
                └── 完成/失败 → downloadStore.updateItem()

并发控制:
  - userPrefsStore.maxConcurrent (1-8, 默认 3)
  - 达到上限时 queued 项等待
  - 一个完成后自动取下一个

生命周期:
  - App mount   → startDownloadManager()
  - App unmount → stopDownloadManager()
    ├── clearInterval(pollTimer)
    ├── unsubStore()
    └── 所有 AbortController.abort()
```

#### 3.2.3 端到端测试验证

使用真实 BV 号 `BV1GJ411x7h7` 通过 Vite 代理完成的测试：

```
≡ 1. Parse BV号              → Title: 【官方 MV】Never Gonna Give You Up
≡ 2. Get page list           → CID: 137649199
≡ 3. Playurl (1080P+, fnval=4048)
     → Quality: 64 (720P，1080P+ 需登录)
     → Video codecs: [HEVC, AVC, AV1]
     → Audio tracks: 3
≡ All steps passed
```

---

## 4. 代码结构

### 4.1 完整目录树

```
D:\all app\BibiliDown\
├── src/                          ← 原始 Java 源码（参考用，不要改动）
│   └── nicelee/bilibili/
│       ├── API.java              ← WBI 签名、指纹、点赞
│       ├── parsers/impl/         ← 各种 Parser（责任链）
│       │   ├── AbstractBaseParser.java   ← 核心 API 调用逻辑
│       │   ├── BVParser.java / AVParser.java
│       │   ├── EPParser.java / SSParser.java / MdParser.java
│       │   └── B23Parser.java / MLParser.java
│       ├── downloaders/impl/     ← 下载器
│       │   ├── M4SDownloader.java   ← DASH 音视频分离下载
│       │   ├── FLVDownloader.java   ← FLV 单文件下载
│       │   └── MP4Downloader.java
│       ├── enums/VideoQualityEnum.java  ← 清晰度代码表
│       ├── util/HttpHeaders.java       ← 所有 Header 模板
│       └── model/VideoInfo.java / ClipInfo.java
│
├── handover/                     ← 📍 交接文档
│   └── README.md                 ← 你正在读的文件
│
└── output/                       ← 🔑 新 Electron + React 前端工程
    │
    ├── 📄 文档 & 规范
    │   ├── ux-specification.md            UX 交互规格（9 章）
    │   └── visual-design-specification.md  视觉设计规范（11 章）
    │
    ├── ⚙ 配置文件
    │   ├── package.json             依赖 & 脚本
    │   ├── vite.config.ts           Vite + API 代理
    │   ├── tsconfig.json            TypeScript 配置
    │   ├── tailwind.config.js       Tailwind 主题
    │   └── index.html               HTML 入口
    │
    ├── 🖥 Electron 层
    │   └── electron/
    │       ├── main.cjs             主进程（窗口、IPC、菜单）
    │       └── preload.cjs          预加载（安全 API 暴露）
    │
    └── 🎨 React 源码层
        └── src/
            ├── main.tsx             React 挂载入口
            ├── App.tsx              根组件（路由、下载管理、队列种子）
            ├── index.css            全局样式（Tailwind + 工具类）
            ├── electron.d.ts        Electron API 类型
            │
            ├── services/            ← 🆕 API 服务层
            │   ├── bilibili-api.ts       B 站 API（解析 + 下载链接）
            │   ├── download-manager.ts   下载引擎
            │   ├── cookie-manager.ts     🆕 Cookie 解析/验证/持久化
            │   └── login-service.ts      🆕 登录服务（QR/密码/短信）
            │
            ├── styles/
            │   └── tokens.css        123 个 CSS 设计 Token
            │
            ├── stores/
            │   ├── downloadStore.ts   下载队列 + CRUD + 派生计数
            │   ├── parseStore.ts      📝 解析结果 + 状态机
            │   ├── userPrefsStore.ts  用户偏好（persist）
            │   └── navigationStore.ts 视图路由
            │
            ├── components/
            │   ├── TitleBar.tsx       标题栏（拖拽 + 窗口控制）
            │   ├── Sidebar.tsx        导航侧栏
            │   ├── InputBar.tsx       📝 链接输入 + 解析触发
            │   ├── VideoCard.tsx      视频卡片
            │   ├── QualityChip.tsx    清晰度芯片（6 状态）
            │   ├── DownloadPanel.tsx  下载面板（Acrylic）
            │   ├── DownloadItem.tsx   📝 队列项（发光进度条）
            │   ├── LoginPanel.tsx     登录侧滑面板
            │   └── StatusBar.tsx      📝 状态栏（修复 bug）
            │
            └── pages/
                ├── SettingsPage.tsx   设置页
                └── HistoryPage.tsx    历史页
```

📝 = 本轮修改的文件

### 4.2 每个文件的职责

#### API 服务层（本轮新增）

| 文件 | 行数 | 职责 |
|------|------|------|
| `services/bilibili-api.ts` | ~560 | B 站 API 完整封装。`identifyInput()` 识别 6 种输入格式；`parseBilibiliUrl()` 主入口分发到各解析器；`resolveDownloadUrl()` 获取 DASH 音视频流 URL（含编码优选）；内部工具函数（formatDuration/Count/Date/estimateSize） |
| `services/download-manager.ts` | ~270 | 下载队列消费引擎。`startDownloadManager()` 启动轮询 + store 监听；`processQueue()` 并发控制；`processDownload()` 三步流水线（解析链接→流式下载→完成）；`downloadWithProgress()` ReadableStream 逐块读取 + 进度回调；`stop/pause/cancel` 生命周期管理 |

#### Store 层（本轮扩展）

| 文件 | 行数 | 本轮变更 |
|------|------|---------|
| `stores/parseStore.ts` | ~70 | `ParsedVideo` 新增 `bvid?` 和 `cid?` 字段（下载需要） |
| `stores/downloadStore.ts` | ~105 | 无变更（接口已就绪） |
| `stores/userPrefsStore.ts` | ~55 | 无变更（`maxConcurrent` 被下载引擎读取） |
| `stores/navigationStore.ts` | ~15 | 无变更 |

#### 组件层（本轮修改）

| 文件 | 行数 | 本轮变更 |
|------|------|---------|
| `App.tsx` | ~240 | `DEMO_VIDEO` 移除 → 四态页面（idle/parsing/success/error）；`handleAddToQueue` 保存 bvid/cid；启动/停止 DownloadManager |
| `InputBar.tsx` | ~170 | `setTimeout` 模拟 → `parseBilibiliUrl()` 真实 API；新增错误卡片；链接去重；清空联动 |
| `DownloadItem.tsx` | ~325 | `DownloadItemData` 新增 `bvid?` `cid?` |
| `StatusBar.tsx` | ~65 | 修复预存 bug：`activeCount`/`totalCount` 未导入 |

### 4.3 组件依赖关系图

```
main.tsx
  └── App.tsx ── startDownloadManager()
        ├── TitleBar              (独立，window.electronAPI)
        ├── Sidebar               (独立，navigationStore)
        ├── [视图路由]
        │   ├── InputBar          → bilibili-api.ts → parseStore
        │   ├── VideoCard         ← QualityChip
        │   │     └── QualityChip
        │   ├── SettingsPage      (userPrefsStore)
        │   └── HistoryPage       (待接入)
        ├── DownloadPanel         ← DownloadItem × N  (downloadStore)
        │     └── DownloadItem    (发光进度条 + Sparkline)
        ├── LoginPanel            (覆盖层，待接入 API)
        └── StatusBar             (downloadStore)
        
        └── download-manager.ts   (后台运行)
              ├── downloadStore   (读 queued → 更新进度)
              ├── userPrefsStore  (读 maxConcurrent)
              └── bilibili-api.ts (resolveDownloadUrl)
```

---

## 5. 数据流架构

### 5.1 解析数据流

```
用户粘贴链接
  │
  ▼
InputBar.handleParse()
  │
  ├─ parseStore.setUrl(url)
  ├─ parseStore.setParsing()
  │
  ▼
parseBilibiliUrl(input)
  │
  ├─ identifyInput(s)
  │   ├─ BV? → parseBvVideo(bvid)
  │   │        ├─ GET /x/player/pagelist?bvid=
  │   │        ├─ GET /x/web-interface/view?bvid=
  │   │        └─ for each page:
  │   │             GET /x/player/playurl?cid=  → accept_quality[]
  │   │             → ParsedVideo { bvid, cid, title, coverUrl, qualities, ... }
  │   │
  │   ├─ av? → parseAvVideo(avId)
  │   │        └─ GET /x/web-interface/view?aid= → 取 bvid → parseBvVideo()
  │   │
  │   ├─ ep? → parseEpisode(epId)
  │   │        ├─ GET /pgc/view/web/season?ep_id=
  │   │        ├─ 从 episodes[] 中匹配 ep → 取 bvid
  │   │        └─ parseBvVideo() + 番剧标题覆盖
  │   │
  │   ├─ ss? → parseSeason(ssId)
  │   │        ├─ GET /pgc/view/web/season?season_id=
  │   │        └─ for each episode:
  │   │             >20集: 用默认 QN 列表 / ≤20集: fetchAvailableQNs()
  │   │             → ParsedVideo × N
  │   │
  │   ├─ md? → parseMedia(mdId)
  │   │        ├─ GET /pgc/review/user?media_id= → 取 season_id
  │   │        └─ parseSeason(ssId)
  │   │
  │   └─ b23.tv? → HEAD 跟随重定向 → identifyInput(location)
  │
  ├─ 成功: parseStore.setVideos(videos)   → status='success'
  └─ 失败: parseStore.setError(message)   → status='error'
  │
  ▼
App.tsx（响应 parseStore 变化）
  │
  ├─ status='idle'     → <EmptyParseState />    "粘贴 B 站链接开始解析"
  ├─ status='parsing'  → <ParsingState />       Spinner + "正在解析链接..."
  ├─ status='success'  → videos.map(video =>
  │                        <VideoCard {...video}
  │                          onAddToQueue={quality => handleAddToQueue(video, quality)}
  │                        />)
  └─ status='error'    → InputBar 内部展示错误卡片
```

### 5.2 下载数据流

```
用户点击 VideoCard "加入下载队列"
  │
  ▼
App.handleAddToQueue(video, quality)
  │
  ├─ 构造 DownloadItemData:
  │   { id: 'dl_xxx', title, quality, format: 'mp4',
  │     totalSize, status: 'queued',
  │     bvid: video.bvid, cid: video.cid }   ← 下载引擎需要
  │
  └─ downloadStore.addItem(item)
  │
  ▼
DownloadPanel 渲染新队列项（状态: queued，骨架屏 shimmer 动画）
  │
  ▼
DownloadManager.processQueue()  ← 每秒轮询 + store subscribe
  │
  ├─ 检查: activeCount < maxConcurrent?
  ├─ 取队列中第一个 status='queued' 项
  │
  └─ processDownload(item)
       │
       ├─ Step 1: 标记 downloading
       │   store.updateItem(id, { status:'downloading', speed:'解析链接中...' })
       │
       ├─ Step 2: 获取真实下载链接
       │   resolveDownloadUrl(bvid, cid, qn)
       │     ├─ /x/web-interface/view?bvid=    → 判断普通/PGC
       │     ├─ /x/player/playurl?...fnval=4048  → DASH data
       │     └─ 解析 dash.video[] + dash.audio[]
       │         → 选最佳编码 (AVC codecid=7)
       │         → 返回 { videoUrl, audioUrl, quality }
       │
       ├─ Step 3: 流式下载
       │   downloadWithProgress(videoUrl, onProgress)
       │     ├─ fetch(url, { headers: { Referer }, signal })
       │     ├─ ReadableStream.getReader()
       │     ├─ while (chunk = await reader.read()):
       │     │     chunks.push(chunk)
       │     │     loaded += chunk.length
       │     │     if (elapsed >= 500ms):
       │     │       speed = (loaded - lastLoaded) / elapsed
       │     │       progress = loaded / total * 100
       │     │       speedHistory.push(speed / 1e6)
       │     │       store.updateItem(id, { progress, speed, eta, speedHistory })
       │     └─ return new Blob(chunks)
       │
       ├─ Step 4: 浏览器保存
       │   URL.createObjectURL(blob) → <a>.click() → 触发浏览器下载
       │
       └─ Step 5: 完成/失败
           成功: store.updateItem(id, { status:'completed', progress:100 })
           失败: store.updateItem(id, { status:'failed', errorMessage })
           取消: AbortController.abort() → 状态已在 cancelItem 中设置
```

---

## 6. 遇到的问题和解决方案

### 问题 1：B 站 API CORS 和代理

| 项目 | 内容 |
|------|------|
| **现象** | 从浏览器直接 fetch `api.bilibili.com` 会因 CORS 拦截而失败 |
| **原因** | B 站 API 服务器的 `Access-Control-Allow-Origin` 未包含 `localhost:5173` |
| **解决** | 在 `vite.config.ts` 配置开发代理：`/api/bilibili` → `https://api.bilibili.com`。`changeOrigin: true` 重写 Host 头，`proxyReq` 事件注入 `Referer`/`Origin`/`User-Agent`。所有 API 调用使用相对路径 `/api/bilibili/...` |
| **当前状态** | ✅ 已解决。开发模式走 Vite 代理。生产 Electron 模式无需代理（可配置 `webSecurity` 或使用 IPC fetch） |

### 问题 2：playurl / season API 返回 -404

| 项目 | 内容 |
|------|------|
| **现象** | `playurl?cid=错误的cid` 返回 code=-404；`season?season_id=某些ID` 返回 -404 "啥都木有" |
| **原因** | ① 用了错误的 cid（来自另一个视频）；② 部分 season_id 在 B 站已下架或需要特定 Cookie |
| **解决** | ① 从 `pagelist` API 中获取正确的 cid；② `ep_id` 查询比 `season_id` 更稳定（ep_id=37477 正常返回 264 集），ep 解析走 "ep_id → 找 bvid → 复用 BV 解析" 路径；③ season 大列表（>20集）跳过逐个清晰度查询，直接用默认 QN 列表 |
| **当前状态** | ✅ 核心场景已验证通过。部分旧番 season_id 不可用是 B 站 API 行为，与原 Java 版一致 |

### 问题 3：ParsedVideo 缺少 bvid/cid 导致下载链路断裂

| 项目 | 内容 |
|------|------|
| **现象** | DownloadManager 无法获取下载链接，报错"缺少视频标识（bvid/cid）" |
| **原因** | `ParsedVideo` 接口只有 `id`（如 `BV1xx_p1`），没有 bvid 和 cid 字段。`handleAddToQueue` 创建 `DownloadItemData` 时无法传递下载必需的 bvid/cid |
| **解决** | ① `ParsedVideo` 新增 `bvid?: string` 和 `cid?: number`；② `parseBvVideo()` 中填充 bvid/cid（`results.push({ ... bvid, cid ... })`）；③ `DownloadItemData` 也新增 `bvid?` `cid?`；④ `handleAddToQueue` 传递 `bvid: video.bvid, cid: video.cid` |
| **当前状态** | ✅ 全链路 bvid/cid 贯通 |

### 问题 4：StatusBar 预存 bug

| 项目 | 内容 |
|------|------|
| **现象** | `tsc --noEmit` 报错：`StatusBar.tsx(41,21): error TS2304: Cannot find name 'activeCount'` |
| **原因** | 第一轮遗留：StatusBar 直接调用 `activeCount()` 但未从 `useDownloadStore` 导入 |
| **解决** | 添加 `const activeCount = useDownloadStore((s) => s.activeCount)` 和 `const totalCount = useDownloadStore((s) => s.items.length)` |
| **当前状态** | ✅ 已修复。TS 零错误 |

### 问题 5：TypeScript Blob 构造函数类型不兼容

| 项目 | 内容 |
|------|------|
| **现象** | `new Blob(chunks)` 报错：`Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'` |
| **原因** | TypeScript 5.x 引入了 `ArrayBufferLike` 联合类型（含 `SharedArrayBuffer`），与 `BlobPart` 期望的 `ArrayBufferView<ArrayBuffer>` 不兼容 |
| **解决** | 添加类型断言 `new Blob(chunks as BlobPart[])` |
| **当前状态** | ✅ 已解决 |

### 问题 6：下载管理器 subscribe 内存泄漏

| 项目 | 内容 |
|------|------|
| **现象** | React StrictMode 下 App 组件 unmount 后 download-manager 的 store subscribe 仍在运行 |
| **原因** | `startDownloadManager` 中 `useDownloadStore.subscribe()` 的返回值没有被保存，`stopDownloadManager` 无法取消订阅 |
| **解决** | 添加 `unsubStore` 变量保存订阅清理函数；`stopDownloadManager` 中调用 `unsubStore()` |
| **当前状态** | ✅ 已修复 |

---

## 7. 后续待做工作（全部完成 ✅）

> **综合交接文档 §六 的 9 项待办 + 5 项改进已全部在第七轮完成。**
> 详见 `handover/综合交接文档.md` 和 `handover/第七轮交接文档.md`。

### 剩余可选事项

| 优先级 | 任务 | 说明 |
|--------|------|------|
| 🔴 | **推送到 GitHub** | `git remote add origin <url>` → `git push` → 打 tag `v7.1.0` 触发 CI/CD |
| 🔴 | **真机测试** | ① 极验滑块在真实 B站登录中的表现 ② FFmpeg 自动下载在干净系统的表现 ③ 多 P 收藏夹视频下载验证 |
| 🟡 | **macOS/Linux 测试** | 当前仅在 Windows 测试过；macOS dmg 和 Linux AppImage 需实际验证 |
| 🟢 | **亮色主题截图验收** | 截图对比亮/暗两种模式，确认视觉无问题 |
| 🟢 | **项目 README 更新** | 可考虑在 `output/` 下创建面向用户的 README.md

---

## 8. 快速参考

### 启动命令

```bash
cd "D:\all app\BibiliDown\output"

# 纯 Web 开发（浏览器预览）
npm run dev
# → http://localhost:5173

# Electron 桌面应用开发
npm run dev:electron
# → 自动启动 Vite + Electron 窗口

# TypeScript 类型检查
npx tsc --noEmit

# 生产构建
npm run build
```

### 测试用 BV 号

| BV 号 | 类型 | 特点 |
|-------|------|------|
| `BV1GJ411x7h7` | 单 P 视频 | Rick Astley MV，稳定可用 |
| `BV1xx411c7mD` | 单 P 视频 | 经典测试视频 |
| `ep37477` | 番剧 | 蓝猫淘气 3000 问，264 集（测试大批量） |
| `ep700000` | 番剧 | 和之美，17 集（测试中等批量） |
| `https://b23.tv/BV1GJ411x7h7` | 短链接 | 测试 b23.tv 重定向 |

### 关键 API 端点速查

| API | 用途 | 需要 WBI? |
|-----|------|-----------|
| `GET /x/web-interface/view?bvid=` | 视频详情（标题/UP主/封面） | ❌ |
| `GET /x/player/pagelist?bvid=` | 分P列表（cid/page/part） | ❌ |
| `GET /x/player/playurl?bvid=&cid=&qn=&fnval=4048` | 清晰度列表 + DASH 流 URL | ❌ |
| `GET /pgc/view/web/season?ep_id=` | 番剧信息（ep 查询） | ❌ |
| `GET /pgc/view/web/season?season_id=` | 番剧信息（ss 查询） | ❌ |
| `GET /pgc/review/user?media_id=` | media→season_id 转换 | ❌ |
| `GET /x/web-interface/wbi/view?bvid=` | 视频详情（完整版） | ✅ |
| `GET /x/web-interface/nav` | Cookie 验证 + 用户信息 | ❌ |
| `POST /x/passport-login/web/cookie/refresh` | Cookie 自动刷新 | ❌（需 csrf） |
| `GET /medialist/gateway/base/detail` | 收藏夹/合集视频列表 | ❌（需 Cookie） |

### 测试用 ID

| ID | 类型 | 测试场景 |
|----|------|---------|
| `BV1GJ411x7h7` | BV | 基本（Rick Astley，最稳定） |
| `ep37477` | ep | 剧集批量（264集） |
| `ml` + 登录 | ml | 收藏夹分页 + 多P（需要 Cookie） |
| `ss` + bangumi | ss | 番剧整季 |
| `https://b23.tv/BV1GJ411x7h7` | 短链接 | 测试 b23.tv 重定向 |

### 文件快速索引

| 想了解什么 | 去哪看 |
|------|------|
| 为什么选这些颜色和字体 | `output/ux-specification.md` + `visual-design-specification.md` |
| 所有 CSS 变量列表 | `output/src/styles/tokens.css` |
| 布局怎么搭的 | `output/src/App.tsx` |
| 数据存在哪、怎么流 | 本文档 §5 |
| B 站 API 怎么调的 | `output/src/services/bilibili-api.ts` |
| 下载引擎怎么工作的 | `output/src/services/download-manager.ts` |
| Cookie 怎么管理的 | `output/src/services/cookie-manager.ts` |
| 登录流程怎么实现的 | `output/src/services/login-service.ts` |
| 极验验证码怎么接入 | `output/src/components/LoginPanel.tsx`（GeeTest 动态加载） |
| FFmpeg 自动下载 | `output/electron/ffmpeg-downloader.cjs` |
| Cookie 自动刷新 | `output/src/services/cookie-manager.ts` refreshCookie() |
| 历史记录怎么存储 | `output/src/stores/historyStore.ts`（Zustand persist，上限500条） |
| 多P 怎么处理 | `output/src/services/bilibili-api.ts` resolvePagesForBvid() |
| Electron IPC 有哪些 | `output/electron/main.cjs` + `preload.cjs` |
| 应用图标怎么生成 | `output/scripts/gen-icons.cjs` + `build/icon.svg` |
| CI/CD 怎么配置 | `output/.github/workflows/build.yml` |
| 打包怎么配置 | `output/package.json` build 字段 |
| 测试写了什么 | `output/src/__tests__/` 55 passed / 3 skipped |
| 原 Java 代码的 API 逻辑 | `src/nicelee/bilibili/parsers/impl/AbstractBaseParser.java` |

---

> **给接手的开发者**：
>
> 项目已从原始 Java Swing 完全重写为 Electron + React + TypeScript + Tailwind CSS。
> 经过 7 轮迭代，实现了全链路功能：解析→下载→合并→登录→历史→打包→CI/CD。
> TS 零错误、55 单元测试通过、Electron 打包可用。
>
> **最快上手**：读 §1→§2（了解进度）→ §7（剩余可选事项）选择一项继续。
