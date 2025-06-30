/**
 * 导出工具函数
 * 提供统一的文件导出功能
 */

import { downloadFile as downloadFileAPI } from '../services/api';

/**
 * 下载文件的通用方法
 * 从Blob对象创建下载链接并触发下载
 * @param {Blob} blob - 文件Blob对象
 * @param {string} filename - 文件名
 * @throws {Error} 当参数无效时抛出错误
 */
export const downloadFile = (blob, filename) => {
  // 参数验证
  if (!blob || !(blob instanceof Blob)) {
    throw new Error('Invalid blob parameter');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename parameter');
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * 从URL下载文件
 * 获取远程文件并触发下载
 * @param {string} url - 文件URL
 * @param {string} filename - 保存的文件名
 * @param {Object} options - 下载选项
 * @returns {Promise<void>} 下载完成的Promise
 * @throws {Error} 当下载失败时抛出错误
 */
export const downloadFromUrl = async (url, filename, options = {}) => {
  // 参数验证
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL parameter');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('Invalid filename parameter');
  }

  try {
    // 获取文件数据
    const blob = await downloadFileAPI(url, options);

    // 使用统一的下载函数
    downloadFile(blob, filename);
  } catch (error) {
    console.error('Download from URL failed:', error);
    throw new Error(`Failed to download file from ${url}: ${error.message}`);
  }
};

/**
 * 导出为Markdown文件
 * @param {string} content - Markdown内容
 * @param {string} filename - 文件名（不含扩展名）
 */
export const exportAsMarkdown = (content, filename) => {
  if (!content) {
    console.warn('No content to export');
    return;
  }

  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
  downloadFile(blob, finalFilename);
};

/**
 * 导出为文本文件
 * @param {string} content - 文本内容
 * @param {string} filename - 文件名（不含扩展名）
 */
export const exportAsText = (content, filename) => {
  if (!content) {
    console.warn('No content to export');
    return;
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const finalFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  downloadFile(blob, finalFilename);
};

/**
 * 导出为JSON文件
 * @param {Object} data - 要导出的数据对象
 * @param {string} filename - 文件名（不含扩展名）
 */
export const exportAsJSON = (data, filename) => {
  if (!data) {
    console.warn('No data to export');
    return;
  }

  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
  downloadFile(blob, finalFilename);
};

/**
 * 生成总结报告的Markdown内容
 * @param {Object} file - 文件对象
 * @returns {string} Markdown内容
 */
export const generateSummaryMarkdown = (file) => {
  if (!file) return '';

  const timestamp = new Date().toLocaleString();

  return `# ${file.name} - 智能总结

## 文件信息
- **文件名**: ${file.name}
- **生成时间**: ${timestamp}
- **文件大小**: ${file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '未知'}

## 简要总结
${file.summary || '暂无总结'}

## 详细总结
${file.detailedSummary || '暂无详细总结'}

---
*由 VideoChat AI 智能生成*
`;
};

/**
 * 生成评价报告的Markdown内容
 * @param {Object} file - 文件对象
 * @returns {string} Markdown内容
 */
export const generateEvaluationMarkdown = (file) => {
  if (!file || !file.evaluation) return '';

  const timestamp = new Date().toLocaleString();

  return `# 智能教学评价报告

## 课程信息
- **文件名**: ${file.name}
- **评价时间**: ${timestamp}
- **文件大小**: ${file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : '未知'}

## 评价内容

${file.evaluation}

---
*由 VideoChat AI 智能生成*
`;
};

/**
 * 生成对话记录的Markdown内容
 * @param {Array} messages - 消息数组
 * @param {Object} file - 文件对象
 * @returns {string} Markdown内容
 */
export const generateChatMarkdown = (messages, file) => {
  if (!messages || messages.length === 0) return '';

  const timestamp = new Date().toLocaleString();

  let content = `# AI对话记录

## 对话信息
- **文件名**: ${file?.name || '未知'}
- **导出时间**: ${timestamp}
- **消息数量**: ${messages.length}

## 对话内容

`;

  messages.forEach((message, index) => {
    const role = message.role === 'user' ? '👤 用户' : '🤖 AI助手';
    content += `### ${role} (${index + 1})

${message.content}

---

`;
  });

  content += `
*由 VideoChat AI 智能生成*
`;

  return content;
};

/**
 * 导出总结报告
 * @param {Object} file - 文件对象
 */
export const exportSummaryReport = (file) => {
  const content = generateSummaryMarkdown(file);
  const filename = `${file.name}-summary`;
  exportAsMarkdown(content, filename);
};

/**
 * 导出评价报告
 * @param {Object} file - 文件对象
 */
export const exportEvaluationReport = (file) => {
  const content = generateEvaluationMarkdown(file);
  const filename = `${file.name}_智能评价`;
  exportAsMarkdown(content, filename);
};

/**
 * 导出对话记录
 * @param {Array} messages - 消息数组
 * @param {Object} file - 文件对象
 */
export const exportChatHistory = (messages, file) => {
  const content = generateChatMarkdown(messages, file);
  const filename = `${file?.name || 'chat'}_对话记录`;
  exportAsMarkdown(content, filename);
};

export default {
  downloadFile,
  downloadFromUrl,
  exportAsMarkdown,
  exportAsText,
  exportAsJSON,
  generateSummaryMarkdown,
  generateEvaluationMarkdown,
  generateChatMarkdown,
  exportSummaryReport,
  exportEvaluationReport,
  exportChatHistory,
};
