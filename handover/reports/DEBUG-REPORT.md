# BilibiliDown 调试报告 — 2026-07-21

> **给新对话的摘要：** 这是一个 B 站视频下载器（Electron + React + TypeScript + Tailwind），
> 从 Java Swing 重写而来。目前浏览器开发模式遇到 zustand v5 `persist` 中间件导致
> 无限重渲染循环，临时移除了 persist 待修复。请继续排查和修复。

---

## 1. 项目概述

| 项目 | 详情 |
|------|------|
| 名称 | BilibiliDown |
| 用途 | B 站视频下载器 |
| 技术栈 | Electron 43 + React 18.3 + TypeScript 5.5 + Vite 5.4 + Tailwind 3.4 + Zustand 5.0 |
| 路径 | `D:\all app\BibiliDown` |
| 版本 | v7.0.0 |
| 历史 | 从 Java Swing (legacy-java/) 完全重写 |

## 2. 已完成的配置

### 2.1 Electron 安装
- Electron v43.1.1 二进制已手动下载并解压到 `D:\all app\electron-cache\`
- 已复制到 `node_modules/electron/dist/` + 创建 `path.txt`
- 验证：`electron.exe --version` → `v43.1.1` ✅

### 2.2 桌面快捷方式
- `C:\Users\huang\Desktop\BilibiliDown-浏览器版.bat` — 启动 Vite → 打开浏览器 localhost:5173
- `C:\Users\huang\Desktop\BilibiliDown-Electron桌面版.bat` — 启动 Electron 桌面窗口
- 两个不能同时开（共用端口 5173），每个 bat 启动前会自动杀旧进程

### 2.3 验证结果
| 步骤 | 状态 |
|------|------|
| `npx tsc --noEmit` | ✅ 零错误 |
| `npm run test` | ✅ 55 passed, 3 skipped |
| `npm run dev` (Vite) | ✅ 启动正常，localhost:5173 |
| Electron 二进制 | ✅ v43.1.1 可用 |

## 3. 遇到的问题与解决

### 问题 1: Electron 二进制下载失败
- **原因：** npm 安装 electron 包时，二进制从 GitHub 下载失败（国内网络）
- **解决：** 用户手动从 GitHub Releases 下载 `electron-v43.1.1-win32-x64.zip`，
  解压后复制到 `node_modules/electron/dist/`，手动创建 `path.txt`

### 问题 2: 桌面 bat 文件编码错误
- **表现：** 双击 bat 文件报 `'c' 不是内部或外部命令`、中文乱码
- **原因：** Write 工具保存的 UTF-8 文件，Windows CMD 默认用 GBK 解析
- **解决：** 改为纯英文内容，去掉 `chcp 65001`

### 问题 3: bat 文件启动顺序错误
- **表现：** 浏览器打开后白屏 / 拒绝连接
- **原因：** `start http://...` 写在 `npm run dev` 之前，浏览器在 Vite 启动前就打开了
- **解决：** 先启动 Vite（后台窗口），`timeout /t 4` 等待，再打开浏览器

### 问题 4: React `removeChild` DOM 错误
- **表现：** 浏览器白屏，控制台报 `NotFoundError: Failed to execute 'removeChild'`
- **原因：** `React.StrictMode` + 我加的 `window.onerror` 诊断代码（修改了 `#root.innerHTML`）
  干扰了 React 的 DOM 管理
- **解决：** 移除 StrictMode，恢复 index.html 原始内容

### 问题 5: ⚠️ zustand v5 persist 无限重渲染循环（当前未完全解决）
- **表现：** `Maximum update depth exceeded` → `forceStoreRerender` → `commitHookEffectListMount`
- **定位过程：**
  1. 加了 ErrorBoundary 捕获到确切的堆栈
  2. 逐步简化 App.tsx 排除法
  3. 最终确认：移除 zustand `persist` 中间件后界面能正常渲染
- **临时修复：** 已注释掉 `userPrefsStore.ts` 和 `historyStore.ts` 中的 `persist` 导入和包装
  - 副作用：用户偏好和历史记录不会持久化到 localStorage
- **根因分析：** zustand v5.0.14 的 `persist` 中间件内部 `useEffect` 在 hydration 时
  触发 `set()` 更新 store → `useSyncExternalStore` 通知订阅者 → 重渲染 → 再次触发
  hydration → 无限循环
- **待修复方向：**
  1. 检查 zustand v5 persist 是否需要显式传递 `storage` 选项
  2. 尝试升级/降级 zustand 版本
  3. 使用 `skipHydration: true` + 手动 hydration
  4. 将 `useUserPrefsStore()` 无选择器调用（LoginPanel、SettingsPage 中有）改为带选择器

## 4. 代码结构速查

```
D:\all app\BibiliDown\
├── index.html              # 入口 HTML
├── src/
│   ├── main.tsx            # React 入口（当前含 ErrorBoundary）
│   ├── App.tsx             # 主组件（完整功能，useEffect 被注释）
│   ├── index.css           # 全局样式 + Tailwind
│   ├── styles/tokens.css   # 设计令牌（CSS 变量）
│   ├── components/
│   │   ├── TitleBar.tsx    # 自定义标题栏
│   │   ├── Sidebar.tsx     # 侧边导航
│   │   ├── InputBar.tsx    # B 站链接输入框
│   │   ├── VideoCard.tsx   # 视频卡片
│   │   ├── DownloadPanel.tsx
│   │   ├── DownloadItem.tsx
│   │   ├── LoginPanel.tsx  # ⚠ 无选择器订阅 entire userPrefsStore
│   │   ├── StatusBar.tsx   # 底部状态栏
│   │   ├── Toast.tsx       # Toast 通知
│   │   ├── EpisodeList.tsx
│   │   ├── QualityChip.tsx
│   │   └── FfmpegBanner.tsx
│   ├── stores/
│   │   ├── userPrefsStore.ts  # ⚠ 原使用 persist（已临时注释）
│   │   ├── historyStore.ts    # ⚠ 原使用 persist（已临时注释）
│   │   ├── downloadStore.ts   # ✅ 无问题
│   │   ├── parseStore.ts      # ✅ 无问题
│   │   ├── navigationStore.ts # ✅ 无问题
│   │   ├── toastStore.ts      # ✅ 无问题
│   │   └── ffmpegStore.ts     # ✅ 无问题
│   ├── services/
│   │   ├── bilibili-api.ts    # B 站 API 封装
│   │   ├── download-manager.ts # 下载引擎
│   │   ├── login-service.ts   # 登录服务（QR/密码/短信）
│   │   ├── cookie-manager.ts  # Cookie 管理
│   │   ├── wbi-sign.ts        # WBI 签名
│   │   └── md5.ts             # MD5 封装
│   └── pages/
│       ├── SettingsPage.tsx    # ⚠ 无选择器订阅 entire userPrefsStore
│       └── HistoryPage.tsx     # ⚠ 使用 useHistoryStore（persist）
├── electron/
│   ├── main.cjs            # Electron 主进程
│   ├── preload.cjs         # 预加载脚本（contextBridge）
│   └── ffmpeg-downloader.cjs
├── vite.config.ts          # Vite 配置（代理 /api/bilibili）
├── tailwind.config.js      # Tailwind 配置（自定义 spacing/tokens）
├── package.json            # 脚本与依赖
└── handover/               # 交接文档
    ├── MASTER.md           # 完整架构文档
    └── DEBUG-REPORT.md     # 本文档
```

## 5. 当前状态

### 可用的
- ✅ TypeScript 编译零错误
- ✅ 55 个测试全部通过
- ✅ Vite 开发服务器正常
- ✅ Electron 二进制正常
- ✅ 浏览器模式界面渲染（移除 persist 后）

### 被注释/修改的文件
| 文件 | 改动 | 原因 |
|------|------|------|
| `src/stores/userPrefsStore.ts` | 注释 `persist` 导入和包装 | 隔离无限循环 |
| `src/stores/historyStore.ts` | 注释 `persist` 导入和包装 | 隔离无限循环 |
| `src/main.tsx` | 添加 ErrorBoundary，移除 StrictMode | 错误诊断 |
| `src/App.tsx` | 注释 initCookie/startDownloadManager/checkFfmpeg 三个 useEffect | 排查（非根因）|

### 恢复步骤
```bash
git checkout -- src/stores/userPrefsStore.ts
git checkout -- src/stores/historyStore.ts
git checkout -- src/main.tsx
git checkout -- src/App.tsx
git checkout -- index.html
```

## 6. 后续待办

### 优先级 1: 修复 zustand persist
- [ ] 排查 zustand v5.0.14 persist 无限循环根因
- [ ] 尝试降级 zustand 到 v4.x 或升级到最新 v5
- [ ] 或使用 `skipHydration` + 手动水合
- [ ] 修复 LoginPanel/SettingsPage 的无选择器订阅

### 优先级 2: 功能验证
- [ ] 浏览器模式：粘贴 BV1GJ411x7h7 测试解析
- [ ] Electron 桌面模式：确认窗口能打开
- [ ] 亮/暗主题切换
- [ ] 下载功能（需 B 站 Cookie 登录）

### 优先级 3: 打包
- [ ] `npm run build:electron` 打包 Windows 安装包
- [ ] FFmpeg 自动下载集成测试

---

## 附录

### 关键路径
| 用途 | 路径 |
|------|------|
| 项目根目录 | `D:\all app\BibiliDown` |
| Electron 缓存 | `D:\all app\electron-cache\` |
| 用户桌面 | `C:\Users\huang\Desktop\` |
| 开发工具库 | `C:\Users\huang\Desktop\开发工具库\` |

### 运行命令
```bash
cd "D:\all app\BibiliDown"
npm run dev           # 浏览器开发模式
npm run dev:electron  # Electron 桌面模式
npm run test          # 运行测试
npx tsc --noEmit      # TypeScript 检查
```
