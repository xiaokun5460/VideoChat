<template>
  <div class="global-task-manager">
    <!-- 任务状态指示器 -->
    <div 
      v-if="activeTasks.length > 0" 
      class="task-indicator"
      @click="toggleTaskPanel"
    >
      <div class="task-count">{{ activeTasks.length }}</div>
      <div class="task-spinner" :class="{ spinning: hasRunningTasks }"></div>
    </div>

    <!-- 任务面板 -->
    <div 
      v-if="showTaskPanel" 
      class="task-panel"
      @click.stop
    >
      <div class="task-panel-header">
        <h3>任务进度</h3>
        <button @click="toggleTaskPanel" class="close-btn">×</button>
      </div>
      
      <div class="task-list">
        <div 
          v-for="task in activeTasks" 
          :key="task.task_id"
          class="task-item"
          :class="[`task-${task.status}`, `task-${task.task_type}`]"
        >
          <div class="task-header">
            <div class="task-icon">
              <component :is="getTaskIcon(task.task_type)" />
            </div>
            <div class="task-info">
              <div class="task-title">{{ getTaskTitle(task) }}</div>
              <div class="task-filename">{{ task.file_name || '未知文件' }}</div>
            </div>
            <div class="task-actions">
              <button 
                v-if="canCancelTask(task)"
                @click="cancelTask(task.task_id)"
                class="cancel-btn"
                title="取消任务"
              >
                ⏹
              </button>
            </div>
          </div>
          
          <div class="task-progress">
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: `${task.progress}%` }"
              ></div>
            </div>
            <div class="progress-text">{{ Math.round(task.progress) }}%</div>
          </div>
          
          <div class="task-details">
            <div class="task-step">{{ task.current_step }}</div>
            <div class="task-meta">
              <span v-if="task.speed && task.speed !== '0 B/s'">{{ task.speed }}</span>
              <span v-if="task.eta && task.eta !== 'Unknown'">剩余: {{ task.eta }}</span>
            </div>
          </div>
          
          <!-- 错误信息 -->
          <div v-if="task.status === 'failed' && task.error_message" class="task-error">
            {{ task.error_message }}
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="activeTasks.length === 0" class="empty-state">
          <div class="empty-icon">✓</div>
          <div class="empty-text">暂无活跃任务</div>
        </div>
      </div>
    </div>

    <!-- 背景遮罩 -->
    <div 
      v-if="showTaskPanel" 
      class="task-overlay"
      @click="toggleTaskPanel"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessage } from 'naive-ui'
import { apiClient } from '@/services/api'

// 组件状态
const showTaskPanel = ref(false)
const activeTasks = ref<any[]>([])
const message = useMessage()

// 轮询定时器
let pollTimer: number | null = null

// 计算属性
const hasRunningTasks = computed(() => 
  activeTasks.value.some(task => 
    ['processing', 'initializing'].includes(task.status)
  )
)

// 方法
const toggleTaskPanel = () => {
  showTaskPanel.value = !showTaskPanel.value
}

const getTaskIcon = (taskType: string) => {
  const icons = {
    upload: '📤',
    transcription: '🎤',
    ai_processing: '🤖',
    download: '📥',
    export: '📋'
  }
  return icons[taskType as keyof typeof icons] || '📄'
}

const getTaskTitle = (task: any) => {
  const titles = {
    upload: '文件上传',
    transcription: '语音转录',
    ai_processing: 'AI处理',
    download: '视频下载',
    export: '数据导出'
  }
  return titles[task.task_type as keyof typeof titles] || '未知任务'
}

const canCancelTask = (task: any) => {
  return ['pending', 'initializing', 'processing'].includes(task.status)
}

const cancelTask = async (taskId: string) => {
  try {
    await apiClient.post(`/tasks/progress/${taskId}/cancel`)
    message.success('任务已取消')
    await fetchActiveTasks()
  } catch (error) {
    console.error('取消任务失败:', error)
    message.error('取消任务失败')
  }
}

const fetchActiveTasks = async () => {
  try {
    const response = await apiClient.get('/tasks/progress/active')
    // API适配器已经提取了业务数据，直接使用
    activeTasks.value = response.tasks || []
  } catch (error) {
    console.error('获取活跃任务失败:', error)
  }
}

const startPolling = () => {
  if (pollTimer) return
  
  pollTimer = window.setInterval(async () => {
    await fetchActiveTasks()
  }, 2000) // 每2秒轮询一次
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 生命周期
onMounted(() => {
  fetchActiveTasks()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

// 暴露方法给父组件
defineExpose({
  refreshTasks: fetchActiveTasks,
  showPanel: () => { showTaskPanel.value = true }
})
</script>

<style scoped>
.global-task-manager {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 9999;
}

.task-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.task-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.task-count {
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.task-spinner {
  position: absolute;
  width: 70px;
  height: 70px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid white;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.task-spinner.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.task-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: auto;
}

.task-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500px;
  max-height: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  overflow: hidden;
}

.task-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.task-panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.task-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 20px;
}

.task-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-left: 4px solid #ddd;
  transition: all 0.2s;
}

.task-item.task-processing {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.task-item.task-completed {
  border-left-color: #10b981;
  background: #f0fdf4;
}

.task-item.task-failed {
  border-left-color: #ef4444;
  background: #fef2f2;
}

.task-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.task-icon {
  font-size: 20px;
  margin-right: 12px;
}

.task-info {
  flex: 1;
}

.task-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.task-filename {
  font-size: 12px;
  color: #6b7280;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.cancel-btn {
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.cancel-btn:hover {
  background: #dc2626;
}

.task-progress {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-right: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  min-width: 35px;
}

.task-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-step {
  font-size: 13px;
  color: #4b5563;
}

.task-meta {
  font-size: 11px;
  color: #9ca3af;
  display: flex;
  gap: 12px;
}

.task-error {
  margin-top: 8px;
  padding: 8px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  font-size: 12px;
  color: #dc2626;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
}
</style>
