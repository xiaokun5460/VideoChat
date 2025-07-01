/**
 * 深空极光设计系统 - 设计令牌
 * 全新的现代化AI界面设计语言
 */

// 色彩系统 - 深空极光主题
export const colors = {
  // 主色调 - 深空极光系列
  primary: {
    deepSpace: '#0a0e27',    // 深邃宇宙蓝
    nebula: '#1e3a8a',       // 星云蓝  
    aurora: '#10b981',       // 极光绿
    cosmic: '#0f172a'        // 宇宙深蓝
  },
  
  // 辅助色 - 量子能量系列
  secondary: {
    quantum: '#8b5cf6',      // 量子紫
    energy: '#f59e0b',       // 能量橙
    plasma: '#ec4899',       // 等离子粉
    fusion: '#06b6d4'        // 聚变青
  },
  
  // 中性色 - 现代灰度系统
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a'
  },
  
  // 语义色彩
  semantic: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4'
  }
} as const

// 渐变系统
export const gradients = {
  // 主要渐变
  aurora: 'linear-gradient(135deg, #0a0e27 0%, #1e3a8a 50%, #10b981 100%)',
  quantum: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  cosmic: 'radial-gradient(circle at 30% 70%, #8b5cf6 0%, transparent 50%)',
  
  // 背景渐变
  lightBg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
  darkBg: 'linear-gradient(135deg, #0a0e27 0%, #1e293b 100%)',
  
  // 玻璃态渐变
  glassLight: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  glassDark: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(139,92,246,0.05) 100%)'
} as const

// 间距系统 - 4px基础单位
export const spacing = {
  0: '0',
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  3: '0.75rem',    // 12px
  4: '1rem',       // 16px
  5: '1.25rem',    // 20px
  6: '1.5rem',     // 24px
  8: '2rem',       // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  32: '8rem',      // 128px
  40: '10rem',     // 160px
  48: '12rem',     // 192px
  56: '14rem',     // 224px
  64: '16rem'      // 256px
} as const

// 圆角系统 - 动态圆角
export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  '3xl': '2rem',   // 32px
  full: '9999px'
} as const

// 阴影系统 - 新拟态效果
export const shadows = {
  // 明亮主题阴影
  light: {
    sm: '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.7)',
    md: '8px 8px 16px rgba(0,0,0,0.1), -8px -8px 16px rgba(255,255,255,0.7)',
    lg: '12px 12px 24px rgba(0,0,0,0.15), -12px -12px 24px rgba(255,255,255,0.8)',
    xl: '16px 16px 32px rgba(0,0,0,0.2), -16px -16px 32px rgba(255,255,255,0.9)'
  },
  
  // 暗黑主题阴影 - 霓虹效果
  dark: {
    sm: '0 0 10px rgba(16,185,129,0.3), inset 4px 4px 8px rgba(0,0,0,0.3)',
    md: '0 0 20px rgba(16,185,129,0.3), inset 8px 8px 16px rgba(0,0,0,0.3)',
    lg: '0 0 30px rgba(16,185,129,0.4), inset 12px 12px 24px rgba(0,0,0,0.4)',
    xl: '0 0 40px rgba(16,185,129,0.5), inset 16px 16px 32px rgba(0,0,0,0.5)'
  },
  
  // 玻璃态阴影
  glass: '0 8px 32px rgba(0,0,0,0.1)',
  glow: '0 0 20px rgba(16,185,129,0.4)'
} as const

// 字体系统
export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'Consolas', 'monospace'],
    display: ['Space Grotesk', 'Inter', 'sans-serif']
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem',    // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem',  // 72px
    '8xl': '6rem',    // 96px
    '9xl': '8rem'     // 128px
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900'
  },
  
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2'
  }
} as const

// 断点系统 - 响应式设计
export const breakpoints = {
  sm: '640px',   // 手机
  md: '768px',   // 平板
  lg: '1024px',  // 桌面
  xl: '1280px',  // 大屏
  '2xl': '1536px' // 超大屏
} as const

// 动画系统
export const animations = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms'
  },
  
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
} as const

// Z-index层级系统
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800
} as const