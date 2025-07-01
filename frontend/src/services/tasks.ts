/**
 * 任务管理相关API服务
 * 处理异步任务的创建、监控、结果获取等API请求
 */

import { apiClient } from './api'
import type {
  TaskInfo,
  TaskCreateRequest,
  TaskListResponse,
  TaskStatus,
  TaskType,
  PaginatedData
} from '@/types'

/**
 * 任务管理API服务类
 */
export class TasksAPI {
  /**
   * 创建任务 - 匹配后端 /api/tasks
   */
  static async createTask(request: TaskCreateRequest): Promise<TaskInfo> {
    return apiClient.post('/tasks', request)
  }

  /**
   * 获取任务列表 - 匹配后端 /api/tasks
   */
  static async getTaskList(
    page = 1,
    pageSize = 20,
    filters?: {
      type?: TaskType
      status?: TaskStatus
      sortBy?: 'created_at' | 'updated_at' | 'type'
      sortOrder?: 'asc' | 'desc'
    }
  ): Promise<TaskListResponse> {
    return apiClient.get('/tasks', {
      params: { page, pageSize, ...filters }
    })
  }

  /**
   * 获取任务详情 - 匹配后端 /api/tasks/{id}
   */
  static async getTaskInfo(taskId: string): Promise<TaskInfo> {
    return apiClient.get(`/tasks/${taskId}`)
  }

  /**
   * 取消任务 - 匹配后端 /api/tasks/{id}/cancel
   */
  static async cancelTask(taskId: string): Promise<{ success: boolean }> {
    return apiClient.post(`/tasks/${taskId}/cancel`)
  }

  /**
   * 删除任务 - 匹配后端 /api/tasks/{id}
   */
  static async deleteTask(taskId: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/tasks/${taskId}`)
  }

  /**
   * 获取任务结果 - 匹配后端 /api/tasks/{id}/result
   */
  static async getTaskResult(taskId: string): Promise<any> {
    return apiClient.get(`/tasks/${taskId}/result`)
  }

  /**
   * 批量取消任务
   */
  static async cancelMultipleTasks(taskIds: string[]): Promise<{
    success: boolean
    cancelledCount: number
    errors: Array<{ taskId: string; error: string }>
  }> {
    return apiClient.post('/tasks/batch-cancel', { taskIds })
  }

  /**
   * 批量删除任务
   */
  static async deleteMultipleTasks(taskIds: string[]): Promise<{
    success: boolean
    deletedCount: number
    errors: Array<{ taskId: string; error: string }>
  }> {
    return apiClient.post('/tasks/batch-delete', { taskIds })
  }

  /**
   * 获取任务统计信息
   */
  static async getTaskStats(): Promise<{
    totalTasks: number
    runningTasks: number
    completedTasks: number
    failedTasks: number
    tasksByType: Record<TaskType, number>
    tasksByStatus: Record<TaskStatus, number>
    averageProcessingTime: number
    recentTasks: TaskInfo[]
  }> {
    return apiClient.get('/tasks/stats')
  }

  /**
   * 搜索任务
   */
  static async searchTasks(
    query: string,
    filters?: {
      type?: TaskType
      status?: TaskStatus
      dateFrom?: Date
      dateTo?: Date
    },
    page = 1,
    pageSize = 20
  ): Promise<{
    tasks: TaskInfo[]
    total: number
    page: number
    pageSize: number
    highlights: Array<{
      taskId: string
      matches: Array<{ field: string; value: string }>
    }>
  }> {
    return apiClient.get('/tasks/search', {
      params: { query, ...filters, page, pageSize }
    })
  }

  /**
   * 重试失败的任务
   */
  static async retryTask(taskId: string): Promise<TaskInfo> {
    return apiClient.post(`/tasks/${taskId}/retry`)
  }

  /**
   * 获取任务日志
   */
  static async getTaskLogs(
    taskId: string,
    page = 1,
    pageSize = 50
  ): Promise<{
    logs: Array<{
      timestamp: string
      level: 'info' | 'warning' | 'error' | 'debug'
      message: string
      metadata?: Record<string, any>
    }>
    total: number
    page: number
    pageSize: number
  }> {
    return apiClient.get(`/tasks/${taskId}/logs`, {
      params: { page, pageSize }
    })
  }

  /**
   * 实时监控任务进度（轮询方式）
   */
  static async monitorTaskProgress(
    taskId: string,
    onProgress: (task: TaskInfo) => void,
    onComplete: (task: TaskInfo) => void,
    onError: (error: string) => void,
    interval = 2000
  ): Promise<() => void> {
    let isMonitoring = true
    
    const poll = async () => {
      if (!isMonitoring) return
      
      try {
        const task = await this.getTaskInfo(taskId)
        onProgress(task)
        
        if (task.status === TaskStatus.COMPLETED) {
          isMonitoring = false
          onComplete(task)
        } else if (task.status === TaskStatus.FAILED || task.status === TaskStatus.CANCELLED) {
          isMonitoring = false
          onError(task.error || `任务${task.status}`)
        } else {
          setTimeout(poll, interval)
        }
      } catch (error) {
        isMonitoring = false
        onError(error instanceof Error ? error.message : '监控任务失败')
      }
    }
    
    poll()
    
    // 返回停止监控的函数
    return () => {
      isMonitoring = false
    }
  }

  /**
   * 获取任务类型配置
   */
  static async getTaskTypeConfig(): Promise<{
    types: Array<{
      type: TaskType
      name: string
      description: string
      estimatedDuration: number
      maxRetries: number
      supportedFormats?: string[]
    }>
  }> {
    return apiClient.get('/tasks/config/types')
  }

  /**
   * 获取系统任务配置
   */
  static async getTaskSystemConfig(): Promise<{
    maxConcurrentTasks: number
    defaultTimeout: number
    retryPolicy: {
      maxRetries: number
      backoffMultiplier: number
      initialDelay: number
    }
    cleanupPolicy: {
      completedTaskRetentionDays: number
      failedTaskRetentionDays: number
    }
  }> {
    return apiClient.get('/tasks/config/system')
  }
}

// 导出默认实例
export const tasksAPI = TasksAPI
