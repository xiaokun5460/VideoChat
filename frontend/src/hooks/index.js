/**
 * Hooks统一导出
 * 提供所有自定义Hook的统一入口
 */

// API相关Hooks
export { useAPICall } from './useAPICall';
export { useStreamAPI } from './useStreamAPI';
export { useBatchAPI } from './useBatchAPI';
export { useFileUpload } from './useFileUpload';
export { useRequestCache, clearGlobalCache, getCacheStats } from './useRequestCache';

// 通用Hooks
export { useAsyncOperation } from './useAsyncOperation';

// 应用状态Hooks
export { 
  useFiles, 
  useUIState, 
  AppProvider 
} from './useAppContext';

// 主题Hooks
export { useTheme, THEME_MODES } from './useTheme';

// AI功能Hooks
export { useAIFeatures } from './useAIFeatures';

// 文件管理Hooks
export { useFileManager } from './useFileManager';

/**
 * Hooks使用指南
 * 
 * 1. 基础API调用：
 * ```javascript
 * import { useAPICall } from '@/hooks';
 * 
 * const MyComponent = () => {
 *   const { loading, error, data, execute } = useAPICall();
 *   
 *   const handleSubmit = async () => {
 *     try {
 *       const result = await execute(apiFunction, {
 *         loadingMessage: '处理中...',
 *         successMessage: '操作成功',
 *         onSuccess: (data) => console.log('成功:', data)
 *       });
 *     } catch (error) {
 *       console.error('失败:', error);
 *     }
 *   };
 *   
 *   return (
 *     <Button loading={loading} onClick={handleSubmit}>
 *       提交
 *     </Button>
 *   );
 * };
 * ```
 * 
 * 2. 流式API调用：
 * ```javascript
 * import { useStreamAPI } from '@/hooks';
 * 
 * const StreamComponent = () => {
 *   const { streaming, content, executeStream } = useStreamAPI();
 *   
 *   const handleStream = async () => {
 *     await executeStream(streamApiFunction, {
 *       onChunk: (chunk) => console.log('收到:', chunk),
 *       onComplete: () => console.log('完成'),
 *       onError: (error) => console.error('错误:', error)
 *     });
 *   };
 *   
 *   return (
 *     <div>
 *       <Button loading={streaming} onClick={handleStream}>
 *         开始流式处理
 *       </Button>
 *       <div>{content}</div>
 *     </div>
 *   );
 * };
 * ```
 * 
 * 3. 文件上传：
 * ```javascript
 * import { useFileUpload } from '@/hooks';
 * 
 * const UploadComponent = () => {
 *   const { uploading, progress, upload } = useFileUpload();
 *   
 *   const handleUpload = async (file) => {
 *     try {
 *       const result = await upload(file, {
 *         uploadFunction: uploadAndTranscribe,
 *         onProgress: (progress) => console.log('进度:', progress),
 *         allowedTypes: ['audio/*', 'video/*'],
 *         maxSize: 100 * 1024 * 1024 // 100MB
 *       });
 *     } catch (error) {
 *       console.error('上传失败:', error);
 *     }
 *   };
 *   
 *   return (
 *     <Upload
 *       beforeUpload={handleUpload}
 *       showUploadList={false}
 *     >
 *       <Button loading={uploading}>
 *         上传文件 {uploading && `${progress}%`}
 *       </Button>
 *     </Upload>
 *   );
 * };
 * ```
 * 
 * 4. 批量API调用：
 * ```javascript
 * import { useBatchAPI } from '@/hooks';
 * 
 * const BatchComponent = () => {
 *   const { loading, progress, executeBatch } = useBatchAPI();
 *   
 *   const handleBatch = async () => {
 *     const apiCalls = [
 *       () => apiFunction1(),
 *       () => apiFunction2(),
 *       () => apiFunction3(),
 *     ];
 *     
 *     const result = await executeBatch(apiCalls, {
 *       maxConcurrency: 2,
 *       onProgress: (progress, completed, total) => {
 *         console.log(`进度: ${progress}% (${completed}/${total})`);
 *       },
 *       onComplete: (results, errors) => {
 *         console.log('批量处理完成:', { results, errors });
 *       }
 *     });
 *   };
 *   
 *   return (
 *     <Button loading={loading} onClick={handleBatch}>
 *       批量处理 {loading && `${progress.toFixed(1)}%`}
 *     </Button>
 *   );
 * };
 * ```
 * 
 * 5. 请求缓存：
 * ```javascript
 * import { useRequestCache } from '@/hooks';
 * 
 * const CachedComponent = () => {
 *   const { loading, data, fetchWithCache } = useRequestCache('user-data', {
 *     ttl: 5 * 60 * 1000, // 5分钟缓存
 *     staleWhileRevalidate: true
 *   });
 *   
 *   useEffect(() => {
 *     fetchWithCache(getUserData, { userId: 123 });
 *   }, []);
 *   
 *   return (
 *     <div>
 *       {loading ? '加载中...' : JSON.stringify(data)}
 *     </div>
 *   );
 * };
 * ```
 * 
 * 6. 通用异步操作：
 * ```javascript
 * import { useAsyncOperation } from '@/hooks';
 * 
 * const AsyncComponent = () => {
 *   const { loading, data, error, execute } = useAsyncOperation({
 *     autoReset: true,
 *     autoResetDelay: 3000
 *   });
 *   
 *   const handleOperation = async () => {
 *     await execute(someAsyncFunction, {
 *       onSuccess: (result) => console.log('成功:', result),
 *       onError: (error) => console.error('失败:', error)
 *     });
 *   };
 *   
 *   return (
 *     <div>
 *       <Button loading={loading} onClick={handleOperation}>
 *         执行操作
 *       </Button>
 *       {error && <div>错误: {error.message}</div>}
 *       {data && <div>结果: {JSON.stringify(data)}</div>}
 *     </div>
 *   );
 * };
 * ```
 */

// 默认导出
export default {
  // API相关
  useAPICall,
  useStreamAPI,
  useBatchAPI,
  useFileUpload,
  useRequestCache,
  
  // 通用
  useAsyncOperation,
  
  // 应用状态
  useFiles,
  useUIState,
  
  // 主题
  useTheme,
  
  // AI功能
  useAIFeatures,
  
  // 文件管理
  useFileManager,
  
  // 工具函数
  clearGlobalCache,
  getCacheStats,
};
