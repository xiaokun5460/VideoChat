# 原子化CSS工具类使用指南

## 概述

本项目提供了一套完整的原子化CSS工具类系统，基于设计令牌构建，提供一致的样式管理和高效的开发体验。

## 设计原则

1. **基于设计令牌**：所有工具类都使用CSS变量，确保设计一致性
2. **响应式优先**：支持sm、md、lg、xl四个断点的响应式设计
3. **语义化命名**：采用直观的命名规范，易于理解和使用
4. **性能优化**：原子化类减少CSS冗余，提升加载性能

## 工具类分类

### 1. 间距工具类

#### Padding
```css
.p-0    /* padding: 0 */
.p-1    /* padding: var(--spacing-1) */
.p-2    /* padding: var(--spacing-2) */
.p-4    /* padding: var(--spacing-4) */
.p-6    /* padding: var(--spacing-6) */
.p-8    /* padding: var(--spacing-8) */

/* 方向性padding */
.px-4   /* padding-left + padding-right */
.py-4   /* padding-top + padding-bottom */
```

#### Margin
```css
.m-0    /* margin: 0 */
.m-4    /* margin: var(--spacing-4) */
.mx-auto /* margin-left: auto; margin-right: auto */
.my-4   /* margin-top + margin-bottom */
```

#### Gap (Flexbox/Grid)
```css
.gap-2  /* gap: var(--spacing-2) */
.gap-4  /* gap: var(--spacing-4) */
.gap-6  /* gap: var(--spacing-6) */
```

### 2. 颜色工具类

#### 文本颜色
```css
.text-primary     /* 主色调文本 */
.text-success     /* 成功状态文本 */
.text-warning     /* 警告状态文本 */
.text-error       /* 错误状态文本 */
.text-gray-500    /* 灰色文本 */
```

#### 背景颜色
```css
.bg-primary       /* 主色调背景 */
.bg-white         /* 白色背景 */
.bg-gray-50       /* 浅灰背景 */
.bg-transparent   /* 透明背景 */
```

#### 渐变背景
```css
.bg-gradient-primary  /* 主色调渐变 */
.bg-gradient-success  /* 成功状态渐变 */
```

### 3. 字体工具类

#### 字体大小
```css
.text-xs    /* 超小字体 */
.text-sm    /* 小字体 */
.text-base  /* 基础字体 */
.text-lg    /* 大字体 */
.text-xl    /* 超大字体 */
.text-2xl   /* 2倍大字体 */
```

#### 字体粗细
```css
.font-light     /* 细体 */
.font-normal    /* 正常 */
.font-medium    /* 中等 */
.font-semibold  /* 半粗体 */
.font-bold      /* 粗体 */
```

#### 行高
```css
.leading-tight    /* 紧密行高 */
.leading-normal   /* 正常行高 */
.leading-relaxed  /* 宽松行高 */
```

### 4. 布局工具类

#### Display
```css
.block        /* display: block */
.flex         /* display: flex */
.grid         /* display: grid */
.hidden       /* display: none */
```

#### Flexbox
```css
.flex-row         /* flex-direction: row */
.flex-col         /* flex-direction: column */
.justify-center   /* justify-content: center */
.justify-between  /* justify-content: space-between */
.items-center     /* align-items: center */
.flex-1           /* flex: 1 1 0% */
```

#### 尺寸
```css
.w-full   /* width: 100% */
.h-full   /* height: 100% */
.w-auto   /* width: auto */
```

### 5. 边框和圆角

#### 圆角
```css
.rounded-none   /* border-radius: 0 */
.rounded-sm     /* 小圆角 */
.rounded        /* 基础圆角 */
.rounded-lg     /* 大圆角 */
.rounded-full   /* 完全圆形 */
```

#### 边框
```css
.border           /* 基础边框 */
.border-0         /* 无边框 */
.border-primary   /* 主色调边框 */
```

### 6. 阴影工具类

```css
.shadow-none  /* 无阴影 */
.shadow-sm    /* 小阴影 */
.shadow       /* 基础阴影 */
.shadow-lg    /* 大阴影 */
.shadow-xl    /* 超大阴影 */
```

### 7. 交互状态

```css
.cursor-pointer     /* 指针光标 */
.select-none        /* 禁止选择 */
.opacity-50         /* 50%透明度 */
.transition         /* 过渡动画 */
.hover:scale-105    /* 悬停放大 */
```

## 响应式设计

### 断点系统
- `sm`: 640px+
- `md`: 768px+  
- `lg`: 1024px+
- `xl`: 1280px+

### 使用示例
```css
/* 基础样式 + 响应式 */
.p-4 .md:p-6 .lg:p-8

/* 响应式布局 */
.flex-col .md:flex-row

/* 响应式字体 */
.text-sm .md:text-base .lg:text-lg
```

## 实际使用示例

### 1. 卡片组件
```jsx
<div className="bg-white rounded-lg shadow-md p-6 m-4">
  <h3 className="text-xl font-semibold text-gray-800 mb-4">
    卡片标题
  </h3>
  <p className="text-gray-600 leading-relaxed">
    卡片内容描述
  </p>
</div>
```

### 2. 响应式布局
```jsx
<div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6">
  <div className="flex-1 bg-gray-50 rounded-lg p-4">
    左侧内容
  </div>
  <div className="flex-1 bg-gray-50 rounded-lg p-4">
    右侧内容
  </div>
</div>
```

### 3. 按钮样式
```jsx
<button className="bg-primary text-white px-6 py-3 rounded-lg font-medium 
                   transition hover:scale-105 shadow-md">
  主要按钮
</button>
```

## 最佳实践

1. **优先使用工具类**：减少自定义CSS，提高一致性
2. **合理组合**：将相关的工具类组合使用
3. **响应式思维**：考虑不同屏幕尺寸的体验
4. **语义化组合**：创建有意义的组件类名
5. **性能考虑**：避免过度使用，保持代码简洁

## 扩展指南

如需添加新的工具类：

1. 在 `utilities.css` 中添加新类
2. 遵循现有命名规范
3. 使用设计令牌变量
4. 考虑响应式变体
5. 更新此文档

## 与现有系统集成

工具类系统与现有的组件样式完美兼容：
- 可以与Ant Design组件一起使用
- 支持主题切换
- 与CSS变量系统无缝集成
- 不会影响现有的自定义样式
