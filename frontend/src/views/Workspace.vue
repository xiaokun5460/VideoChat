<!--
  工作台视图 - 文件管理和功能集成的统一工作空间
  提供文件管理、快速操作、项目概览等功能
-->
<template>
  <div class="workspace">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">工作台</h1>
      <p class="page-description">统一的文件管理和功能操作中心</p>
    </div>

    <!-- 快速操作栏 -->
    <div class="quick-actions">
      <div class="action-group">
        <h3 class="group-title">快速开始</h3>
        <div class="action-buttons">
          <NButton type="primary" size="large" @click="$router.push('/upload')">
            <template #icon>
              <span>📁</span>
            </template>
            上传文件
          </NButton>
          <NButton size="large" @click="$router.push('/transcription')">
            <template #icon>
              <span>🎤</span>
            </template>
            开始转录
          </NButton>
          <NButton size="large" @click="$router.push('/ai-features')">
            <template #icon>
              <span>🤖</span>
            </template>
            AI分析
          </NButton>
          <NButton size="large" @click="$router.push('/export')">
            <template #icon>
              <span>📤</span>
            </template>
            导出数据
          </NButton>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="workspace-content">
      <!-- 左侧：文件管理 -->
      <div class="file-management">
        <div class="section-header">
          <h3 class="section-title">文件管理</h3>
          <div class="section-actions">
            <NButton size="small" @click="refreshFiles">
              <template #icon>
                <span>🔄</span>
              </template>
              刷新
            </NButton>
            <NButton size="small" @click="showUploadModal = true">
              <template #icon>
                <span>➕</span>
              </template>
              添加
            </NButton>
          </div>
        </div>

        <!-- 文件列表 -->
        <div class="file-list">
          <div v-if="files.length === 0" class="empty-state">
            <div class="empty-icon">📂</div>
            <h4 class="empty-title">暂无文件</h4>
            <p class="empty-description">上传您的第一个文件开始使用</p>
            <NButton type="primary" @click="$router.push('/upload')"> 立即上传 </NButton>
          </div>

          <div v-else class="file-items">
            <div
              v-for="file in files"
              :key="file.id"
              class="file-item"
              @click="selectFile(file)"
              :class="{ active: selectedFile?.id === file.id }"
            >
              <div class="file-icon">{{ getFileIcon(file.type) }}</div>
              <div class="file-info">
                <div class="file-name">{{ file.name }}</div>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  <span class="file-date">{{ formatDate(file.createdAt) }}</span>
                </div>
              </div>
              <div class="file-status">
                <span class="status-badge" :class="file.status">
                  {{ getStatusText(file.status) }}
                </span>
              </div>
              <div class="file-actions">
                <NButton size="small" @click.stop="downloadFile(file)">
                  <span>⬇️</span>
                </NButton>
                <NButton size="small" @click.stop="deleteFile(file)">
                  <span>🗑️</span>
                </NButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：操作面板 -->
      <div class="operation-panel">
        <!-- 文件详情 -->
        <div v-if="selectedFile" class="file-details">
          <div class="section-header">
            <h3 class="section-title">文件详情</h3>
          </div>

          <div class="detail-content">
            <div class="detail-preview">
              <div class="preview-icon">{{ getFileIcon(selectedFile.type) }}</div>
              <div class="preview-info">
                <h4 class="preview-title">{{ selectedFile.name }}</h4>
                <p class="preview-meta">
                  {{ formatFileSize(selectedFile.size) }} •
                  {{ formatDate(selectedFile.uploadTime) }}
                </p>
              </div>
            </div>

            <div class="detail-stats">
              <div class="stat-item">
                <span class="stat-label">文件类型</span>
                <span class="stat-value">{{ selectedFile.type }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">处理状态</span>
                <span class="stat-value">{{ getStatusText(selectedFile.status) }}</span>
              </div>
              <div v-if="selectedFile.duration" class="stat-item">
                <span class="stat-label">时长</span>
                <span class="stat-value">{{ formatDuration(selectedFile.duration) }}</span>
              </div>
            </div>

            <div class="detail-actions">
              <NButton
                type="primary"
                block
                @click="processFile(selectedFile)"
                :disabled="selectedFile.status === 'processing'"
              >
                <template #icon>
                  <span>⚙️</span>
                </template>
                {{ selectedFile.status === 'processed' ? '重新处理' : '开始处理' }}
              </NButton>

              <div class="action-grid">
                <NButton @click="transcribeFile(selectedFile)">
                  <template #icon>
                    <span>🎤</span>
                  </template>
                  转录
                </NButton>
                <NButton @click="analyzeFile(selectedFile)">
                  <template #icon>
                    <span>🧠</span>
                  </template>
                  AI分析
                </NButton>
                <NButton @click="exportFile(selectedFile)">
                  <template #icon>
                    <span>📤</span>
                  </template>
                  导出
                </NButton>
                <NButton @click="shareFile(selectedFile)">
                  <template #icon>
                    <span>🔗</span>
                  </template>
                  分享
                </NButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="operation-empty">
          <div class="empty-icon">👆</div>
          <h4 class="empty-title">选择文件</h4>
          <p class="empty-description">从左侧文件列表中选择一个文件查看详情和执行操作</p>
        </div>

        <!-- 最近活动 -->
        <div class="recent-activity">
          <div class="section-header">
            <h3 class="section-title">最近活动</h3>
          </div>

          <div class="activity-list">
            <div v-for="activity in recentActivities" :key="activity.id" class="activity-item">
              <div class="activity-icon">{{ activity.icon }}</div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-time">{{ formatDate(activity.time) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传模态框 -->
    <NModal v-model:show="showUploadModal" preset="card" title="上传文件" style="width: 600px">
      <div class="upload-modal">
        <p>点击下方按钮跳转到上传页面</p>
        <NButton type="primary" block @click="goToUpload"> 前往上传页面 </NButton>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NModal, useMessage } from 'naive-ui'
import { useRouter } from 'vue-router'
import { useFilesStore } from '@/stores/files'

const router = useRouter()
const message = useMessage()
const filesStore = useFilesStore()

// 响应式状态
const selectedFile = ref<any>(null)
const showUploadModal = ref(false)

// 计算属性 - 使用真实的文件数据
const files = computed(() => Array.from(filesStore.files.values()))
const recentActivities = ref([
  { id: 1, icon: '📁', title: '上传了新文件 demo.mp4', time: new Date() },
  { id: 2, icon: '🎤', title: '完成转录 meeting.wav', time: new Date(Date.now() - 3600000) },
  { id: 3, icon: '🧠', title: 'AI分析完成 presentation.mp3', time: new Date(Date.now() - 7200000) },
  { id: 4, icon: '📤', title: '导出数据 report.json', time: new Date(Date.now() - 10800000) },
])

// 方法
const refreshFiles = () => {
  message.info('文件列表已刷新')
}

const selectFile = (file: any) => {
  selectedFile.value = file
}

const getFileIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    video: '🎬',
    audio: '🎵',
    document: '📄',
    image: '🖼️',
  }
  return iconMap[type] || '📄'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    uploaded: '已上传',
    processing: '处理中',
    processed: '已处理',
    error: '错误',
  }
  return statusMap[status] || '未知'
}

const downloadFile = (file: any) => {
  if (file.url) {
    // 创建下载链接
    const link = document.createElement('a')
    link.href = file.url
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    message.success(`开始下载: ${file.name}`)
  } else {
    message.error('文件下载链接不可用')
  }
}

const deleteFile = async (file: any) => {
  try {
    await filesStore.deleteFile(file.id)
    message.success(`已删除文件: ${file.name}`)
  } catch (error) {
    message.error(`删除文件失败: ${file.name}`)
    console.error('删除文件失败:', error)
  }
}

const processFile = (file: any) => {
  // 根据文件类型选择处理方式
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
    transcribeFile(file)
  } else {
    message.info('该文件类型暂不支持处理')
  }
}

const transcribeFile = (file: any) => {
  // 设置当前文件并跳转到转录页面
  filesStore.setCurrentFile(file.id)
  router.push('/transcription')
}

const analyzeFile = (file: any) => {
  // 检查是否有转录结果
  if (file.transcription && file.transcription.segments.length > 0) {
    filesStore.setCurrentFile(file.id)
    router.push('/ai-features')
  } else {
    message.warning('请先完成文件转录，然后再进行AI分析')
  }
}

const exportFile = (file: any) => {
  // 检查是否有转录结果
  if (file.transcription && file.transcription.segments.length > 0) {
    filesStore.setCurrentFile(file.id)
    router.push('/export')
  } else {
    message.warning('请先完成文件转录，然后再进行导出')
  }
}

const shareFile = (file: any) => {
  message.info(`分享文件: ${file.name}`)
}

const goToUpload = () => {
  showUploadModal.value = false
  router.push('/upload')
}

// 生命周期
onMounted(() => {
  // 文件数据已经在store中管理，无需额外加载
  console.log('Workspace页面已加载，当前文件数量:', files.value.length)
})
</script>

<style scoped>
.workspace {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-2);
  font-family: var(--font-display);
}

.page-description {
  font-size: 1.125rem;
  color: var(--color-neutral-600);
  margin: 0;
}

[data-theme='dark'] .page-description {
  color: var(--color-neutral-400);
}

/* 快速操作栏 */
.quick-actions {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .quick-actions {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.action-group {
  text-align: center;
}

.group-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-4) 0;
}

[data-theme='dark'] .group-title {
  color: var(--color-neutral-200);
}

.action-buttons {
  display: flex;
  gap: var(--spacing-4);
  justify-content: center;
  flex-wrap: wrap;
}

/* 主要内容区域 */
.workspace-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: var(--spacing-8);
  align-items: start;
}

/* 文件管理区域 */
.file-management {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .file-management {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

[data-theme='dark'] .section-title {
  color: var(--color-neutral-200);
}

.section-actions {
  display: flex;
  gap: var(--spacing-2);
}

/* 文件列表 */
.file-list {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-12);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-4);
  opacity: 0.6;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .empty-title {
  color: var(--color-neutral-300);
}

.empty-description {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0 0 var(--spacing-4) 0;
}

.file-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-ease-out);
}

[data-theme='dark'] .file-item {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.file-item:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
  transform: translateY(-1px);
}

.file-item.active {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.file-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin-bottom: var(--spacing-1);
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
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.file-status {
  flex-shrink: 0;
}

.status-badge {
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.uploaded {
  background: rgba(59, 130, 246, 0.1);
  color: rgba(59, 130, 246, 1);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.status-badge.processing {
  background: rgba(245, 158, 11, 0.1);
  color: rgba(245, 158, 11, 1);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.status-badge.processed {
  background: rgba(34, 197, 94, 0.1);
  color: rgba(34, 197, 94, 1);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.status-badge.error {
  background: rgba(239, 68, 68, 0.1);
  color: rgba(239, 68, 68, 1);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.file-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

/* 操作面板 */
.operation-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.file-details,
.recent-activity {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .file-details,
[data-theme='dark'] .recent-activity {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.operation-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-8);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme='dark'] .operation-empty {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

/* 文件详情 */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.detail-preview {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-lg);
}

.preview-icon {
  font-size: 2.5rem;
}

.preview-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-1) 0;
}

[data-theme='dark'] .preview-title {
  color: var(--color-neutral-200);
}

.preview-meta {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0;
}

.detail-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .stat-item {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

[data-theme='dark'] .stat-label {
  color: var(--color-neutral-400);
}

.stat-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
}

[data-theme='dark'] .stat-value {
  color: var(--color-neutral-200);
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-2);
}

/* 最近活动 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  transition: all var(--duration-fast) var(--easing-ease-out);
}

[data-theme='dark'] .activity-item {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.activity-item:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
}

.activity-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  margin-bottom: var(--spacing-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-theme='dark'] .activity-title {
  color: var(--color-neutral-200);
}

.activity-time {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

/* 上传模态框 */
.upload-modal {
  text-align: center;
  padding: var(--spacing-4);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .workspace-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-6);
  }

  .operation-panel {
    order: -1;
  }
}

@media (max-width: 768px) {
  .workspace {
    padding: var(--spacing-4);
  }

  .action-buttons {
    flex-direction: column;
    align-items: center;
  }

  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .file-actions {
    align-self: flex-end;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
