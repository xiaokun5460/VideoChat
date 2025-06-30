/**
 * 公共组件库统一导出
 * 提供可复用的UI组件集合
 */

// 基础交互组件
export { default as LoadingButton } from './LoadingButton';
export { default as ConfirmButton } from './ConfirmButton';

// 文本和内容组件
export { default as StreamingText } from './StreamingText';
export { default as CopyableText } from './CopyableText';

// 状态和反馈组件
export { default as EmptyState } from './EmptyState';
export { default as ProgressBar } from './ProgressBar';
export { default as ErrorBoundary } from './ErrorBoundary';

/**
 * 公共组件库使用指南
 *
 * 1. LoadingButton - 加载按钮：
 * ```jsx
 * import { LoadingButton } from '@/components/common';
 *
 * <LoadingButton
 *   loading={isLoading}
 *   loadingText="处理中..."
 *   onClick={handleSubmit}
 * >
 *   提交
 * </LoadingButton>
 * ```
 *
 * 2. ConfirmButton - 确认按钮：
 * ```jsx
 * import { ConfirmButton } from '@/components/common';
 *
 * <ConfirmButton
 *   title="删除确认"
 *   description="确定要删除这个文件吗？"
 *   onConfirm={handleDelete}
 *   danger
 * >
 *   删除
 * </ConfirmButton>
 * ```
 *
 * 3. StreamingText - 流式文本：
 * ```jsx
 * import { StreamingText } from '@/components/common';
 *
 * <StreamingText
 *   content={streamContent}
 *   isStreaming={isStreaming}
 *   showCursor={true}
 *   typewriterEffect={false}
 * />
 * ```
 *
 * 4. CopyableText - 可复制文本：
 * ```jsx
 * import { CopyableText } from '@/components/common';
 *
 * <CopyableText
 *   text="要复制的文本内容"
 *   showCopyButton={true}
 *   successMessage="复制成功！"
 *   onCopy={(text) => console.log('复制了:', text)}
 * />
 * ```
 *
 * 5. EmptyState - 空状态：
 * ```jsx
 * import { EmptyState } from '@/components/common';
 *
 * <EmptyState
 *   type="noFiles"
 *   onAction={handleUpload}
 *   actionText="上传文件"
 *   showAction={true}
 * />
 * ```
 *
 * 6. ProgressBar - 进度条：
 * ```jsx
 * import { ProgressBar } from '@/components/common';
 *
 * <ProgressBar
 *   percent={uploadProgress}
 *   showLabel={true}
 *   label="上传进度"
 *   showSpeed={true}
 *   animated={true}
 *   onComplete={() => console.log('完成')}
 * />
 * ```
 *
 * 7. ErrorBoundary - 错误边界：
 * ```jsx
 * import { ErrorBoundary } from '@/components/common';
 *
 * <ErrorBoundary
 *   onError={(error, errorInfo) => console.error(error)}
 *   onRetry={() => window.location.reload()}
 * >
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

// 默认导出（可选）
// export default {
//   LoadingButton,
//   ConfirmButton,
//   StreamingText,
//   CopyableText,
//   EmptyState,
//   ProgressBar,
//   ErrorBoundary,
// };
