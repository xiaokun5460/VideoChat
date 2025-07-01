<!--
  视频下载组件
  提供在线视频下载功能，支持YouTube、Bilibili等平台
-->
<template>
  <div class="video-download">
    <!-- 下载表单 -->
    <div class="download-form">
      <div class="form-header">
        <h3>在线视频下载</h3>
        <p class="form-description">支持YouTube、Bilibili等主流视频平台</p>
      </div>

      <div class="form-content">
        <div class="url-input">
          <NInput
            v-model:value="downloadUrl"
            type="textarea"
            placeholder="请输入视频URL，支持YouTube、Bilibili等平台..."
            :autosize="{ minRows: 2, maxRows: 4 }"
            :disabled="isDownloading"
          />
          <div class="platform-indicator">
            <span v-if="detectedPlatform" class="platform-tag">
              {{ getPlatformName(detectedPlatform) }}
            </span>
          </div>
        </div>

        <div class="filename-input">
          <NInput
            v-model:value="customFilename"
            placeholder="自定义文件名（可选）"
            :disabled="isDownloading"
          />
        </div>

        <div class="form-actions">
          <NButton
            type="primary"
            size="large"
            :loading="isDownloading"
            :disabled="!canDownload"
            @click="handleDownload"
          >
            <template #icon>
              <span>📥</span>
            </template>
            开始下载
          </NButton>

          <NButton v-if="hasActiveDownloads" @click="showDownloadList = true">
            下载管理 ({{ activeDownloads.length }})
          </NButton>
        </div>
      </div>
    </div>

    <!-- 下载列表 -->
    <div v-if="downloadList.length > 0" class="download-list">
      <div class="list-header">
        <h4>下载列表</h4>
        <div class="list-actions">
          <NButton size="small" @click="refreshDownloadList"> 🔄 刷新 </NButton>
          <NButton size="small" @click="clearCompletedDownloads"> 🗑️ 清理已完成 </NButton>
        </div>
      </div>

      <div class="download-items">
        <div
          v-for="download in displayedDownloads"
          :key="download.id"
          class="download-item"
          :class="download.status"
        >
          <div class="download-info">
            <div class="download-title">
              {{ download.filename || getUrlTitle(download.url) }}
            </div>
            <div class="download-url">{{ truncateUrl(download.url) }}</div>
            <div class="download-meta">
              <span class="status-badge" :class="download.status">
                {{ getStatusText(download.status) }}
              </span>
              <span v-if="download.status === 'downloading'" class="progress-text">
                {{ download.progress }}%
              </span>
            </div>
          </div>

          <div class="download-progress">
            <NProgress
              v-if="download.status === 'downloading' || download.status === 'pending'"
              type="line"
              :percentage="download.progress"
              :show-indicator="false"
              :status="download.status === 'pending' ? 'info' : 'success'"
            />
          </div>

          <div class="download-actions">
            <NButton
              v-if="download.status === 'downloading' || download.status === 'pending'"
              size="small"
              type="error"
              @click="cancelDownload(download.id)"
            >
              取消
            </NButton>

            <NButton
              v-if="download.status === 'error'"
              size="small"
              type="primary"
              @click="retryDownload(download.id)"
            >
              重试
            </NButton>

            <NButton
              v-if="download.status === 'completed'"
              size="small"
              type="success"
              @click="handleTranscribe(download)"
            >
              转录
            </NButton>

            <NButton size="small" @click="removeDownload(download.id)"> 删除 </NButton>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="downloadList.length > pageSize" class="pagination">
        <NPagination
          v-model:page="currentPage"
          :page-count="Math.ceil(downloadList.length / pageSize)"
          :page-size="pageSize"
          show-size-picker
          :page-sizes="[5, 10, 20]"
          @update:page-size="pageSize = $event"
        />
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="hasError" class="error-section">
      <NAlert type="error" :title="downloadError || '下载失败'">
        请检查URL是否正确或稍后重试
      </NAlert>
    </div>

    <!-- 下载管理弹窗 -->
    <NModal v-model:show="showDownloadList" preset="card" title="下载管理" style="width: 800px">
      <div class="download-manager">
        <div class="manager-stats">
          <div class="stat-item">
            <span class="stat-label">活跃下载</span>
            <span class="stat-value">{{ activeDownloads.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已完成</span>
            <span class="stat-value">{{ completedDownloads.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总计</span>
            <span class="stat-value">{{ downloadList.length }}</span>
          </div>
        </div>

        <div class="manager-actions">
          <NButton @click="clearDownloads">清空所有</NButton>
          <NButton type="primary" @click="showDownloadList = false">关闭</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { NInput, NButton, NProgress, NAlert, NModal, NPagination, useMessage } from 'naive-ui'
import { useVideoDownload } from '@/composables/useVideoDownload'
import { useRouter } from 'vue-router'
import type { VideoDownloadProgress } from '@/types'

const router = useRouter()
const message = useMessage()
const {
  isDownloading,
  downloadError,
  downloadList,
  activeDownloads,
  completedDownloads,
  hasActiveDownloads,
  hasError,
  detectPlatform,
  validateUrl,
  startDownload,
  cancelDownload,
  removeDownload,
  clearDownloads,
  retryDownload,
  refreshDownloadList,
} = useVideoDownload()

// 响应式状态
const downloadUrl = ref('')
const customFilename = ref('')
const showDownloadList = ref(false)
const currentPage = ref(1)
const pageSize = ref(5)

// 计算属性
const detectedPlatform = computed(() => {
  if (!downloadUrl.value) return null
  return detectPlatform(downloadUrl.value)
})

const canDownload = computed(() => {
  return downloadUrl.value.trim() && validateUrl(downloadUrl.value) && !isDownloading.value
})

const displayedDownloads = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return downloadList.value.slice(start, end)
})

// 方法
const getPlatformName = (platform: string) => {
  const names = {
    youtube: 'YouTube',
    bilibili: 'Bilibili',
    other: '其他平台',
  }
  return names[platform as keyof typeof names] || '未知平台'
}

const getStatusText = (status: string) => {
  const texts = {
    pending: '等待中',
    downloading: '下载中',
    completed: '已完成',
    error: '失败',
  }
  return texts[status as keyof typeof texts] || '未知'
}

const getUrlTitle = (url: string) => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return '未知视频'
  }
}

const truncateUrl = (url: string, maxLength = 50) => {
  if (url.length <= maxLength) return url
  return url.substring(0, maxLength) + '...'
}

const handleDownload = async () => {
  const taskId = await startDownload({
    url: downloadUrl.value,
    platform: detectedPlatform.value || 'other',
  })

  if (taskId) {
    // 清空表单
    downloadUrl.value = ''
    customFilename.value = ''
  }
}

const handleTranscribe = (_download: VideoDownloadProgress) => {
  // 跳转到转录页面
  router.push('/transcription')
  message.info('请在转录页面选择已下载的文件进行转录')
}

const clearCompletedDownloads = () => {
  completedDownloads.value.forEach((download) => {
    if (download.status === 'completed') {
      removeDownload(download.id)
    }
  })
  message.success('已清理完成的下载')
}

// 生命周期
onMounted(() => {
  refreshDownloadList()
})

// 监听URL变化
watch(downloadUrl, (newUrl) => {
  if (newUrl && !validateUrl(newUrl)) {
    // URL格式不正确时的处理
  }
})
</script>

<style scoped>
.video-download {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

/* 下载表单 */
.download-form {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .download-form {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.form-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .form-header h3 {
  color: var(--color-neutral-200);
}

.form-description {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-4) 0;
}

[data-theme='dark'] .form-description {
  color: var(--color-neutral-400);
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.url-input {
  position: relative;
}

.platform-indicator {
  position: absolute;
  top: var(--spacing-2);
  right: var(--spacing-2);
}

.platform-tag {
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary-aurora);
}

.form-actions {
  display: flex;
  gap: var(--spacing-3);
  align-items: center;
}

/* 下载列表 */
.download-list {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .download-list {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.list-header h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

[data-theme='dark'] .list-header h4 {
  color: var(--color-neutral-200);
}

.list-actions {
  display: flex;
  gap: var(--spacing-2);
}

.download-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.download-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  transition: all var(--duration-fast) var(--easing-ease-out);
}

[data-theme='dark'] .download-item {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.download-item.downloading {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.05);
}

.download-item.completed {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.05);
}

.download-item.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.05);
}

.download-info {
  flex: 1;
  min-width: 0;
}

.download-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin-bottom: var(--spacing-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-theme='dark'] .download-title {
  color: var(--color-neutral-200);
}

.download-url {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin-bottom: var(--spacing-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.download-meta {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.status-badge {
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.pending {
  background: rgba(59, 130, 246, 0.1);
  color: rgba(59, 130, 246, 1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.status-badge.downloading {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-primary-aurora);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-badge.completed {
  background: rgba(34, 197, 94, 0.1);
  color: rgba(34, 197, 94, 1);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: rgba(239, 68, 68, 1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  font-family: var(--font-mono);
}

.download-progress {
  width: 120px;
  flex-shrink: 0;
}

.download-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-4);
}

/* 错误信息 */
.error-section {
  margin-top: var(--spacing-4);
}

/* 下载管理弹窗 */
.download-manager {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.manager-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-4);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-3);
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-lg);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin-bottom: var(--spacing-1);
}

[data-theme='dark'] .stat-label {
  color: var(--color-neutral-400);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-aurora);
}

.manager-actions {
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .download-item {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
  }

  .download-progress {
    width: 100%;
  }

  .download-actions {
    justify-content: center;
  }

  .manager-stats {
    grid-template-columns: 1fr;
  }

  .manager-actions {
    flex-direction: column;
  }
}
</style>
