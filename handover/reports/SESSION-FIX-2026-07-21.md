# BilibiliDown — 2026-07-21 修复会话交接

> **一句话**：修复了白屏（zustand v5 无限循环）、封面展示、二维码登录、文字选择等多个 Bug，并做了防御性加固。

---

## 一、会话概述

| 项目 | 说明 |
|------|------|
| 日期 | 2026-07-21 |
| 起点 | 浏览器 `npm run dev` → 白屏（Maximum update depth exceeded） |
| 终点 | **第二轮修复完成**：QR登录 HttpOnly、标题null检查、暗色主题11处修复、下载速度4处修复、历史记录增强 |
| 修改文件 | 21 个（详见第三章） |
| 编译 | `tsc --noEmit` 零错误 |
| 测试 | 55 passed, 3 skipped |

---

## 二、遇到的 Bug 与修复

### Bug 1 🔴 白屏 / 无限重渲染循环（核心）

**表现**：
- 浏览器打开 `localhost:5173` → 白屏
- Console 报 `Maximum update depth exceeded`
- 堆栈: `forceStoreRerender` → `commitHookEffectListMount`
- Warning: `The result of getSnapshot should be cached`

**根因**：
`App.tsx` 第 45 行，用了内联 selector 返回新对象：

```tsx
// ❌ 每次渲染创建新对象 → Object.is 检测变化 → 重渲染 → 死循环
useDownloadStore((s) => ({
  addItem: s.addItem,
  pauseItem: s.pauseItem,
  ...
}))
```

zustand v5 内部用 `React.useSyncExternalStore` + `Object.is` 做变化检测。`(s) => ({...})` 每次调用返回全新对象引用，`Object.is` 永远判定"变了"→ 触发 setState → 重渲染 → 又创建新对象 → 无限循环。

之前的分析误判为 `persist` 中间件的问题，实际上 persist 只是触发器（它触发了第一次状态更新，暴露了 selector 问题）。

**修复**：
1. 把内联对象 selector 拆成独立字段 selector（每个返回稳定引用）：
```tsx
// ✅ 每个 selector 返回稳定的函数引用/原语值
const addItem = useDownloadStore((s) => s.addItem)
const pauseItem = useDownloadStore((s) => s.pauseItem)
// ...
```
2. 同理修复 `useParseStore()` 无选择器订阅 → 拆成独立字段
3. `LoginPanel`、`SettingsPage`、`HistoryPage` 用 `useShallow` 替代无选择器订阅

**涉及文件**：`App.tsx`、`SettingsPage.tsx`、`LoginPanel.tsx`、`HistoryPage.tsx`

---

### Bug 2 🔴 视频封面：纯黑 / 无加载提示 / 无失败兜底

**表现**：
- 解析成功后，封面区域全黑
- 加载过程中无 spinner、无提示
- 图片地址失效时无替换占位图

**根因**：
只有两种状态的分支：`coverUrl ? <img> : 占位图`。缺少"加载中"和"加载失败"的状态管理。

**修复**：
引入三级状态管理：`imgLoading` / `imgError`：
```
coverUrl 存在 → 渲染 <img>（始终可见，不设 display:none）
    ├── 加载中 → spinner "封面加载中…"
    ├── 成功   → 显示图片
    └── 失败   → ImageSquare 图标 + "封面加载失败"

coverUrl 为空 → ImageSquare 图标 + "暂无封面"
```
- 添加 `referrerPolicy="no-referrer"` 防止 B 站 CDN 防盗链
- **注意**：`<img style="display:none">` 会导致浏览器完全不加载图片，`onLoad`/`onError` 永不触发（Bug 6 的根因）

**涉及文件**：`VideoCard.tsx`

---

### Bug 3 🔴 二维码一直显示"已过期"

**表现**：
打开登录面板 → 二维码区域立即显示"已过期"

**根因**：
1. **API 域名错误**：B 站登录 API 在 `passport.bilibili.com`，但 Vite 代理只配了 `api.bilibili.com`
2. **source 参数过时**：`source=main-web` → 应改为 `source=main-fe`

**修复**：
1. `vite.config.ts`：新增 `/api/passport` 代理 → `https://passport.bilibili.com`
2. `login-service.ts`：所有 passport 接口改用 `PASSPORT_BASE` + `source=main-fe`
3. `cookie-manager.ts`：cookie refresh 接口也改用 `PASSPORT_BASE`

**涉及文件**：`vite.config.ts`、`login-service.ts`、`cookie-manager.ts`

---

### Bug 4 🟡 扫码成功但无反应（轮询静默失败）

**表现**：
二维码能显示，手机扫码后页面无任何反应（不显示"已扫码"，不跳转"登录成功"）

**根因**：
轮询 catch 块是空的：`catch { /* Poll error, keep trying */ }`
如果 API 返回格式变化或网络错误，错误被静默吞掉，用户永远看不到反馈。

**修复**：
1. `catch { ... }` → `catch (err) { console.error('QR poll error:', err) }`
2. `pollQrStatus` 新增 `console.log` 记录每次轮询的响应码（便于浏览器 Console 诊断）
3. 添加 `default` 分支处理未知状态码

**待验证**：用户扫码后在 Console 中查看 `[QR poll]` 日志，确认真实 API 响应码

**涉及文件**：`login-service.ts`、`LoginPanel.tsx`

---

### Bug 5 🟡 页面文字不可选择/复制

**表现**：
浏览器中无法选中文字、无法复制

**根因**：
`index.css` 全局 `body { user-select: none }`（为 Electron 标题栏拖拽行为设置的），同时影响了浏览器版。

**修复**：
- 删除全局 `user-select: none`
- TitleBar 已有 `select-none` (Tailwind)，Electron 拖拽不受影响
- `input, textarea { user-select: text }` 保留

**涉及文件**：`index.css`

---

### Bug 6 🟡 封面一直卡在"加载中…"

**表现**：
显示 spinner 动画和"封面加载中…"文字，永远不结束

**根因**：
`<img style="display:none">` 在大多数浏览器中不会触发网络请求，`onLoad` 永远不触发。

**修复**：
- `<img>` 始终 `display: block`（可见）
- loading/error 状态用绝对定位覆盖层叠加在图片上方
- 加载成功 → 覆盖层消失（`imgLoading=false`），露出图片
- 加载失败 → 覆盖层切换为 fallback 图标

**涉及文件**：`VideoCard.tsx`

---

### Bug 7 🟡 暗色主题：标题与背景对比度

**表现**：
用户反馈暗色主题下"视频标题字体是白色，和背景一样看不清"

**状态**：**待复现/待用户确认具体位置**

已确认的 CSS token 链路：
- 暗色模式标题色：`--text-primary` → `var(--gray-50)` = `#F8FAFC`（近白）
- 暗色模式卡片背景：`--card-bg` → `var(--surface-default)` → `var(--gray-800)` = `#1E293B`（深灰）
- 对比度约 13:1，理论上清晰可见

**排查方向**：
1. 确认 `data-theme="dark"` 是否正确设置在根元素上
2. 检查浏览器 DevTools → Elements → Computed，确认 `--text-primary` 实际解析值
3. 可能用户指的不是 VideoCard 标题，而是"正在解析链接…"等中间状态文字
4. 可能和浏览器/系统颜色主题有关

**建议**：下次让用户截图 + 打开 DevTools 检查具体元素的 computed CSS

---

### Bug 8 🔴 QR 登录：HttpOnly Cookie 导致扫码成功但无法提取 Cookie

**表现**：
用户扫码后二维码变成"登录成功"，但页面没有变为"已登录"状态。

**根因**：
Vite 代理的 `onProxyRes` 处理了 `Secure` 和 `SameSite` 但**没有剥离 `HttpOnly`**。B 站登录 API 返回的 `SESSDATA` cookie 带有 `HttpOnly` 标记 → 浏览器无法通过 `document.cookie` 暴露给 JS → `extractBiliCookies()` 返回空字符串 → 虽然扫码成功但 Cookie 无法被提取和持久化。

**修复**：
1. `vite.config.ts`：两个代理的 `onProxyRes` 中增加 `.replace(/;\s*HttpOnly/gi, '')`
2. `LoginPanel.tsx`：QR 成功回调不再从 localStorage 读取（`checkLoginState`），改为直接用 `validateLoginStatus(cookieStr)` 验证；增加空 cookieStr 时的 `document.cookie` fallback

**涉及文件**：`vite.config.ts`、`LoginPanel.tsx`

---

### Bug 9 🟡 解析后标题不显示

**根因分析**（防御性修复）：
`apiGet()` 在 `json.code === 0` 但 `data` 为 `null` 时返回 `null`，不抛异常。后续 `detail.title` 对 `null` 访问会抛 TypeError，被 catch 捕获后触发 WBI fallback。但这个流程依赖异常机制，不够可靠。

**修复**：
`bilibili-api.ts`：在 `apiGet` 获取详情后增加显式的 null 检查：`if (!detail || typeof detail !== 'object') throw new Error(...)`，确保触发 WBI fallback

**涉及文件**：`bilibili-api.ts`

---

### Bug 10 🟡 暗色主题：多处硬编码色值导致对比度不足

通过并行审计 11 个组件文件，发现并修复了以下问题：

| 严重度 | 文件 | 问题 | 修复 |
|--------|------|------|------|
| CRITICAL | `EpisodeList.tsx:265` | `--text-quaternary` 未定义 | `--text-disabled` |
| CRITICAL | `HistoryPage.tsx:455,465` | `--text-quaternary` 未定义 | `--text-disabled` |
| HIGH | `HistoryPage.tsx:321` | `#fff` 文字在 accent 背景上对比度仅 3.1:1 | `var(--color-accent-text)` |
| HIGH | `SettingsPage.tsx:310` | Toggle OFF 状态 `--gray-600` 在暗色背景上仅 1.5:1 | `var(--border-strong)` |
| MEDIUM | `StatusBar.tsx:56` | `#D97706` 硬编码 | `var(--color-warning)` |
| MEDIUM | `FfmpegBanner.tsx:70` | `--color-danger` 未定义（有 fallback 但不对主题适配） | `var(--color-error)` |
| LOW | `InputBar.tsx:148,170` | 硬编码 `rgba(0,0,0,0.06)` hover / `--gray-200` 禁用背景 | `var(--surface-overlay)` |

**涉及文件**：`EpisodeList.tsx`、`HistoryPage.tsx`、`SettingsPage.tsx`、`StatusBar.tsx`、`FfmpegBanner.tsx`、`InputBar.tsx`

---

### Bug 11 🟡 下载速度：4 个性能问题

**修复**：
1. **浏览器模式视频+音频并行下载**：`download-manager.ts` — 原为串行 `await video → await audio`，改为 `Promise.all([video, audio])`
2. **下载完成后 1 秒排队空窗**：store 订阅回调新增对 `downloading → completed/failed` 转换的检测，立即触发 `processQueue()`
3. **resumeItem 恢复下载失效**：`downloadStore.ts` — `resumeItem` 将状态设为 `downloading` 但 processQueue 只处理 `queued`，导致恢复的下载永远不会被处理。改为设 `queued`
4. **速度进度更新优化**：仅移除不必要的 `speedHistory: [...speedHistory]` 每次引用复制

**涉及文件**：`download-manager.ts`、`downloadStore.ts`

---

### Bug 12 ✨ 历史记录增强（用户需求）

1. `DownloadItemData` 新增 `inputUrl` 字段
2. `HistoryEntry` 新增 `inputUrl` 字段
3. `App.tsx` — 创建下载项时传入 `lastUrl`
4. `download-manager.ts` — `recordToHistory` 传入 `inputUrl`
5. `HistoryPage.tsx` — 显示原始输入链接、时间改为 `YYYY-MM-DD HH:mm:ss` 具体格式

**涉及文件**：`DownloadItem.tsx`、`historyStore.ts`、`App.tsx`、`download-manager.ts`、`HistoryPage.tsx`

---

## 三、修改文件清单

### 第一轮（白屏 + 封面 + 二维码 + 文字选择）
```
文件                              变更说明
────────────────────────────────────────────────────────────────
src/App.tsx                       拆分 selector + 合并 initCookie/rehydrate
src/components/VideoCard.tsx      封面三态（加载/成功/失败）
src/components/LoginPanel.tsx     useShallow + 轮询错误日志
src/pages/SettingsPage.tsx        useShallow 选择器
src/pages/HistoryPage.tsx         useShallow 选择器
src/stores/userPrefsStore.ts      skipHydration: true
src/stores/historyStore.ts        skipHydration: true
src/index.css                     移除全局 user-select: none
src/services/login-service.ts     新 proxy + source=main-fe + 调试日志
src/services/cookie-manager.ts    新 proxy
src/services/bilibili-api.ts      调试日志 + detail null 检查
vite.config.ts                    新增 /api/passport 代理 + HttpOnly 剥离
.gitignore                        添加规则
handover/README.md                交接文档索引
```

### 第二轮（QR登录修复 + 暗色主题 + 下载速度 + 历史记录增强）
```
文件                              变更说明
────────────────────────────────────────────────────────────────
vite.config.ts                    代理 onProxyRes 增加 HttpOnly 剥离
src/components/LoginPanel.tsx     QR 登录成功直接用 cookieStr 验证 + fallback
src/services/bilibili-api.ts      detail 显式 null 检查 → 触发 WBI fallback
src/services/download-manager.ts  浏览器并行下载 + 队列即时触发 + inputUrl
src/stores/downloadStore.ts       resumeItem: downloading → queued
src/stores/historyStore.ts        HistoryEntry 新增 inputUrl
src/components/DownloadItem.tsx   DownloadItemData 新增 inputUrl
src/App.tsx                       创建下载项传入 lastUrl/inputUrl
src/pages/HistoryPage.tsx         显示 inputUrl + 具体时间戳 + 暗色修复
src/pages/SettingsPage.tsx        Toggle OFF 状态暗色修复
src/components/InputBar.tsx       硬编码色值 → CSS 变量
src/components/StatusBar.tsx      #D97706 → var(--color-warning)
src/components/FfmpegBanner.tsx   --color-danger → --color-error
src/components/EpisodeList.tsx    --text-quaternary → --text-disabled
src/components/TitleBar.tsx       无变更（仅审计确认）
src/components/DownloadPanel.tsx  无变更（仅审计确认）
src/components/Toast.tsx          无变更（仅审计确认）
src/__tests__/stores/downloadStore.test.ts  更新 resumeItem 测试
```

---

## 四、当前状态

| 项 | 状态 | 备注 |
|----|------|------|
| TypeScript 编译 | ✅ 零错误 | |
| 测试 | ✅ 55 passed, 3 skipped | |
| Vite 开发服务器 | ✅ 正常 | localhost:5173 |
| 白屏问题 | ✅ 已修复 | |
| 封面展示 | ✅ 已修复 | 三态完整 |
| 文字可选 | ✅ 已修复 | |
| 二维码生成 | ✅ 可正常显示 | |
| 二维码 HttpOnly Cookie | ✅ 已修复 | 代理剥离 HttpOnly + LoginPanel 加固 |
| 二维码登录完整流程 | ⚠️ 待验证 | 修改后未实测扫码，需用真机扫码验证 |
| 解析标题显示 | ✅ 增加防御 | detail null 检查确保 WBI fallback |
| 暗色主题对比度 | ✅ 11 处修复 | CRITICAL/HIGH/MEDIUM 级别全部修复 |
| 历史记录 | ✅ 已增强 | 新增 inputUrl 显示 + 具体时间戳 |
| 下载速度 | ✅ 4 处修复 | 并行下载 + 队列即时触发 + resumeItem 修复 |
| Electron 桌面模式 | 🔲 未测试 | `npm run dev:electron` |
| 下载速度（Electron 进度） | ⚠️ 已知问题 | 主进程进度事件未被渲染进程消费，speedHistory 为空 |

**仍需真机验证**：
- [ ] 扫码登录完整流程：打开 F12 Console → 扫码 → 观察 `[QR poll]` 日志
- [ ] 封面正常加载，标题正常显示
- [ ] 暗色/亮色主题切换下各组件颜色正常

---

## 五、仍需完成

### 优先级 1：验证
- [ ] **二维码扫码**：打开 F12 Console → 扫码 → 看 `[QR poll]` 日志，确认 API 返回了什么状态码
- [ ] **封面图片**：确认封面是否能正常加载显示（不再黑屏/卡加载）
- [ ] **标题对比度**：截图发来看看具体哪个文字看不清

### 优先级 2：功能修复
- [ ] 根据 `[QR poll]` 日志修复轮询 → 扫码 → 登录完整流程
- [ ] 标题不显示问题（用户反馈解析后没有标题，需查 `[parse] title:` 日志）
- [ ] 下载速度优化（可能是单线程限速，需看 download-manager 逻辑）

### 优先级 3：功能验证
- [ ] 浏览器模式：粘贴 `BV1GJ411x7h7` 测试完整解析→下载流程
- [ ] Electron 桌面模式：`npm run dev:electron` 确认窗口能打开
- [ ] 亮/暗主题切换：确认切换正常、各组件颜色正确
- [ ] 历史记录持久化：关闭页面重开，确认设置/历史被记住

### 优先级 4：打包
- [ ] `npm run build:electron` 打包 Windows 安装包
- [ ] FFmpeg 自动下载集成测试

---

## 六、修复原理深度解析

### zustand v5 + React 的 re-render 机制

```
createStore → useSyncExternalStore(subscribe, getSnapshot)

每次 set() 调用:
  → 更新内部 state
  → 遍历所有 listeners
  → React component 收到订阅通知
  → 调用 getSnapshot() 获取最新 state
  → Object.is(prevSnapshot, nextSnapshot)
  → 如果 false → re-render
```

**关键陷阱**：默认 selector = identity `(s) => s`

当 selector 是内联箭头函数 `(s) => ({...})`：
1. 每次渲染创建新 selector 函数
2. `React.useCallback(() => selector(api.getState()), [api, selector])` 因为 `selector` 引用变化而失效
3. `useSyncExternalStore` 收到新的 `getSnapshot`
4. 新 `getSnapshot` 返回新对象 → Object.is → false → re-render
5. Re-render → 回到步骤 1 → **死循环**

### 正确做法

```tsx
// ✅ 方案 A: 独立字段 selector（返回原语/稳定引用）
const addItem = useStore(s => s.addItem)  // 函数引用永远不变

// ✅ 方案 B: useShallow（浅比较替代 Object.is）
const { a, b } = useStore(useShallow(s => ({ a: s.a, b: s.b })))
// Shallow equal: 只有当 a 或 b 的值真正变化时才 re-render
```

### persist skipHydration 的作用

```
无 skipHydration:  模块加载时 hydrate() → set() → 可能在 React render 前改状态
有 skipHydration:   手动调用 rehydrate() → 在 useEffect 中执行 → React 正确批处理
```

---

## 附录：快捷命令

```
cd "D:\all app\BibiliDown"
npm run dev              # 浏览器开发模式
npm run dev:electron     # Electron 桌面模式
npm run test             # 运行测试
npx tsc --noEmit         # TypeScript 检查
```

桌面快捷方式：`C:\Users\huang\Desktop\BilibiliDown-浏览器版.bat`
