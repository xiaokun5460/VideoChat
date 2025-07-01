<!--
  转录进度组件
  显示转录进度、状态和控制按钮
-->
<template>
  <div class="transcription-progress">
    <!-- 进度卡片 -->
    <div
      class="progress-card glass-effect"
      :class="[isDark ? 'glass-dark' : 'glass-light', `status-${status}`]"
    >
      <!-- 卡片头部 -->
      <div class="progress-header">
        <div class="file-info">
          <div class="file-icon">
            <span v-if="fileType === 'audio'">🎵</span>
            <span v-else-if="fileType === 'video'">🎬</span>
            <span v-else>📄</span>
          </div>
          <div class="file-details">
            <h4 class="file-name">{{ fileName }}</h4>
            <p class="file-meta">
              <span class="file-size">{{ formatFileSize(fileSize) }}</span>
              <span class="file-duration">{{ formatTime(duration) }}</span>
            </p>
          </div>
        </div>

        <div class="status-badge" :class="`badge-${status}`">
          <span class="status-icon">
            <span v-if="status === 'pending'">⏳</span>
            <span v-else-if="status === 'processing'">🔄</span>
            <span v-else-if="status === 'completed'">✅</span>
            <span v-else-if="status === 'error'">❌</span>
          </span>
          <span class="status-text">{{ statusText }}</span>
        </div>
      </div>

      <!-- 进度条 -->
      <div v-if="status === 'processing'" class="progress-section">
        <div class="progress-info">
          <span class="progress-label">转录进度</span>
          <span class="progress-percentage">{{ Math.round(progress) }}%</span>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>

        <div class="progress-details">
          <span class="progress-time">预计剩余: {{ estimatedTime }}</span>
          <span class="progress-speed">处理速度: {{ processingSpeed }}</span>
        </div>
      </div>

      <!-- 转录配置 -->
      <div v-if="showConfig" class="config-section">
        <h5 class="config-title">转录配置</h5>
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">语言:</span>
            <span class="config-value">{{ config.language || '自动检测' }}</span>
          </div>
          <div class="config-item">
            <span class="config-label">模型:</span>
            <span class="config-value">{{ config.model || 'Whisper Large v3' }}</span>
          </div>
          <div class="config-item">
            <span class="config-label">说话人识别:</span>
            <span class="config-value">{{
              config.enableSpeakerDiarization ? '开启' : '关闭'
            }}</span>
          </div>
          <div class="config-item">
            <span class="config-label">时间戳:</span>
            <span class="config-value">{{ config.enableTimestamps ? '开启' : '关闭' }}</span>
          </div>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="status === 'error' && errorMessage" class="error-section">
        <div class="error-content">
          <span class="error-icon">⚠️</span>
          <div class="error-details">
            <h5 class="error-title">转录失败</h5>
            <p class="error-message">{{ errorMessage }}</p>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <!-- 取消/停止按钮 -->
        <NButton v-if="status === 'processing'" size="small" type="error" @click="$emit('cancel')">
          停止转录
        </NButton>

        <!-- 重试按钮 -->
        <NButton v-if="status === 'error'" size="small" type="warning" @click="$emit('retry')">
          重新转录
        </NButton>

        <!-- 查看结果按钮 -->
        <NButton
          v-if="status === 'completed'"
          size="small"
          type="primary"
          @click="$emit('view-result')"
        >
          查看结果
        </NButton>

        <!-- 删除按钮 -->
        <NButton
          v-if="status !== 'processing'"
          size="small"
          type="error"
          ghost
          @click="$emit('delete')"
        >
          删除
        </NButton>

        <!-- 配置切换按钮 -->
        <NButton size="small" text @click="showConfig = !showConfig">
          {{ showConfig ? '隐藏配置' : '显示配置' }}
        </NButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'

// Props
interface Props {
  fileName: string
  fileSize: number
  fileType: 'audio' | 'video'
  duration: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  errorMessage?: string
  config: {
    language?: string
    model?: string
    enableSpeakerDiarization?: boolean
    enableTimestamps?: boolean
  }
  startTime?: Date | null
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  cancel: []
  retry: []
  'view-result': []
  delete: []
}>()

const { isDark } = useTheme()
const showConfig = ref(false)

// 计算属性
const statusText = computed(() => {
  switch (props.status) {
    case 'pending':
      return '等待转录'
    case 'processing':
      return '转录中'
    case 'completed':
      return '转录完成'
    case 'error':
      return '转录失败'
    default:
      return '未知状态'
  }
})

const estimatedTime = computed(() => {
  if (props.status !== 'processing' || props.progress === 0) {
    return '--'
  }

  const elapsed = props.startTime ? (Date.now() - props.startTime.getTime()) / 1000 : 0
  const remaining = (elapsed / props.progress) * (100 - props.progress)

  if (remaining < 60) {
    return `${Math.round(remaining)}秒`
  } else if (remaining < 3600) {
    return `${Math.round(remaining / 60)}分钟`
  } else {
    return `${Math.round(remaining / 3600)}小时`
  }
})

const processingSpeed = computed(() => {
  if (props.status !== 'processing' || !props.startTime) {
    return '--'
  }

  const elapsed = (Date.now() - props.startTime.getTime()) / 1000
  const processed = (props.progress / 100) * props.duration
  const speed = processed / elapsed

  return `${speed.toFixed(1)}x`
})

// 工具函数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}
</script>

<style scoped>
.transcription-progress {
  margin-bottom: var(--spacing-4);
}

/* 进度卡片 */
.progress-card {
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.progress-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-neumorphism-lg);
}

.progress-card.status-processing {
  border-color: rgba(139, 92, 246, 0.3);
  background: rgba(139, 92, 246, 0.05);
}

.progress-card.status-completed {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.05);
}

.progress-card.status-error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

/* 卡片头部 */
.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-4);
}

.file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
}

.file-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-1) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-theme='dark'] .file-name {
  color: var(--color-neutral-200);
}

.file-meta {
  display: flex;
  gap: var(--spacing-2);
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0;
}

.file-meta span {
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
}

[data-theme='dark'] .file-meta span {
  background: rgba(255, 255, 255, 0.05);
}

/* 状态徽章 */
.status-badge {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 500;
  flex-shrink: 0;
}

.badge-pending {
  background: rgba(107, 114, 128, 0.1);
  color: var(--color-neutral-600);
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.badge-processing {
  background: rgba(139, 92, 246, 0.1);
  color: var(--color-secondary-quantum);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.badge-completed {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.badge-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.status-icon {
  font-size: 1rem;
}

/* 进度条区域 */
.progress-section {
  margin-bottom: var(--spacing-4);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
}

[data-theme='dark'] .progress-label {
  color: var(--color-neutral-300);
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-secondary-quantum);
  font-family: var(--font-mono);
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: var(--spacing-2);
}

.progress-fill {
  height: 100%;
  background: var(--gradient-quantum);
  border-radius: var(--radius-sm);
  transition: width var(--duration-normal) var(--easing-ease-out);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  font-family: var(--font-mono);
}

/* 配置区域 */
.config-section {
  margin-bottom: var(--spacing-4);
  padding: var(--spacing-4);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .config-section {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}

.config-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-3) 0;
}

[data-theme='dark'] .config-title {
  color: var(--color-neutral-200);
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-2);
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.config-label {
  color: var(--color-neutral-600);
  font-weight: 500;
}

[data-theme='dark'] .config-label {
  color: var(--color-neutral-400);
}

.config-value {
  color: var(--color-neutral-800);
  font-weight: 600;
}

[data-theme='dark'] .config-value {
  color: var(--color-neutral-200);
}

/* 错误区域 */
.error-section {
  margin-bottom: var(--spacing-4);
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-lg);
}

.error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.error-details {
  flex: 1;
}

.error-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-error);
  margin: 0 0 var(--spacing-1) 0;
}

.error-message {
  font-size: 0.875rem;
  color: var(--color-error);
  margin: 0;
  line-height: 1.4;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: var(--spacing-2);
  justify-content: flex-end;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .progress-header {
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: stretch;
  }

  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .config-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    justify-content: center;
  }

  .progress-details {
    flex-direction: column;
    gap: var(--spacing-1);
  }
}
</style>
