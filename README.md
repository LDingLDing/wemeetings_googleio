# [2025 Google开发者大会 - 会议日程助手](https://traegoogleh1wt-liluhuizj-6692-luhuis-projects-2149c3fa.vercel.app/)

> 🎯 一个专为 2025 Google开发者大会设计的轻量化 PWA 工具，帮助参会者管理会议日程、智能检测时间冲突、生成个性化参会路线表。
> 
> 💝 **免费开源的独立开发项目** | 支持离线使用 | 无需注册登录

## ✨ 核心功能

### 📅 智能日程管理
- **个性化预约**：一键预约感兴趣的会议，自动生成个人专属时间表
- **智能冲突检测**：实时检测时间重叠的会议，提供替代方案建议
- **多维度筛选**：按专场、时段、难度等条件快速筛选会议
- **搜索功能**：支持会议标题、嘉宾姓名、内容关键词搜索

### 🔔 提醒与通知
- **自定义提醒**：支持会议前 5/10/15/30 分钟提醒
- **多种通知方式**：浏览器通知、声音提醒、震动提醒
- **离线提醒**：即使断网也能正常提醒

### 💾 数据管理
- **版本控制**：智能检测数据更新，避免重复下载
- **离线存储**：基于 IndexedDB 的本地数据库，支持完全离线使用
- **数据同步**：自动同步最新会议信息和个人设置

### 🎨 用户体验
- **响应式设计**：完美适配手机、平板、桌面设备
- **深色模式**：支持明暗主题切换
- **PWA 支持**：可安装到桌面，如原生应用般使用
- **无障碍访问**：遵循 WCAG 无障碍设计标准

## 🛠 技术架构

### 前端技术栈
- **框架**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite](https://vitejs.dev/) - 极速开发体验
- **UI 框架**: [Tailwind CSS](https://tailwindcss.com/) + [Antd Mobile](https://mobile.ant.design/)
- **图标库**: [Lucide React](https://lucide.dev/)
- **路由**: [React Router v7](https://reactrouter.com/)
- **状态管理**: [Zustand](https://zustand-demo.pmnd.rs/) - 轻量级状态管理

### 数据存储
- **本地数据库**: [Dexie.js](https://dexie.org/) (IndexedDB 封装)
- **缓存策略**: Service Worker + Cache API
- **数据版本控制**: 自研版本管理系统

### PWA 特性
- **Service Worker**: [Workbox](https://developer.chrome.com/docs/workbox/) 离线缓存
- **Web App Manifest**: 支持安装到设备
- **推送通知**: 基于 Web Push API

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- npm >= 8.0.0 或 pnpm >= 7.0.0

### 安装与运行

```bash

# 安装依赖 (推荐使用 pnpm)
pnpm install
# 或使用 npm
npm install

# 启动开发服务器
pnpm dev
# 或
npm run dev

# 浏览器访问 http://localhost:5173
```

### 构建部署

```bash
# 类型检查
pnpm check

# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 📱 使用指南

1. **浏览会议**: 在首页浏览所有会议，使用筛选和搜索功能快速找到感兴趣的内容
2. **预约会议**: 点击会议卡片上的"预约"按钮，系统会自动检测时间冲突
3. **查看日程**: 在"我的日程"页面查看已预约的会议，按时间线排列
4. **设置提醒**: 在设置页面配置提醒时间和通知方式
5. **离线使用**: 首次访问后，即可在无网络环境下正常使用

## 🔧 开发指南

### 添加新会议数据
1. 编辑 `public/io_connect_china_2025_workshops.json`
2. 更新 `version` 字段以触发数据更新
3. 为新会议分配唯一的 `id`


## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范
- 使用 ESLint 进行代码检查
- 遵循 TypeScript 严格模式
- 组件文件使用 PascalCase 命名
- 工具函数使用 camelCase 命名

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！

