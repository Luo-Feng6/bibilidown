# BibiliDown 架构

> 从 Java Swing 到 Electron + React + TypeScript 的完全重写

## 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                        BibiliDown                            │
│                                                              │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │     浏览器版          │    │       桌面版 (Electron)      │ │
│  │  localhost:5173      │    │       Electron 窗口          │ │
│  │                      │    │                              │ │
│  │  Vite Dev Server     │    │  ┌────────┐  ┌───────────┐ │ │
│  │  ┌──────────────┐   │    │  │  Main   │  │  Preload  │ │ │
│  │  │  React App   │   │    │  │ Process │  │  Script   │ │ │
│  │  │  (Renderer)  │   │    │  └───┬────┘  └─────┬─────┘ │ │
│  │  └──────┬───────┘   │    │      │ IPC          │       │ │
│  │         │            │    │  ┌───┴──────────────┴───┐  │ │
│  │  ┌──────┴───────┐   │    │  │    React App         │  │ │
│  │  │  API Proxy   │   │    │  │    (Renderer)        │  │ │
│  │  │  /api/bilibili│   │    │  └─────────────────────┘  │ │
│  │  └──────────────┘   │    │                              │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   外部服务                              │   │
│  │  api.bilibili.com    passport.bilibili.com             │   │
│  │  FFmpeg (本地)       系统文件系统                        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 目录结构

```
src/
├── main.tsx                    # React 挂载入口
├── App.tsx                     # 根组件（路由 / 下载管理 / 预设切换 / 空状态）
├── index.css                   # 全局样式 + Tailwind + .copy-btn
│
├── services/                   # 服务层（6 个）
│   ├── bilibili-api.ts         # B 站 API 封装（解析 / URL 识别 / playurl）
│   ├── download-manager.ts     # 下载引擎（队列消费 / 并发 / 流式下载）
│   ├── login-service.ts        # QR / 密码 / 短信登录
│   ├── cookie-manager.ts       # Cookie 解析 / 验证 / 刷新
│   ├── wbi-sign.ts             # WBI 签名（img_key + sub_key → MD5）
│   ├── md5.ts                  # MD5（spark-md5 封装）
│   └── dialog-service.ts       # 原生对话框（确认 / 警告）
│
├── stores/                     # Zustand 状态管理（8 个）
│   ├── downloadStore.ts        # 下载队列 + CRUD + 智能重排队
│   ├── parseStore.ts           # 解析结果 + 分页状态
│   ├── userPrefsStore.ts       # 用户偏好（persist）：主题 / Cookie / 路径
│   ├── presetStore.ts          # 下载方案 CRUD（persist）
│   ├── historyStore.ts         # 下载历史（persist，上限 500）
│   ├── ffmpegStore.ts          # FFmpeg 状态
│   ├── toastStore.ts           # Toast 通知队列
│   └── navigationStore.ts      # 视图路由（download / settings / history / about）
│
├── components/                 # UI 组件（12 个）
│   ├── TitleBar.tsx            # 窗口标题栏（Electron 拖拽 + 窗口控制）
│   ├── Sidebar.tsx             # 导航侧栏（56px 图标栏）
│   ├── InputBar.tsx            # 链接输入 + 剪贴板检测 + 解析触发
│   ├── VideoCard.tsx           # 视频卡片（封面 / 清晰度 / 复制按钮）
│   ├── QualityChip.tsx         # 清晰度选择器
│   ├── EpisodeList.tsx         # 剧集批量列表（>3 集自动切换）
│   ├── DownloadPanel.tsx       # 下载面板（可拖拽宽度）
│   ├── DownloadItem.tsx        # 下载项（进度条 / 速度 / 复制）
│   ├── LoginPanel.tsx          # 登录侧滑面板（3 Tab）
│   ├── StatusBar.tsx           # 底部状态栏（连接 / 队列 / 账号）
│   ├── Toast.tsx               # Toast 通知
│   ├── FfmpegBanner.tsx        # FFmpeg 检测横幅
│   ├── ConfirmDialog.tsx       # 确认对话框
│   └── ErrorBoundary.tsx       # 错误边界
│
├── pages/                      # 页面组件（3 个）
│   ├── SettingsPage.tsx        # 设置（预设 / 主题 / 文件名模板 / 路径）
│   ├── HistoryPage.tsx         # 历史记录（搜索 / 日期筛选 / 复制 / 导入导出）
│   └── AboutPage.tsx           # 关于（版本 / 更新日志 / 双端对比）
│
└── utils/                      # 工具函数（2 个）
    ├── clipboard.ts            # copyText() — 剪贴板写入 + toast 反馈
    └── env.ts                  # isElectron() — 运行环境检测
```

## 数据流

### 解析链路

```
用户粘贴链接
  │
  ▼
InputBar → parseBilibiliUrl()
  │
  ├─ identifyInput()    识别格式（BV/av/ep/ss/md/ml/b23.tv）
  ├─ parseBvVideo()     获取 pagelist + view → 清晰度列表
  ├─ parseEpisode()     ep→season→bvid → 复用 BV 解析
  ├─ parseSeason()      遍历剧集 → 逐个创建 ParsedVideo
  ├─ parseMediaList()   收藏夹分页（首次 20 条 + 加载更多）
  └─ parseShortLink()   HEAD 跟随 b23.tv 重定向
  │
  ▼
parseStore.setVideos()  →  App 渲染 VideoCard / EpisodeList
```

### 下载链路

```
用户点击"下载"
  │
  ▼
App.handleAddToQueue()  →  downloadStore.addItem()
  │
  ▼
DownloadManager 轮询队列
  │
  ├─ resolveDownloadUrl(bvid, cid, qn)
  │     ├─ /x/web-interface/view      判断视频类型
  │     ├─ /x/player/playurl?fnval=4048  获取 DASH 流
  │     └─ 编码优选: AVC(codecid=7) > HEVC(12) > AV1(13)
  │
  ├─ 浏览器模式:
  │     fetch → ReadableStream → Blob → <a>.click()
  │
  └─ Electron 模式:
        IPC → Main Process http 下载 → 临时文件 → FFmpeg 合并 → 最终路径
```

### Store 依赖关系

```
App.tsx
  ├── useParseStore        ← InputBar 写入 → VideoCard 读取
  ├── useDownloadStore     ← App 写入 → DownloadPanel 读取 → DownloadManager 轮询
  ├── useUserPrefsStore    ← SettingsPage 读写 → 全局主题/Cookie
  ├── usePresetStore       ← SettingsPage 读写 → PresetQuickSwitch 读取
  ├── useHistoryStore      ← DownloadManager 写入 → HistoryPage 读取
  ├── useFfmpegStore       ← FfmpegBanner 读取
  ├── useToastStore        ← 全局 toast 通知
  └── useNavigationStore   ← Sidebar 读写 → App 路由
```

## 组件树

```
<App>
  ├── <TitleBar />                    # Electron 窗口拖拽区
  ├── <div className="flex">
  │     ├── <Sidebar />               # 导航栏
  │     │     ├── 下载主页
  │     │     ├── 设置
  │     │     ├── 历史记录
  │     │     └── 关于
  │     │
  │     └── <main>                    # 视图区
  │           ├── [download view]
  │           │     ├── <FfmpegBanner />
  │           │     ├── <InputBar />
  │           │     ├── <LoginHint />
  │           │     ├── <PresetQuickSwitch />
  │           │     ├── <EmptyParseState /> / <ParsingState />
  │           │     ├── <EpisodeList />        (>3 集)
  │           │     └── <VideoCard /> × N       (≤3 集)
  │           │           └── <QualityChip />
  │           │
  │           ├── [settings view]
  │           │     └── <SettingsPage />
  │           │           ├── PresetSection
  │           │           └── FilenameTemplateInput
  │           │
  │           ├── [history view]
  │           │     └── <HistoryPage />
  │           │
  │           └── [about view]
  │                 └── <AboutPage />
  │                       └── <PlatformComparison />
  │
  ├── <DownloadPanel />               # 右侧面板（仅在下载页）
  │     └── <DownloadItem /> × N
  │
  ├── <StatusBar />                   # 底部状态栏
  │     └── <LoggedInUser />          # 退出/更换账号菜单
  │
  ├── <LoginPanel />                  # 侧滑登录面板
  ├── <ToastContainer />              # Toast 通知层
  └── <ConfirmDialog />               # 确认对话框层
```

## 关键设计决策

| 决策 | 选择 | 原因 |
|------|------|------|
| 路由方案 | Zustand 状态切换 | 桌面应用不需要 URL 路由 |
| API 架构 | TypeScript 直调 B 站 API | 不依赖 Java 后端 |
| Vite 代理 | `/api/bilibili` → `api.bilibili.com` | 绕过浏览器 CORS |
| 下载模式 | 浏览器 Blob / Electron IPC | 双端自适应 |
| 预设系统 | Zustand persist | 启动自动恢复上次方案 |
| 复制功能 | `navigator.clipboard` + execCommand fallback | 兼容 HTTP/HTTPS/Electron |
| `isElectron()` | 统一 `src/utils/env.ts` | 避免 4 处重复定义（已去重） |

## Electron 主进程

```
electron/
├── main.cjs                  # BrowserWindow / IPC handlers / 托盘菜单
├── preload.cjs               # contextBridge 暴露 electronAPI
├── ffmpeg-downloader.cjs     # FFmpeg 自动下载（OS 检测 → 下载 → 解压）
├── gen-tray-icon.cjs         # 托盘图标生成（16x16）
└── tray-icon.png             # 16x16 托盘图标
```

### IPC 通道

```
Renderer → Main:
  download:saveToDisk     { url, filePath, headers }  → http 流式下载
  download:pause          暂停当前下载
  download:cancel         取消下载
  ffmpeg:merge            { inputVideo, inputAudio, output } → spawn ffmpeg
  ffmpeg:check            检测 FFmpeg 可用性
  file:move               { from, to }
  window:minimize/maximize/close

Main → Renderer:
  download:progress       { id, progress, speed, eta }
  window:maximized-changed  { isMaximized }
```
