/**
 * 主题系统统一导出
 * 提供完整的主题管理解决方案
 */

// 设计令牌
export { default as tokens, colors, typography, spacing, borderRadius, boxShadow, animation, zIndex, breakpoints } from './tokens';

// Ant Design主题配置
export { createAntdTheme, lightTheme, darkTheme } from './antdTheme';

// 主题管理Hook
export { useTheme, THEME_MODES } from '../hooks/useTheme';

// 全局样式 (需要在应用入口导入)
// import './globalStyles.css';

/**
 * 主题系统使用指南
 * 
 * 1. 基础使用：
 * ```jsx
 * import { useTheme, lightTheme } from '@/theme';
 * import { ConfigProvider } from 'antd';
 * 
 * function App() {
 *   const { antdTheme, isDark, toggleTheme } = useTheme();
 *   
 *   return (
 *     <ConfigProvider theme={antdTheme}>
 *       <button onClick={toggleTheme}>
 *         切换主题 ({isDark ? '暗色' : '亮色'})
 *       </button>
 *       {/* 你的应用内容 *\/}
 *     </ConfigProvider>
 *   );
 * }
 * ```
 * 
 * 2. 使用设计令牌：
 * ```jsx
 * import { tokens } from '@/theme';
 * 
 * const styles = {
 *   container: {
 *     padding: tokens.spacing[4],
 *     borderRadius: tokens.borderRadius.lg,
 *     backgroundColor: tokens.colors.primary[500],
 *     boxShadow: tokens.boxShadow.md
 *   }
 * };
 * ```
 * 
 * 3. CSS变量使用：
 * ```css
 * .my-component {
 *   color: var(--color-primary-500);
 *   padding: var(--spacing-4);
 *   border-radius: var(--border-radius-lg);
 *   box-shadow: var(--shadow-md);
 * }
 * ```
 * 
 * 4. 响应式设计：
 * ```css
 * .responsive-container {
 *   width: 100%;
 * }
 * 
 * @media (min-width: 768px) {
 *   .responsive-container {
 *     max-width: 768px;
 *   }
 * }
 * ```
 * 
 * 5. 主题切换组件：
 * ```jsx
 * import { useTheme, THEME_MODES } from '@/theme';
 * import { Button, Dropdown } from 'antd';
 * 
 * function ThemeSelector() {
 *   const { themeMode, setTheme, getThemeDisplayName } = useTheme();
 *   
 *   const items = Object.values(THEME_MODES).map(mode => ({
 *     key: mode,
 *     label: getThemeDisplayName(mode),
 *     onClick: () => setTheme(mode)
 *   }));
 *   
 *   return (
 *     <Dropdown menu={{ items }}>
 *       <Button>{getThemeDisplayName(themeMode)}</Button>
 *     </Dropdown>
 *   );
 * }
 * ```
 */

// 默认导出主题配置
export default {
  tokens,
  createAntdTheme,
  lightTheme,
  darkTheme,
  useTheme,
  THEME_MODES
};
