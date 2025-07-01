# VideoChat Vue 3 前端项目配置文档

## 项目概述

VideoChat Vue 3前端应用，采用"深空极光"设计系统，实现现代化AI界面。

## 技术栈

- **框架**: Vue 3.5+ (Composition API)
- **构建工具**: Vite 6.0+
- **语言**: TypeScript 5.8+
- **UI库**: Naive UI (现代化组件库)
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **HTTP客户端**: Axios
- **代码规范**: ESLint + Prettier
- **测试**: Vitest

## 项目结构

```
frontend/
├── src/
│   ├── components/          # 组件库
│   │   ├── layout/         # 布局组件
│   │   └── common/         # 通用组件
│   ├── views/              # 页面视图
│   ├── stores/             # Pinia状态管理
│   ├── services/           # API服务层
│   ├── types/              # TypeScript类型定义
│   ├── utils/              # 工具函数
│   ├── styles/             # 样式文件
│   └── composables/        # Vue 3组合式函数
├── public/                 # 静态资源
├── vite.config.ts          # Vite配置
├── tsconfig.json           # TypeScript配置
└── package.json            # 依赖管理
```

## 核心配置

### 1. Vite配置特性
- 自动导入Vue API和Naive UI组合式函数
- 自动导入组件
- 路径别名配置
- 代理配置到后端8000端口
- 代码分割优化

### 2. TypeScript严格模式
- 启用所有严格检查
- 完整的路径映射
- 类型安全保证

### 3. 主题系统
- 支持明亮/暗黑主题切换
- "深空极光"设计系统
- 新拟态设计效果
- 系统主题自动检测

### 4. API服务层
- 统一的HTTP请求管理
- 请求/响应拦截器
- 错误处理机制
- 类型安全的API调用

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 代码检查和修复
npm run lint

# 代码格式化
npm run format

# 构建生产版本
npm run build

# 预览构建结果
npm run preview

# 运行单元测试
npm run test:unit
```

## 开发服务器

- **本地地址**: http://localhost:5174/
- **网络地址**: http://192.168.3.191:5174/
- **Vue DevTools**: http://localhost:5174/__devtools__/

## API代理配置

所有 `/api` 请求自动代理到后端 `http://localhost:8000`

## 设计系统

### 色彩系统
- **主色调**: 深空蓝 → 星云蓝 → 极光绿
- **辅助色**: 量子紫、能量橙
- **点缀色**: 电子青、脉冲粉

### 视觉特效
- 新拟态设计
- 磨砂玻璃效果
- 流体渐变背景
- 微交互动画

## 下一步开发

1. 路由系统和布局组件
2. 文件上传组件
3. 媒体播放器组件
4. AI功能模块
5. 数据导出功能

## 注意事项

- 确保Node.js版本 >= 16
- 后端服务需要运行在8000端口
- 开发时保持代码风格一致
- 遵循TypeScript严格模式
- 使用组合式API开发模式