/**
 * VideoChat 设计令牌系统
 * 现代化、高端、友好的设计语言
 */

// 🎨 色彩系统 - 现代化配色方案
export const colors = {
  // 主色调 - 科技蓝紫渐变
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff', 
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',  // 主色
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },

  // 辅助色 - 优雅紫色
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff', 
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',  // 辅助色
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },

  // 成功色 - 清新绿
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',  // 成功色
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // 警告色 - 温暖橙
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',  // 警告色
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // 错误色 - 现代红
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',  // 错误色
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // 中性色 - 现代灰度
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // 渐变色
  gradients: {
    primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    secondary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    success: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
  }
};

// 📏 间距系统 - 8px 基准网格
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
};

// 🔤 字体系统 - 现代字体栈
export const typography = {
  fontFamily: {
    sans: [
      'Inter', 
      '-apple-system', 
      'BlinkMacSystemFont', 
      'Segoe UI', 
      'Roboto', 
      'Helvetica Neue', 
      'Arial', 
      'Noto Sans', 
      'sans-serif'
    ],
    mono: [
      'JetBrains Mono',
      'Fira Code', 
      'Monaco', 
      'Consolas', 
      'Liberation Mono', 
      'Courier New', 
      'monospace'
    ],
  },

  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px
    '5xl': ['3rem', { lineHeight: '1' }],           // 48px
    '6xl': ['3.75rem', { lineHeight: '1' }],        // 60px
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
    black: '900',
  },
};

// 🌊 阴影系统 - 现代层次感
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  
  // 彩色阴影
  primary: '0 10px 15px -3px rgba(99, 102, 241, 0.1), 0 4px 6px -2px rgba(99, 102, 241, 0.05)',
  secondary: '0 10px 15px -3px rgba(168, 85, 247, 0.1), 0 4px 6px -2px rgba(168, 85, 247, 0.05)',
  success: '0 10px 15px -3px rgba(34, 197, 94, 0.1), 0 4px 6px -2px rgba(34, 197, 94, 0.05)',
  
  // 玻璃态阴影
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
};

// 🔄 动画系统 - 流畅过渡
export const animations = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },

  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // 现代缓动函数
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },

  keyframes: {
    fadeIn: {
      '0%': { opacity: 0 },
      '100%': { opacity: 1 },
    },
    slideUp: {
      '0%': { transform: 'translateY(10px)', opacity: 0 },
      '100%': { transform: 'translateY(0)', opacity: 1 },
    },
    scaleIn: {
      '0%': { transform: 'scale(0.95)', opacity: 0 },
      '100%': { transform: 'scale(1)', opacity: 1 },
    },
    shimmer: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },
  },
};

// 📐 边框半径 - 现代圆角
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
};

// 📱 断点系统 - 响应式设计
export const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// 🎭 组件变体 - 设计系统组件
export const components = {
  button: {
    primary: {
      background: colors.gradients.primary,
      color: colors.neutral[0],
      shadow: shadows.primary,
      borderRadius: borderRadius.lg,
    },
    secondary: {
      background: colors.neutral[100],
      color: colors.neutral[700],
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: borderRadius.lg,
    },
    ghost: {
      background: 'transparent',
      color: colors.primary[600],
      border: `1px solid ${colors.primary[200]}`,
      borderRadius: borderRadius.lg,
    },
  },

  card: {
    default: {
      background: colors.neutral[0],
      border: `1px solid ${colors.neutral[200]}`,
      borderRadius: borderRadius.xl,
      shadow: shadows.sm,
    },
    elevated: {
      background: colors.neutral[0],
      borderRadius: borderRadius.xl,
      shadow: shadows.lg,
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: borderRadius.xl,
      shadow: shadows.glass,
    },
  },
};

export default {
  colors,
  spacing,
  typography,
  shadows,
  animations,
  borderRadius,
  breakpoints,
  components,
};
