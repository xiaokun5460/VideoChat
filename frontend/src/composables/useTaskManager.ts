/**
 * 全局任务管理组合式函数
 * 提供任务创建、监控、取消等功能
 */

import { ref, computed } from 'vue'
import { useMessage } from 'naive-ui'
import { apiClient } from '@/services/api'

// 任务状态枚举
export enum TaskStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing', 
  PROCESSING = 'processing',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// 任务类型枚举
export enum TaskType {
  UPLOAD = 'upload',
  TRANSCRIPTION = 'transcription',
  AI_PROCESSING = 'ai_processing',
  DOWNLOAD = 'download',
  EXPORT = 'export'
}

// 任务信息接口
export interface TaskInfo {
  task_id: string
  task_type: TaskType
  status: TaskStatus
  progress: number
  current_step: string
  total_steps: number
  current_step_index: number
  speed: string
  eta: string
  file_name: string
  file_size: number
  processed_size: number
  created_at: number
  updated_at: number
  completed_at?: number
  error_message?: string
  metadata?: Record<string, any>
}

export const useTaskManager = () => {
  const message = useMessage()
  
  // 状态
  const activeTasks = ref<TaskInfo[]>([])
  const isPolling = ref(false)
  const pollInterval = ref<number | null>(null)

  // 计算属性
  const hasActiveTasks = computed(() => activeTasks.value.length > 0)
  const hasRunningTasks = computed(() => 
    activeTasks.value.some(task => 
      [TaskStatus.PROCESSING, TaskStatus.INITIALIZING].includes(task.status)
    )
  )
  const tasksByType = computed(() => {
    const grouped: Record<TaskType, TaskInfo[]> = {} as any
    activeTasks.value.forEach(task => {
      if (!grouped[task.task_type]) {
        grouped[task.task_type] = []
      }
      grouped[task.task_type].push(task)
    })
    return grouped
  })

  /**
   * 获取所有活跃任务
   */
  const fetchActiveTasks = async (): Promise<TaskInfo[]> => {
    try {
      const response = await apiClient.get('/progress/active')
      if (response.data.success) {
        const tasks = response.data.data.tasks || []
        activeTasks.value = tasks
        return tasks
      }
      return []
    } catch (error) {
      console.error('获取活跃任务失败:', error)
      return []
    }
  }

  /**
   * 获取单个任务详情
   */
  const getTaskDetail = async (taskId: string): Promise<TaskInfo | null> => {
    try {
      const response = await apiClient.get(`/progress/${taskId}`)
      if (response.data.success) {
        return response.data.data
      }
      return null
    } catch (error) {
      console.error('获取任务详情失败:', error)
      return null
    }
  }

  /**
   * 取消任务
   */
  const cancelTask = async (taskId: string): Promise<boolean> => {
    try {
      const response = await apiClient.post(`/progress/${taskId}/cancel`)
      if (response.data.success) {
        message.success('任务已取消')
        await fetchActiveTasks()
        return true
      }
      return false
    } catch (error) {
      console.error('取消任务失败:', error)
      message.error('取消任务失败')
      return false
    }
  }

  /**
   * 开始轮询任务状态
   */
  const startPolling = (intervalMs: number = 2000) => {
    if (isPolling.value) return

    isPolling.value = true
    pollInterval.value = window.setInterval(async () => {
      await fetchActiveTasks()
      
      // 如果没有活跃任务，停止轮询
      if (activeTasks.value.length === 0) {
        stopPolling()
      }
    }, intervalMs)
  }

  /**
   * 停止轮询
   */
  const stopPolling = () => {
    if (pollInterval.value) {
      clearInterval(pollInterval.value)
      pollInterval.value = null
    }
    isPolling.value = false
  }

  /**
   * 监听单个任务的流式进度更新
   */
  const watchTaskProgress = (taskId: string, onUpdate: (task: TaskInfo) => void) => {
    const eventSource = new EventSource(`/api/progress/${taskId}/stream`)
    
    eventSource.onmessage = (event) => {
      try {
        const taskData = JSON.parse(event.data)
        onUpdate(taskData)
        
        // 更新本地任务列表
        const index = activeTasks.value.findIndex(t => t.task_id === taskId)
        if (index !== -1) {
          activeTasks.value[index] = taskData
        }
      } catch (error) {
        console.error('解析任务进度数据失败:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('任务进度流连接错误:', error)
      eventSource.close()
    }

    return eventSource
  }

  /**
   * 根据任务类型获取任务图标
   */
  const getTaskIcon = (taskType: TaskType): string => {
    const icons = {
      [TaskType.UPLOAD]: '📤',
      [TaskType.TRANSCRIPTION]: '🎤',
      [TaskType.AI_PROCESSING]: '🤖',
      [TaskType.DOWNLOAD]: '📥',
      [TaskType.EXPORT]: '📋'
    }
    return icons[taskType] || '📄'
  }

  /**
   * 根据任务类型获取任务标题
   */
  const getTaskTitle = (taskType: TaskType): string => {
    const titles = {
      [TaskType.UPLOAD]: '文件上传',
      [TaskType.TRANSCRIPTION]: '语音转录',
      [TaskType.AI_PROCESSING]: 'AI处理',
      [TaskType.DOWNLOAD]: '视频下载',
      [TaskType.EXPORT]: '数据导出'
    }
    return titles[taskType] || '未知任务'
  }

  /**
   * 检查任务是否可以取消
   */
  const canCancelTask = (task: TaskInfo): boolean => {
    return [
      TaskStatus.PENDING,
      TaskStatus.INITIALIZING,
      TaskStatus.PROCESSING
    ].includes(task.status)
  }

  /**
   * 格式化任务进度文本
   */
  const formatProgress = (task: TaskInfo): string => {
    return `${Math.round(task.progress)}%`
  }

  /**
   * 格式化任务速度
   */
  const formatSpeed = (speed: string): string => {
    if (!speed || speed === '0 B/s') return ''
    return speed
  }

  /**
   * 格式化剩余时间
   */
  const formatETA = (eta: string): string => {
    if (!eta || eta === 'Unknown') return ''
    return `剩余: ${eta}`
  }

  /**
   * 获取任务状态的显示文本
   */
  const getStatusText = (status: TaskStatus): string => {
    const statusTexts = {
      [TaskStatus.PENDING]: '等待中',
      [TaskStatus.INITIALIZING]: '初始化',
      [TaskStatus.PROCESSING]: '处理中',
      [TaskStatus.PAUSED]: '已暂停',
      [TaskStatus.COMPLETED]: '已完成',
      [TaskStatus.FAILED]: '失败',
      [TaskStatus.CANCELLED]: '已取消'
    }
    return statusTexts[status] || '未知'
  }

  /**
   * 获取任务状态的颜色类
   */
  const getStatusColor = (status: TaskStatus): string => {
    const colors = {
      [TaskStatus.PENDING]: 'text-gray-500',
      [TaskStatus.INITIALIZING]: 'text-blue-500',
      [TaskStatus.PROCESSING]: 'text-blue-600',
      [TaskStatus.PAUSED]: 'text-yellow-500',
      [TaskStatus.COMPLETED]: 'text-green-500',
      [TaskStatus.FAILED]: 'text-red-500',
      [TaskStatus.CANCELLED]: 'text-gray-400'
    }
    return colors[status] || 'text-gray-500'
  }

  return {
    // 状态
    activeTasks,
    isPolling,
    
    // 计算属性
    hasActiveTasks,
    hasRunningTasks,
    tasksByType,
    
    // 方法
    fetchActiveTasks,
    getTaskDetail,
    cancelTask,
    startPolling,
    stopPolling,
    watchTaskProgress,
    
    // 工具方法
    getTaskIcon,
    getTaskTitle,
    canCancelTask,
    formatProgress,
    formatSpeed,
    formatETA,
    getStatusText,
    getStatusColor
  }
}
