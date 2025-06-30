/**
 * 设计系统统一导出
 * 提供基础设计令牌
 */

// 设计令牌
export { default as tokens, colors, typography, spacing, borderRadius, boxShadow, animation, zIndex, breakpoints } from './tokens';

/**
 * 设计系统使用指南
 *
 * 使用设计令牌：
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
 * 响应式设计：
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
 */

// 默认导出设计令牌
export default {
  tokens,
};
