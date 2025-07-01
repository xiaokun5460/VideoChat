<!--
  文件上传页面
  提供完整的文件上传功能，支持拖拽上传、分片上传、进度显示等
-->
<template>
  <div class="upload-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">文件上传</h1>
      <p class="page-description">上传音频或视频文件进行处理，支持大文件分片上传和断点续传</p>
    </div>

    <!-- 文件上传组件 -->
    <FileUpload />

    <!-- 上传帮助信息 -->
    <div class="upload-help">
      <h3>上传说明</h3>
      <div class="help-grid">
        <div class="help-item">
          <div class="help-icon">📁</div>
          <div class="help-content">
            <h4>支持格式</h4>
            <p>音频：MP3, WAV, M4A, AAC, FLAC, OGG</p>
            <p>视频：MP4, AVI, MOV, MKV, FLV, WebM, WMV</p>
          </div>
        </div>

        <div class="help-item">
          <div class="help-icon">📊</div>
          <div class="help-content">
            <h4>文件大小</h4>
            <p>单个文件最大支持 10GB</p>
            <p>支持分片上传和断点续传</p>
          </div>
        </div>

        <div class="help-item">
          <div class="help-icon">🚀</div>
          <div class="help-content">
            <h4>上传特性</h4>
            <p>拖拽上传、批量上传</p>
            <p>实时进度显示、暂停恢复</p>
          </div>
        </div>

        <div class="help-item">
          <div class="help-icon">🔒</div>
          <div class="help-content">
            <h4>安全保障</h4>
            <p>文件类型验证、大小检查</p>
            <p>安全的分片传输机制</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近上传的文件 -->
    <div v-if="recentFiles.length > 0" class="recent-files">
      <h3>最近上传</h3>
      <div class="files-grid">
        <div
          v-for="file in recentFiles"
          :key="file.id"
          class="file-card glass-effect"
          :class="isDark ? 'glass-dark' : 'glass-light'"
        >
          <div class="file-icon">
            <span v-if="file.type.startsWith('audio/')">🎵</span>
            <span v-else-if="file.type.startsWith('video/')">🎬</span>
            <span v-else>📄</span>
          </div>
          <div class="file-info">
            <div class="file-name" :title="file.name">{{ file.name }}</div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <span class="file-date">{{ formatDate(file.createdAt) }}</span>
            </div>
          </div>
          <div class="file-actions">
            <NButton size="small" @click="viewFile(file)">查看</NButton>
            <NButton size="small" type="primary" @click="processFile(file)">处理</NButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NButton } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import { useFilesStore } from '@/stores/files'
import { useFileUpload } from '@/composables/useFileUpload'
import FileUpload from '@/components/upload/FileUpload.vue'
import type { FileInfo } from '@/types'

const router = useRouter()
const { isDark } = useTheme()
const filesStore = useFilesStore()
const { formatFileSize } = useFileUpload()

// 计算属性
const recentFiles = computed(() => {
  return filesStore.completedFiles.slice(0, 6)
})

// 方法
const formatDate = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return '今天'
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString()
  }
}

const viewFile = (file: FileInfo) => {
  filesStore.setCurrentFile(file.id)
  // 可以跳转到文件详情页面
  console.log('查看文件:', file.name)
}

const processFile = (file: FileInfo) => {
  filesStore.setCurrentFile(file.id)
  // 跳转到转录页面
  router.push({ name: 'Transcription' })
}
</script>

<style scoped>
.upload-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

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
  max-width: 600px;
  margin: 0 auto;
}

[data-theme='dark'] .page-description {
  color: var(--color-neutral-400);
}

/* 上传帮助信息 */
.upload-help {
  margin: var(--spacing-8) 0;
}

.upload-help h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-4);
  color: var(--color-neutral-800);
  text-align: center;
}

[data-theme='dark'] .upload-help h3 {
  color: var(--color-neutral-200);
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-4);
}

.help-item {
  display: flex;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(30, 58, 138, 0.1);
  border-radius: var(--radius-xl);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

[data-theme='dark'] .help-item {
  background: rgba(17, 24, 39, 0.8);
  border-color: rgba(16, 185, 129, 0.2);
}

.help-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-neumorphism-md);
}

.help-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.help-content h4 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  color: var(--color-neutral-800);
}

[data-theme='dark'] .help-content h4 {
  color: var(--color-neutral-200);
}

.help-content p {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0;
  line-height: 1.4;
}

[data-theme='dark'] .help-content p {
  color: var(--color-neutral-400);
}

.help-content p + p {
  margin-top: var(--spacing-1);
}

/* 最近文件 */
.recent-files {
  margin-top: var(--spacing-8);
}

.recent-files h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-4);
  color: var(--color-neutral-800);
}

[data-theme='dark'] .recent-files h3 {
  color: var(--color-neutral-200);
}

.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-4);
}

.file-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.file-card:hover {
  transform: translateY(-2px);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: var(--spacing-1);
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

.file-meta span {
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
}

[data-theme='dark'] .file-meta span {
  background: rgba(255, 255, 255, 0.05);
}

.file-actions {
  display: flex;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .upload-page {
    padding: var(--spacing-4);
  }

  .page-title {
    font-size: 2rem;
  }

  .help-grid {
    grid-template-columns: 1fr;
  }

  .files-grid {
    grid-template-columns: 1fr;
  }

  .file-card {
    flex-direction: column;
    text-align: center;
  }

  .file-info {
    text-align: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
  }

  .help-item {
    flex-direction: column;
    text-align: center;
  }

  .file-meta {
    justify-content: center;
  }
}
</style>
