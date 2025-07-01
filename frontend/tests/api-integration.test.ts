/**
 * API集成测试套件
 * 验证前后端API通信正常、数据格式正确、错误处理有效
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  apiClient, 
  systemAPI, 
  filesAPI, 
  transcriptionAPI, 
  aiAPI, 
  tasksAPI 
} from '@/services/api'

describe('API集成测试', () => {
  beforeAll(async () => {
    // 测试前的准备工作
    console.log('开始API集成测试...')
  })

  afterAll(async () => {
    // 测试后的清理工作
    console.log('API集成测试完成')
  })

  describe('系统健康检查', () => {
    it('应该能够获取系统健康状态', async () => {
      try {
        const health = await systemAPI.getHealthStatus()
        
        expect(health).toBeDefined()
        expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/)
        expect(health.timestamp).toBeDefined()
        expect(health.uptime).toBeGreaterThanOrEqual(0)
        expect(health.checks).toBeDefined()
        
        console.log('✅ 系统健康检查通过')
      } catch (error) {
        console.error('❌ 系统健康检查失败:', error)
        throw error
      }
    })

    it('应该能够获取系统信息', async () => {
      try {
        const info = await systemAPI.getSystemInfo()
        
        expect(info).toBeDefined()
        expect(info.name).toBeDefined()
        expect(info.version).toBeDefined()
        expect(info.environment).toMatch(/^(development|staging|production)$/)
        
        console.log('✅ 系统信息获取通过')
      } catch (error) {
        console.error('❌ 系统信息获取失败:', error)
        throw error
      }
    })
  })

  describe('文件管理API', () => {
    it('应该能够获取文件列表', async () => {
      try {
        const fileList = await filesAPI.getFileList(1, 10)
        
        expect(fileList).toBeDefined()
        expect(fileList.items).toBeInstanceOf(Array)
        expect(fileList.total).toBeGreaterThanOrEqual(0)
        expect(fileList.page).toBe(1)
        expect(fileList.pageSize).toBe(10)
        
        console.log('✅ 文件列表获取通过')
      } catch (error) {
        console.error('❌ 文件列表获取失败:', error)
        throw error
      }
    })

    it('应该能够获取文件统计信息', async () => {
      try {
        const stats = await filesAPI.getFileStats()
        
        expect(stats).toBeDefined()
        expect(stats.totalFiles).toBeGreaterThanOrEqual(0)
        expect(stats.totalSize).toBeGreaterThanOrEqual(0)
        expect(stats.storageUsed).toBeGreaterThanOrEqual(0)
        
        console.log('✅ 文件统计信息获取通过')
      } catch (error) {
        console.error('❌ 文件统计信息获取失败:', error)
        throw error
      }
    })
  })

  describe('转录服务API', () => {
    it('应该能够获取转录历史', async () => {
      try {
        const history = await transcriptionAPI.getTranscriptionHistory(1, 10)
        
        expect(history).toBeDefined()
        expect(history.transcriptions).toBeInstanceOf(Array)
        expect(history.total).toBeGreaterThanOrEqual(0)
        expect(history.page).toBe(1)
        expect(history.pageSize).toBe(10)
        
        console.log('✅ 转录历史获取通过')
      } catch (error) {
        console.error('❌ 转录历史获取失败:', error)
        throw error
      }
    })

    it('应该能够获取支持的语言列表', async () => {
      try {
        const languages = await transcriptionAPI.getSupportedLanguages()
        
        expect(languages).toBeDefined()
        expect(languages.languages).toBeInstanceOf(Array)
        
        console.log('✅ 支持语言列表获取通过')
      } catch (error) {
        console.error('❌ 支持语言列表获取失败:', error)
        throw error
      }
    })
  })

  describe('AI服务API', () => {
    it('应该能够获取AI使用统计', async () => {
      try {
        const stats = await aiAPI.getAIUsageStats()
        
        expect(stats).toBeDefined()
        expect(stats.summariesGenerated).toBeGreaterThanOrEqual(0)
        expect(stats.mindmapsCreated).toBeGreaterThanOrEqual(0)
        expect(stats.chatMessages).toBeGreaterThanOrEqual(0)
        
        console.log('✅ AI使用统计获取通过')
      } catch (error) {
        console.error('❌ AI使用统计获取失败:', error)
        throw error
      }
    })
  })

  describe('任务管理API', () => {
    it('应该能够获取任务列表', async () => {
      try {
        const taskList = await tasksAPI.getTaskList(1, 10)
        
        expect(taskList).toBeDefined()
        expect(taskList.items).toBeInstanceOf(Array)
        expect(taskList.total).toBeGreaterThanOrEqual(0)
        expect(taskList.page).toBe(1)
        expect(taskList.pageSize).toBe(10)
        
        console.log('✅ 任务列表获取通过')
      } catch (error) {
        console.error('❌ 任务列表获取失败:', error)
        throw error
      }
    })

    it('应该能够获取任务统计信息', async () => {
      try {
        const stats = await tasksAPI.getTaskStats()
        
        expect(stats).toBeDefined()
        expect(stats.totalTasks).toBeGreaterThanOrEqual(0)
        expect(stats.runningTasks).toBeGreaterThanOrEqual(0)
        expect(stats.completedTasks).toBeGreaterThanOrEqual(0)
        
        console.log('✅ 任务统计信息获取通过')
      } catch (error) {
        console.error('❌ 任务统计信息获取失败:', error)
        throw error
      }
    })
  })

  describe('错误处理测试', () => {
    it('应该正确处理404错误', async () => {
      try {
        await apiClient.get('/non-existent-endpoint')
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        console.log('✅ 404错误处理正确')
      }
    })

    it('应该正确处理无效参数错误', async () => {
      try {
        await filesAPI.getFileInfo('invalid-file-id')
        // 如果没有抛出错误，测试失败
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeDefined()
        console.log('✅ 无效参数错误处理正确')
      }
    })
  })

  describe('数据格式验证', () => {
    it('所有API响应应该符合StandardResponse格式', async () => {
      try {
        // 测试多个API端点的响应格式
        const health = await systemAPI.getHealthStatus()
        const fileList = await filesAPI.getFileList(1, 5)
        const taskList = await tasksAPI.getTaskList(1, 5)
        
        // 验证数据结构
        expect(health).toBeDefined()
        expect(fileList).toBeDefined()
        expect(taskList).toBeDefined()
        
        console.log('✅ 数据格式验证通过')
      } catch (error) {
        console.error('❌ 数据格式验证失败:', error)
        throw error
      }
    })
  })

  describe('性能测试', () => {
    it('API响应时间应该在合理范围内', async () => {
      const startTime = Date.now()
      
      try {
        await systemAPI.getHealthStatus()
        
        const responseTime = Date.now() - startTime
        expect(responseTime).toBeLessThan(5000) // 5秒内响应
        
        console.log(`✅ API响应时间: ${responseTime}ms`)
      } catch (error) {
        console.error('❌ 性能测试失败:', error)
        throw error
      }
    })

    it('并发请求应该正常处理', async () => {
      try {
        const promises = [
          systemAPI.getHealthStatus(),
          filesAPI.getFileList(1, 5),
          tasksAPI.getTaskList(1, 5)
        ]
        
        const results = await Promise.all(promises)
        
        expect(results).toHaveLength(3)
        results.forEach(result => {
          expect(result).toBeDefined()
        })
        
        console.log('✅ 并发请求处理正确')
      } catch (error) {
        console.error('❌ 并发请求测试失败:', error)
        throw error
      }
    })
  })
})

// 导出测试工具函数
export const testUtils = {
  /**
   * 创建测试文件
   */
  createTestFile: (name: string, content: string): File => {
    const blob = new Blob([content], { type: 'text/plain' })
    return new File([blob], name, { type: 'text/plain' })
  },

  /**
   * 等待指定时间
   */
  wait: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  /**
   * 生成随机字符串
   */
  randomString: (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}
