<!--
  上传进度组件
  显示单个文件的上传进度、状态和操作按钮
-->
<template>
  <div class="upload-progress-item" :class="`status-${uploadState.status}`">
    <!-- 文件信息 -->
    <div class="file-info">
      <div class="file-icon">
        <span v-if="fileCategory === 'audio'">🎵</span>
        <span v-else-if="fileCategory === 'video'">🎬</span>
        <span v-else>📄</span>
      </div>
      
      <div class="file-details">
        <div class="file-name" :title="uploadState.file.name">
          {{ uploadState.file.name }}
        </div>
        <div class="file-meta">
          <span class="file-size">{{ formatFileSize(uploadState.file.size) }}</span>
          <span class="file-type">{{ getFileExtension(uploadState.file.name) }}</span>
          <span v-if="uploadState.speed > 0" class="upload-speed">
            {{ formatSpeed(uploadState.speed) }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 进度信息 -->
    <div class="progress-info">
      <!-- 状态指示器 -->
      <div class="status-indicator">
        <div v-if="uploadState.status === 'uploading'" class="status-uploading">
          <div class="spinner"></div>
          <span>上传中</span>
        </div>
        <div v-else-if="uploadState.status === 'completed'" class="status-completed">
          <span class="status-icon">✅</span>
          <span>已完成</span>
        </div>
        <div v-else-if="uploadState.status === 'paused'" class="status-paused">
          <span class="status-icon">⏸️</span>
          <span>已暂停</span>
        </div>
        <div v-else-if="uploadState.status === 'error'" class="status-error">
          <span class="status-icon">❌</span>
          <span>上传失败</span>
        </div>
        <div v-else class="status-pending">
          <span class="status-icon">⏳</span>
          <span>等待中</span>
        </div>
      </div>
      
      <!-- 进度百分比 -->
      <div class="progress-percentage">
        {{ uploadState.progress }}%
      </div>
    </div>
    
    <!-- 进度条 -->
    <div class="progress-bar-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${uploadState.progress}%` }"
          :class="`fill-${uploadState.status}`"
        ></div>
      </div>
      
      <!-- 分片进度指示器 -->
      <div v-if="showChunkProgress" class="chunk-progress">
        <div 
          v-for="(chunk, index) in chunkStatus" 
          :key="index"
          class="chunk-indicator"
          :class="chunk.status"
          :title="`分片 ${index + 1}: ${chunk.status}`"
        ></div>
      </div>
    </div>
    
    <!-- 错误信息 -->
    <div v-if="uploadState.error" class="error-message">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ uploadState.error }}</span>
    </div>
    
    <!-- 操作按钮 -->
    <div class="action-buttons">
      <!-- 暂停/继续按钮 -->
      <NButton
        v-if="uploadState.status === 'uploading'"
        size="small"
        @click="$emit('pause', uploadState.fileId)"
        title="暂停上传"
      >
        ⏸️
      </NButton>
      
      <NButton
        v-else-if="uploadState.status === 'paused'"
        size="small"
        type="primary"
        @click="$emit('resume', uploadState.fileId)"
        title="继续上传"
      >
        ▶️
      </NButton>
      
      <!-- 重试按钮 -->
      <NButton
        v-if="uploadState.status === 'error'"
        size="small"
        type="warning"
        @click="$emit('retry', uploadState.fileId)"
        title="重试上传"
      >
        🔄
      </NButton>
      
      <!-- 取消/删除按钮 -->
      <NButton
        v-if="uploadState.status !== 'completed'"
        size="small"
        type="error"
        @click="$emit('cancel', uploadState.fileId)"
        :title="uploadState.status === 'uploading' ? '取消上传' : '删除文件'"
      >
        🗑️
      </NButton>
      
      <!-- 查看文件按钮 -->
      <NButton
        v-if="uploadState.status === 'completed'"
        size="small"
        type="success"
        @click="viewFile"
        title="查看文件"
      >
        👁️
      </NButton>
    </div>
    
    <!-- 详细信息展开 -->
    <div v-if="showDetails" class="upload-details">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">文件ID:</span>
          <span class="detail-value">{{ uploadState.fileId }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">总分片:</span>
          <span class="detail-value">{{ uploadState.totalChunks }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">已上传:</span>
          <span class="detail-value">{{ uploadState.uploadedChunks.size }}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">上传速度:</span>
          <span class="detail-value">{{ formatSpeed(uploadState.speed) }}</span>
        </div>
        <div v-if="estimatedTime" class="detail-item">
          <span class="detail-label">预计剩余:</span>
          <span class="detail-value">{{ estimatedTime }}</span>
        </div>
      </div>
    </div>
    
    <!-- 展开/收起按钮 -->
    <div class="expand-button">
      <NButton
        size="tiny"
        text
        @click="showDetails = !showDetails"
      >
        {{ showDetails ? '收起' : '详情' }}
        <span class="expand-icon" :class="{ expanded: showDetails }">▼</span>
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton } from 'naive-ui'
import { useFileUpload } from '@/composables/useFileUpload'

// Props
interface Props {
  uploadState: {
    fileId: string
    file: File
    chunks: Blob[]
    uploadedChunks: Set<number>
    currentChunk: number
    totalChunks: number
    progress: number
    speed: number
    status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error'
    error?: string
    startTime?: number
    uploadedBytes: number
  }
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  pause: [fileId: string]
  resume: [fileId: string]
  cancel: [fileId: string]
  retry: [fileId: string]
}>()

// 使用文件上传组合式函数
const { formatFileSize, formatSpeed, getFileCategory } = useFileUpload()

// 响应式状态
const showDetails = ref(false)
const showChunkProgress = ref(false)

// 计算属性
const fileCategory = computed(() => getFileCategory(props.uploadState.file))

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || ''
}

const chunkStatus = computed(() => {
  const chunks = []
  for (let i = 0; i < props.uploadState.totalChunks; i++) {
    let status = 'pending'
    if (props.uploadState.uploadedChunks.has(i)) {
      status = 'completed'
    } else if (i === props.uploadState.currentChunk && props.uploadState.status === 'uploading') {
      status = 'uploading'
    }
    chunks.push({ status })
  }
  return chunks
})

const estimatedTime = computed(() => {
  if (props.uploadState.status !== 'uploading' || props.uploadState.speed === 0) {
    return null
  }
  
  const remainingBytes = props.uploadState.file.size - props.uploadState.uploadedBytes
  const remainingSeconds = remainingBytes / props.uploadState.speed
  
  if (remainingSeconds < 60) {
    return `${Math.round(remainingSeconds)}秒`
  } else if (remainingSeconds < 3600) {
    return `${Math.round(remainingSeconds / 60)}分钟`
  } else {
    return `${Math.round(remainingSeconds / 3600)}小时`
  }
})

// 方法
const viewFile = () => {
  // 这里可以实现查看文件的逻辑
  console.log('查看文件:', props.uploadState.fileId)
}
</script>

<style scoped>
.upload-progress-item {
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-neutral-200);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  position: relative;
}

[data-theme="dark"] .upload-progress-item {
  border-color: var(--color-neutral-700);
  background: rgba(17, 24, 39, 0.8);
}

.upload-progress-item:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-neumorphism-md);
}

/* 状态样式 */
.status-uploading {
  border-color: var(--color-secondary-quantum);
  background: rgba(139, 92, 246, 0.05);
}

.status-completed {
  border-color: var(--color-success);
  background: rgba(34, 197, 94, 0.05);
}

.status-error {
  border-color: var(--color-error);
  background: rgba(239, 68, 68, 0.05);
}

.status-paused {
  border-color: var(--color-warning);
  background: rgba(245, 158, 11, 0.05);
}

/* 文件信息 */
.file-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
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
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: var(--spacing-1);
}

[data-theme="dark"] .file-name {
  color: var(--color-neutral-200);
}

.file-meta {
  display: flex;
  gap: var(--spacing-2);
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.file-meta span {
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
}

[data-theme="dark"] .file-meta span {
  background: rgba(255, 255, 255, 0.05);
}

/* 进度信息 */
.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: 0.875rem;
  font-weight: 500;
}

.status-uploading {
  color: var(--color-secondary-quantum);
}

.status-completed {
  color: var(--color-success);
}

.status-error {
  color: var(--color-error);
}

.status-paused {
  color: var(--color-warning);
}

.status-pending {
  color: var(--color-neutral-500);
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top: 2px solid var(--color-secondary-quantum);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-aurora);
}

/* 进度条 */
.progress-bar-container {
  margin-bottom: var(--spacing-3);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-neutral-200);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

[data-theme="dark"] .progress-bar {
  background: var(--color-neutral-700);
}

.progress-fill {
  height: 100%;
  transition: width var(--duration-normal) var(--easing-ease-in-out);
  border-radius: var(--radius-sm);
}

.fill-uploading {
  background: var(--gradient-quantum);
}

.fill-completed {
  background: var(--color-success);
}

.fill-error {
  background: var(--color-error);
}

.fill-paused {
  background: var(--color-warning);
}

.fill-pending {
  background: var(--color-neutral-400);
}

/* 分片进度 */
.chunk-progress {
  display: flex;
  gap: 1px;
  margin-top: var(--spacing-2);
  flex-wrap: wrap;
}

.chunk-indicator {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-neutral-300);
}

.chunk-indicator.completed {
  background: var(--color-success);
}

.chunk-indicator.uploading {
  background: var(--color-secondary-quantum);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 错误信息 */
.error-message {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-3);
}

.error-text {
  font-size: 0.875rem;
  color: var(--color-error);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: var(--spacing-2);
  justify-content: flex-end;
  margin-bottom: var(--spacing-2);
}

/* 详细信息 */
.upload-details {
  margin-top: var(--spacing-3);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--color-neutral-200);
}

[data-theme="dark"] .upload-details {
  border-top-color: var(--color-neutral-700);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-2);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.detail-label {
  color: var(--color-neutral-500);
  font-weight: 500;
}

.detail-value {
  color: var(--color-neutral-700);
  font-family: var(--font-mono);
}

[data-theme="dark"] .detail-value {
  color: var(--color-neutral-300);
}

/* 展开按钮 */
.expand-button {
  text-align: center;
  margin-top: var(--spacing-2);
}

.expand-icon {
  margin-left: var(--spacing-1);
  transition: transform var(--duration-normal) var(--easing-ease-in-out);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }
  
  .file-icon {
    font-size: 1.5rem;
  }
  
  .progress-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
  }
  
  .action-buttons {
    justify-content: center;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>