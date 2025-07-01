/**
 * 系统管理相关API服务
 * 处理系统健康检查、监控、配置管理等API请求
 */

import { apiClient } from './api'

// 系统健康状态
export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  version: string
  checks: {
    database: {
      status: 'healthy' | 'unhealthy'
      responseTime: number
      details?: string
    }
    storage: {
      status: 'healthy' | 'unhealthy'
      freeSpace: number
      totalSpace: number
      usagePercent: number
    }
    memory: {
      status: 'healthy' | 'unhealthy'
      used: number
      total: number
      usagePercent: number
    }
    cpu: {
      status: 'healthy' | 'unhealthy'
      usage: number
      loadAverage: number[]
    }
  }
}

// 系统信息
export interface SystemInfo {
  name: string
  version: string
  description: string
  environment: 'development' | 'staging' | 'production'
  startTime: string
  uptime: number
  platform: string
  nodeVersion: string
  pythonVersion: string
  features: string[]
  modules: Record<string, string>
}

// 系统统计
export interface SystemStats {
  requests: {
    total: number
    successful: number
    failed: number
    averageResponseTime: number
    requestsPerMinute: number
  }
  files: {
    totalFiles: number
    totalSize: number
    uploadsToday: number
    storageUsed: number
    storageLimit: number
  }
  tasks: {
    totalTasks: number
    activeTasks: number
    completedTasks: number
    failedTasks: number
    averageProcessingTime: number
  }
  ai: {
    totalRequests: number
    summariesGenerated: number
    mindmapsCreated: number
    chatMessages: number
    tokensUsed: number
  }
  performance: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    networkIO: {
      bytesIn: number
      bytesOut: number
    }
  }
}

// 系统配置
export interface SystemConfig {
  app: {
    name: string
    version: string
    debug: boolean
    logLevel: string
  }
  server: {
    host: string
    port: number
    workers: number
    timeout: number
  }
  storage: {
    uploadPath: string
    maxFileSize: number
    allowedTypes: string[]
    retentionDays: number
  }
  ai: {
    provider: string
    model: string
    maxTokens: number
    temperature: number
  }
  database: {
    type: string
    host: string
    port: number
    name: string
  }
}

/**
 * 系统管理API服务类
 */
export class SystemAPI {
  /**
   * 系统健康检查 - 匹配后端 /api/system/health
   */
  static async getHealthStatus(): Promise<SystemHealthStatus> {
    return apiClient.get('/system/health')
  }

  /**
   * 获取系统信息 - 匹配后端 /api/system/info
   */
  static async getSystemInfo(): Promise<SystemInfo> {
    return apiClient.get('/system/info')
  }

  /**
   * 获取系统统计 - 匹配后端 /api/system/stats
   */
  static async getSystemStats(): Promise<SystemStats> {
    return apiClient.get('/system/stats')
  }

  /**
   * 获取系统配置 - 匹配后端 /api/system/config
   */
  static async getSystemConfig(): Promise<SystemConfig> {
    return apiClient.get('/system/config')
  }

  /**
   * 更新系统配置 - 匹配后端 /api/system/config
   */
  static async updateSystemConfig(config: Partial<SystemConfig>): Promise<{ success: boolean }> {
    return apiClient.put('/system/config', config)
  }

  /**
   * 获取系统日志
   */
  static async getSystemLogs(
    page = 1,
    pageSize = 100,
    level?: 'debug' | 'info' | 'warning' | 'error',
    module?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    logs: Array<{
      timestamp: string
      level: string
      module: string
      message: string
      metadata?: Record<string, any>
    }>
    total: number
    page: number
    pageSize: number
  }> {
    return apiClient.get('/system/logs', {
      params: { page, pageSize, level, module, dateFrom, dateTo }
    })
  }

  /**
   * 清理系统缓存
   */
  static async clearCache(cacheType?: 'all' | 'files' | 'ai' | 'database'): Promise<{
    success: boolean
    clearedItems: number
    freedSpace: number
  }> {
    return apiClient.post('/system/cache/clear', { type: cacheType || 'all' })
  }

  /**
   * 系统备份
   */
  static async createBackup(options?: {
    includeFiles?: boolean
    includeDatabase?: boolean
    includeConfig?: boolean
  }): Promise<{
    backupId: string
    status: 'started' | 'completed' | 'failed'
    size?: number
    downloadUrl?: string
  }> {
    return apiClient.post('/system/backup', options)
  }

  /**
   * 获取备份列表
   */
  static async getBackupList(): Promise<{
    backups: Array<{
      id: string
      createdAt: string
      size: number
      type: string
      status: 'completed' | 'failed'
      downloadUrl?: string
    }>
  }> {
    return apiClient.get('/system/backup')
  }

  /**
   * 系统维护模式
   */
  static async setMaintenanceMode(enabled: boolean, message?: string): Promise<{
    success: boolean
    maintenanceMode: boolean
    message?: string
  }> {
    return apiClient.post('/system/maintenance', { enabled, message })
  }

  /**
   * 获取系统维护状态
   */
  static async getMaintenanceStatus(): Promise<{
    maintenanceMode: boolean
    message?: string
    scheduledMaintenance?: {
      startTime: string
      endTime: string
      description: string
    }
  }> {
    return apiClient.get('/system/maintenance')
  }

  /**
   * 系统性能监控（实时数据）
   */
  static async getPerformanceMetrics(): Promise<{
    cpu: {
      usage: number
      cores: number
      loadAverage: number[]
    }
    memory: {
      used: number
      total: number
      available: number
      usagePercent: number
    }
    disk: {
      used: number
      total: number
      available: number
      usagePercent: number
    }
    network: {
      bytesIn: number
      bytesOut: number
      packetsIn: number
      packetsOut: number
    }
    processes: {
      total: number
      running: number
      sleeping: number
    }
  }> {
    return apiClient.get('/system/metrics')
  }

  /**
   * 重启系统服务
   */
  static async restartService(service: 'api' | 'worker' | 'scheduler' | 'all'): Promise<{
    success: boolean
    message: string
    restartedServices: string[]
  }> {
    return apiClient.post('/system/restart', { service })
  }

  /**
   * 获取API端点信息
   */
  static async getApiEndpoints(): Promise<{
    endpoints: Array<{
      path: string
      method: string
      description: string
      tags: string[]
      parameters?: Array<{
        name: string
        type: string
        required: boolean
        description: string
      }>
    }>
    totalEndpoints: number
    modules: string[]
  }> {
    return apiClient.get('/system/api/endpoints')
  }
}

// 导出默认实例
export const systemAPI = SystemAPI
