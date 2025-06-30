/**
 * VideoChat API调用Hook (重构版)
 *
 * 这个文件现在作为向后兼容的接口，内部使用新的Hook架构
 * 建议新代码直接使用 useAPICall, useStreamAPI 等专门的Hook
 */

import { useAPICall as useAPICallNew } from './useAPICall';
import { useStreamAPI as useStreamAPINew } from './useStreamAPI';
import { useBatchAPI as useBatchAPINew } from './useBatchAPI';
import { useFileUpload as useFileUploadNew } from './useFileUpload';

/**
 * API调用状态Hook (向后兼容)
 * @deprecated 建议使用 useAPICall from './useAPICall'
 */
export function useAPICall() {
  return useAPICallNew();
}

/**
 * 流式API调用Hook (向后兼容)
 * @deprecated 建议使用 useStreamAPI from './useStreamAPI'
 */
export function useStreamAPI() {
  return useStreamAPINew();
}

/**
 * 批量API调用Hook (向后兼容)
 * @deprecated 建议使用 useBatchAPI from './useBatchAPI'
 */
export function useBatchAPI() {
  return useBatchAPINew();
}

/**
 * 文件上传Hook (向后兼容)
 * @deprecated 建议使用 useFileUpload from './useFileUpload'
 */
export function useFileUpload() {
  return useFileUploadNew();
}
