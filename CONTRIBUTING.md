# 参与贡献

## 开发环境

```bash
# 1. 克隆仓库
git clone https://github.com/Luo-Feng6/bibilidown.git
cd bibilidown

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev              # 浏览器模式 → http://localhost:5173
npm run dev:electron     # Electron 桌面模式

# 4. 运行测试
npm run test             # Vitest（55 passed / 3 skipped）

# 5. 类型检查
npx tsc --noEmit         # 确保零错误
```

## 项目结构速览

| 目录 | 职责 |
|------|------|
| `src/services/` | B 站 API · 下载引擎 · 登录 · Cookie · WBI 签名 |
| `src/stores/` | Zustand 状态管理（8 个 Store） |
| `src/components/` | UI 组件（12 个） |
| `src/pages/` | 页面组件（3 个：设置 · 历史 · 关于） |
| `src/utils/` | 工具函数（剪贴板 · 环境检测） |
| `electron/` | Electron 主进程 + Preload |

详见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 提交规范

- `feat: ...` — 新功能
- `fix: ...` — Bug 修复
- `docs: ...` — 文档更新
- `chore: ...` — 杂项（依赖 / 配置 / 清理）
- `style: ...` — 样式调整

版本号遵循 `vX.Y.Z`，提交信息格式：`vX.Y.Z: 中文描述`。

## 提交前检查清单

- [ ] `npx tsc --noEmit` 零错误
- [ ] `npm run test` 全部通过
- [ ] `npm run dev` 浏览器验证功能正常
- [ ] git commit message 符合格式

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 43 |
| UI | React 18 + TypeScript 5 |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 + CSS Variables |
| 状态 | Zustand 5 |
| 图标 | Phosphor Icons |
| 测试 | Vitest 4 |

## 文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) — 系统架构 · 数据流 · 组件树
- [CHANGELOG.md](./CHANGELOG.md) — 版本更新历史
- [README.md](./README.md) — 功能介绍 + 快速开始
