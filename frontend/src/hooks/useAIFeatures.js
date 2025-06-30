/**
 * AI功能业务逻辑Hook
 * 统一管理AI功能调用：总结生成、思维导图、对话、评价
 */

import { useCallback } from 'react';
import { App } from 'antd';
import { useFiles } from './useAppContext';
import { useAPICall, useStreamAPI } from './useAPI';
import { generateSummary, generateDetailedSummary, chatWithAI, generateTeachingEvaluation, generateMindmap as generateMindmapAPI, extractTranscriptionText } from '../services/api';

/**
 * AI功能Hook
 * @returns {Object} AI功能相关的方法
 */
export const useAIFeatures = () => {
  const { message } = App.useApp();
  const { updateFile } = useFiles();

  // API调用Hooks
  const summaryAPI = useAPICall();
  const detailedSummaryAPI = useAPICall();
  const chatAPI = useAPICall();
  const evaluationAPI = useAPICall();

  // 流式API调用Hooks
  const summaryStreamAPI = useStreamAPI();
  const detailedSummaryStreamAPI = useStreamAPI();
  const chatStreamAPI = useStreamAPI();
  const evaluationStreamAPI = useStreamAPI();

  /**
   * 生成总结 - 支持简要总结和详细总结，启用流式响应
   * @param {Object} file - 文件对象
   * @param {string} type - 总结类型：'brief' | 'detailed'
   * @param {boolean} useStream - 是否使用流式响应
   * @returns {Promise} 总结结果
   */
  const generateSummaryContent = useCallback(
    async (file, type = 'brief', useStream = true) => {
      const text = extractTranscriptionText(file.transcription);
      const isDetailed = type === 'detailed';
      const apiFunction = isDetailed ? generateDetailedSummary : generateSummary;
      const updateField = isDetailed ? 'detailedSummary' : 'summary';

      // 选择使用流式或普通API
      if (useStream) {
        const streamAPI = isDetailed ? detailedSummaryStreamAPI : summaryStreamAPI;

        try {
          // 用于累积流式内容的变量
          let accumulatedContent = '';

          await streamAPI.executeStream(
            (options) => {
              return apiFunction(text, options);
            },
            {
              loadingMessage: isDetailed ? '正在生成详细总结...' : '正在生成简要总结...',
              successMessage: `${isDetailed ? '详细' : '简要'}总结生成完成`,
              errorMessage: `生成${isDetailed ? '详细' : '简要'}总结失败`,
              onStart: () => {
                accumulatedContent = ''; // 重置累积内容
              },
              onChunk: (chunk) => {
                // 直接累积内容，不依赖useStreamAPI内部状态
                accumulatedContent += chunk;

                // 实时更新文件状态，让UI能立即响应
                updateFile(file.name, { [updateField]: accumulatedContent });
              },
              onComplete: (finalContent) => {
                // 确保使用最终内容（优先使用finalContent，fallback到accumulatedContent）
                const finalResult = finalContent || accumulatedContent;
                updateFile(file.name, { [updateField]: finalResult });
              },
              onError: (error) => {
                console.error(`生成${isDetailed ? '详细' : '简要'}总结失败:`, error);
              },
            }
          );
        } catch (error) {
          console.error(`${type} summary generation failed:`, error);
          throw error;
        }
      } else {
        // 使用普通API调用（非流式）
        const apiCall = isDetailed ? detailedSummaryAPI : summaryAPI;

        try {
          const result = await apiCall.execute((options) => apiFunction(text, options), {
            loadingMessage: isDetailed ? '正在生成详细总结...' : '正在生成简要总结...',
            successMessage: `${isDetailed ? '详细' : '简要'}总结生成完成`,
            errorMessage: `生成${isDetailed ? '详细' : '简要'}总结失败`,
            onSuccess: (data) => {
              const summaryContent = isDetailed ? data.detailed_summary || data.detailedSummary : data.summary;

              // 更新文件总结
              updateFile(file.name, { [updateField]: summaryContent });
            },
          });

          return result;
        } catch (error) {
          console.error(`${type} summary generation failed:`, error);
          throw error;
        }
      }
    },
    [updateFile, summaryAPI, detailedSummaryAPI, summaryStreamAPI, detailedSummaryStreamAPI]
  );

  /**
   * 生成思维导图
   * @param {Object} file - 文件对象
   * @returns {Promise} 思维导图结果
   */
  const generateMindmap = useCallback(
    async (file) => {
      try {
        message.loading('正在生成思维导图...', 0);

        const text = file.transcription.map((item) => item.text).join(' ');
        const data = await generateMindmapAPI(text);

        // 更新文件思维导图 - 使用图片URL
        updateFile(file.name, { mindmapData: data.image_url });

        message.destroy();
        message.success('思维导图生成完成');

        return data;
      } catch (error) {
        console.error('Mindmap generation failed:', error);
        message.destroy();
        message.error(`生成思维导图失败: ${error.message}`);
        throw error;
      }
    },
    [updateFile, message]
  );

  /**
   * AI对话 - 支持流式响应
   * @param {string} userMessage - 用户消息
   * @param {Object} file - 文件对象
   * @param {boolean} useStream - 是否使用流式响应
   * @returns {Promise<string>} AI回复
   */
  const sendMessage = useCallback(
    async (userMessage, file, useStream = true) => {
      const context = extractTranscriptionText(file.transcription);
      const messages = [{ role: 'user', content: userMessage }];

      if (useStream) {
        // 使用流式响应 - 实时显示AI回复
        try {
          let fullResponse = '';

          await chatStreamAPI.executeStream((options) => chatWithAI(messages, context, options), {
            loadingMessage: 'AI正在思考...',
            successMessage: '对话完成',
            errorMessage: 'AI对话失败',
            onChunk: (chunk) => {
              fullResponse += chunk;
              // 这里可以实时更新UI显示AI回复
              console.log('AI实时回复:', chunk);
            },
            onComplete: () => {
              console.log('AI对话完成:', fullResponse);
            },
          });

          return fullResponse;
        } catch (error) {
          console.error('Chat stream failed:', error);
          throw error;
        }
      } else {
        // 使用普通API调用（非流式）
        try {
          const result = await chatAPI.execute((options) => chatWithAI(messages, context, options), {
            loadingMessage: 'AI正在思考...',
            successMessage: '对话完成',
            errorMessage: 'AI对话失败',
            showMessages: false, // 由调用方控制消息显示
          });

          return result.response || result;
        } catch (error) {
          console.error('Chat failed:', error);
          throw error;
        }
      }
    },
    [chatAPI, chatStreamAPI]
  );

  /**
   * 生成智能评价 - 支持流式响应
   * @param {Object} file - 文件对象
   * @param {boolean} useStream - 是否使用流式响应
   * @returns {Promise} 评价结果
   */
  const generateEvaluation = useCallback(
    async (file, useStream = true) => {
      const text = extractTranscriptionText(file.transcription);

      if (useStream) {
        // 使用流式响应 - 实时显示评价生成过程
        try {
          // 用于累积流式内容的变量
          let accumulatedContent = '';

          // 使用evaluationStreamAPI来管理加载状态
          await evaluationStreamAPI.executeStream(
            (options) => {
              // 直接调用API，但通过executeStream管理状态
              return generateTeachingEvaluation(text, {
                ...options,
                onChunk: (chunk) => {
                  accumulatedContent += chunk;
                  console.log('📝 智能评价流式更新:', accumulatedContent.length, '字符');

                  // 实时更新文件状态，让UI能立即响应
                  updateFile(file.name, { evaluation: accumulatedContent });
                },
                onComplete: (finalContent) => {
                  const finalResult = finalContent || accumulatedContent;
                  console.log('✅ 智能评价生成完成:', finalResult.length, '字符');
                  updateFile(file.name, { evaluation: finalResult });
                },
                onError: (error) => {
                  console.error('❌ 生成智能评价失败:', error);
                },
              });
            },
            {
              loadingMessage: '正在生成智能评价...',
              successMessage: '智能评价生成完成',
              errorMessage: '生成智能评价失败',
              showMessages: false, // 不显示全局消息，让UI组件处理
            }
          );
        } catch (error) {
          console.error('Evaluation generation failed:', error);
          message.error('生成智能评价失败');
          throw error;
        }
      } else {
        // 使用普通API调用（非流式）
        try {
          const result = await evaluationAPI.execute((options) => generateTeachingEvaluation(text, options), {
            loadingMessage: '正在生成智能评价...',
            successMessage: '智能评价生成完成',
            errorMessage: '生成智能评价失败',
            onSuccess: (data) => {
              const evaluationContent = data.evaluation;

              // 更新文件评价
              updateFile(file.name, { evaluation: evaluationContent });
            },
          });

          return result;
        } catch (error) {
          console.error('Evaluation generation failed:', error);
          throw error;
        }
      }
    },
    [updateFile, evaluationAPI, evaluationStreamAPI]
  );

  /**
   * 检查文件是否可以进行AI操作
   * @param {Object} file - 文件对象
   * @returns {boolean} 是否可以进行AI操作
   */
  const canPerformAIOperations = useCallback((file) => {
    return file && file.transcription && file.transcription.length > 0;
  }, []);

  /**
   * 获取AI功能状态
   * @returns {Object} AI功能状态信息
   */
  const getAIStatus = useCallback(() => {
    return {
      summaryLoading: summaryAPI.loading || summaryStreamAPI.streaming,
      detailedSummaryLoading: detailedSummaryAPI.loading || detailedSummaryStreamAPI.streaming,
      chatLoading: chatAPI.loading || chatStreamAPI.streaming,
      evaluationLoading: evaluationAPI.loading || evaluationStreamAPI.streaming,
      anyLoading: [
        summaryAPI.loading,
        detailedSummaryAPI.loading,
        chatAPI.loading,
        evaluationAPI.loading,
        summaryStreamAPI.streaming,
        detailedSummaryStreamAPI.streaming,
        chatStreamAPI.streaming,
        evaluationStreamAPI.streaming,
      ].some(Boolean),
    };
  }, [
    summaryAPI.loading,
    detailedSummaryAPI.loading,
    chatAPI.loading,
    evaluationAPI.loading,
    summaryStreamAPI.streaming,
    detailedSummaryStreamAPI.streaming,
    chatStreamAPI.streaming,
    evaluationStreamAPI.streaming,
  ]);

  return {
    // AI功能方法
    generateSummaryContent,
    generateMindmap,
    sendMessage,
    generateEvaluation,

    // 工具方法
    canPerformAIOperations,
    getAIStatus,

    // 流式API控制
    summaryStreamAPI,
    detailedSummaryStreamAPI,
    chatStreamAPI,
    evaluationStreamAPI,
  };
};

export default useAIFeatures;
