<!--
  文件上传主组件
  支持拖拽上传、文件选择、分片上传、进度显示等功能
-->
<template>
  <div class="file-upload-container">
    <!-- 上传区域 -->
    <div
      class="upload-zone"
      :class="{
        'is-dragging': isDragging,
        'is-uploading': isUploading,
      }"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @click="triggerFileSelect"
    >
      <!-- 拖拽提示 -->
      <div class="upload-content">
        <div class="upload-icon">
          <span v-if="!isUploading">📁</span>
          <div v-else class="loading-spinner"></div>
        </div>

        <div class="upload-text">
          <h3 class="upload-title">
            {{ isDragging ? '释放文件开始上传' : '拖拽文件到此处或点击选择' }}
          </h3>
          <p class="upload-description">
            支持音频和视频文件，最大 {{ formatFileSize(MAX_FILE_SIZE) }}
          </p>
          <p class="upload-formats">支持格式：{{ SUPPORTED_TYPES.join(', ') }}</p>
        </div>

        <NButton
          v-if="!isDragging && !isUploading"
          type="primary"
          size="large"
          @click.stop="triggerFileSelect"
        >
          选择文件
        </NButton>
      </div>

      <!-- 全局上传进度 -->
      <div v-if="isUploading" class="global-progress">
        <div class="progress-info">
          <span class="progress-text">总体进度</span>
          <span class="progress-percentage">{{ totalProgress }}%</span>
        </div>
        <NProgress :percentage="totalProgress" :show-indicator="false" status="success" />
      </div>
    </div>

    <!-- 文件输入框 -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      :accept="acceptTypes"
      style="display: none"
      @change="handleFileSelect"
    />

    <!-- 上传队列 -->
    <div v-if="uploadList.length > 0" class="upload-queue">
      <div class="queue-header">
        <h4>上传队列 ({{ uploadList.length }})</h4>
        <div class="queue-actions">
          <NButton size="small" @click="pauseAllUploads" :disabled="!hasUploadingFiles">
            暂停全部
          </NButton>
          <NButton size="small" @click="resumeAllUploads" :disabled="!hasPausedFiles">
            继续全部
          </NButton>
          <NButton size="small" type="error" @click="clearCompletedUploads"> 清除已完成 </NButton>
        </div>
      </div>

      <div class="upload-list">
        <UploadProgress
          v-for="upload in uploadList"
          :key="upload.fileId"
          :upload-state="upload"
          @pause="pauseUpload"
          @resume="resumeUpload"
          @cancel="cancelUpload"
          @retry="retryUpload"
        />
      </div>
    </div>

    <!-- 上传统计 -->
    <div v-if="uploadStats.totalFiles > 0" class="upload-stats">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">总文件</span>
          <span class="stat-value">{{ uploadStats.totalFiles }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已完成</span>
          <span class="stat-value">{{ uploadStats.completedFiles }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">上传中</span>
          <span class="stat-value">{{ uploadStats.uploadingFiles }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总大小</span>
          <span class="stat-value">{{ formatFileSize(uploadStats.totalSize) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NProgress, useMessage } from 'naive-ui'
import { useFileUpload } from '@/composables/useFileUpload'
import UploadProgress from './UploadProgress.vue'

// 使用文件上传组合式函数
const {
  uploadStates,
  isDragging,
  isUploading,
  totalProgress,
  startUpload,
  pauseUpload,
  resumeUpload,
  cancelUpload,
  retryUpload,
  formatFileSize,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop,
  SUPPORTED_TYPES,
  MAX_FILE_SIZE,
} = useFileUpload()

const message = useMessage()
const fileInputRef = ref<HTMLInputElement>()

// 计算属性
const acceptTypes = computed(() => {
  return SUPPORTED_TYPES.map((type) => type.replace('.', '')).join(',')
})

const uploadList = computed(() => {
  return Array.from(uploadStates.value.values()).sort((a, b) => {
    // 按状态排序：上传中 > 暂停 > 等待 > 错误 > 完成
    const statusOrder = { uploading: 0, paused: 1, pending: 2, error: 3, completed: 4 }
    return statusOrder[a.status] - statusOrder[b.status]
  })
})

const hasUploadingFiles = computed(() => {
  return uploadList.value.some((upload) => upload.status === 'uploading')
})

const hasPausedFiles = computed(() => {
  return uploadList.value.some((upload) => upload.status === 'paused')
})

const uploadStats = computed(() => {
  const stats = {
    totalFiles: uploadList.value.length,
    completedFiles: 0,
    uploadingFiles: 0,
    errorFiles: 0,
    totalSize: 0,
  }

  uploadList.value.forEach((upload) => {
    stats.totalSize += upload.file.size

    switch (upload.status) {
      case 'completed':
        stats.completedFiles++
        break
      case 'uploading':
        stats.uploadingFiles++
        break
      case 'error':
        stats.errorFiles++
        break
    }
  })

  return stats
})

// 方法
const triggerFileSelect = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])

  for (const file of files) {
    try {
      await startUpload(file)
      message.success(`开始上传文件: ${file.name}`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '文件上传失败')
    }
  }

  // 清空input值，允许重复选择同一文件
  target.value = ''
}

const pauseAllUploads = () => {
  uploadList.value.forEach((upload) => {
    if (upload.status === 'uploading') {
      pauseUpload(upload.fileId)
    }
  })
  message.info('已暂停所有上传任务')
}

const resumeAllUploads = () => {
  uploadList.value.forEach((upload) => {
    if (upload.status === 'paused') {
      resumeUpload(upload.fileId)
    }
  })
  message.info('已恢复所有暂停的上传任务')
}

const clearCompletedUploads = () => {
  const completedUploads = uploadList.value.filter((upload) => upload.status === 'completed')
  completedUploads.forEach((upload) => {
    uploadStates.value.delete(upload.fileId)
  })
  message.success(`已清除 ${completedUploads.length} 个已完成的上传任务`)
}

// 阻止页面默认的拖拽行为
const preventDefaults = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
}

onMounted(() => {
  // 阻止整个页面的拖拽默认行为
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    document.addEventListener(eventName, preventDefaults, false)
  })
})

onUnmounted(() => {
  // 清理事件监听器
  ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    document.removeEventListener(eventName, preventDefaults, false)
  })
})
</script>

<style scoped>
.file-upload-container {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

/* 上传区域 */
.upload-zone {
  border: 2px dashed var(--color-neutral-300);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-8);
  text-align: center;
  cursor: pointer;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
}

[data-theme='dark'] .upload-zone {
  border-color: var(--color-neutral-600);
  background: rgba(17, 24, 39, 0.5);
}

.upload-zone:hover {
  border-color: var(--color-primary-aurora);
  background: rgba(16, 185, 129, 0.05);
  transform: translateY(-2px);
}

.upload-zone.is-dragging {
  border-color: var(--color-primary-aurora);
  background: rgba(16, 185, 129, 0.1);
  transform: scale(1.02);
  box-shadow: var(--shadow-glow);
}

.upload-zone.is-uploading {
  border-color: var(--color-secondary-quantum);
  background: rgba(139, 92, 246, 0.05);
}

/* 上传内容 */
.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.upload-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-2);
}

.loading-spinner {
  width: 64px;
  height: 64px;
  border: 4px solid rgba(16, 185, 129, 0.3);
  border-top: 4px solid var(--color-primary-aurora);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.upload-text {
  margin-bottom: var(--spacing-4);
}

.upload-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  color: var(--color-neutral-800);
}

[data-theme='dark'] .upload-title {
  color: var(--color-neutral-200);
}

.upload-description {
  font-size: 1rem;
  color: var(--color-neutral-600);
  margin-bottom: var(--spacing-1);
}

[data-theme='dark'] .upload-description {
  color: var(--color-neutral-400);
}

.upload-formats {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  font-family: var(--font-mono);
}

/* 全局进度 */
.global-progress {
  margin-top: var(--spacing-6);
  padding-top: var(--spacing-4);
  border-top: 1px solid var(--color-neutral-200);
}

[data-theme='dark'] .global-progress {
  border-top-color: var(--color-neutral-700);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.progress-text {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
}

[data-theme='dark'] .progress-text {
  color: var(--color-neutral-300);
}

.progress-percentage {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary-aurora);
}

/* 上传队列 */
.upload-queue {
  margin-top: var(--spacing-8);
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
  padding-bottom: var(--spacing-3);
  border-bottom: 1px solid var(--color-neutral-200);
}

[data-theme='dark'] .queue-header {
  border-bottom-color: var(--color-neutral-700);
}

.queue-header h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

[data-theme='dark'] .queue-header h4 {
  color: var(--color-neutral-200);
}

.queue-actions {
  display: flex;
  gap: var(--spacing-2);
}

.upload-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* 上传统计 */
.upload-stats {
  margin-top: var(--spacing-6);
  padding: var(--spacing-4);
  background: rgba(16, 185, 129, 0.05);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

[data-theme='dark'] .upload-stats {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-4);
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-neutral-600);
  margin-bottom: var(--spacing-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

[data-theme='dark'] .stat-label {
  color: var(--color-neutral-400);
}

.stat-value {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary-aurora);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-upload-container {
    padding: var(--spacing-4);
  }

  .upload-zone {
    padding: var(--spacing-6);
  }

  .upload-icon {
    font-size: 3rem;
  }

  .upload-title {
    font-size: 1.25rem;
  }

  .queue-header {
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: stretch;
  }

  .queue-actions {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .upload-zone {
    padding: var(--spacing-4);
  }

  .upload-title {
    font-size: 1.125rem;
  }

  .upload-description {
    font-size: 0.875rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
