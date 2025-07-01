<!--
  音视频转录页面
  提供完整的转录功能，包括文件选择、转录配置、进度监控、结果展示等
-->
<template>
  <div class="transcription-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">音视频转录</h1>
      <p class="page-description">将音频或视频内容转换为文字，支持多语言识别和说话人分离</p>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧：文件选择和转录控制 -->
      <div class="control-panel glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
        <!-- 文件选择 -->
        <div class="file-selection">
          <h3>选择文件</h3>
          <div v-if="!selectedFile" class="file-selector">
            <p class="selector-hint">请先上传文件或从已上传文件中选择</p>
            <div class="selector-actions">
              <NButton type="primary" @click="$router.push('/upload')"> 上传新文件 </NButton>
              <NButton @click="showFileList = true"> 选择已有文件 </NButton>
            </div>
          </div>

          <div v-else class="selected-file">
            <div class="file-info">
              <div class="file-icon">
                <span v-if="selectedFile.type.startsWith('audio/')">🎵</span>
                <span v-else>🎬</span>
              </div>
              <div class="file-details">
                <h4 class="file-name">{{ selectedFile.name }}</h4>
                <p class="file-meta">
                  <span>{{ formatFileSize(selectedFile.size) }}</span>
                  <span>{{ getFileExtension(selectedFile.name) }}</span>
                </p>
              </div>
            </div>
            <NButton size="small" @click="clearSelectedFile">更换文件</NButton>
          </div>
        </div>

        <!-- 转录配置 -->
        <div v-if="selectedFile" class="transcription-config">
          <h3>转录配置</h3>
          <div class="config-form">
            <div class="config-item">
              <label>语言设置</label>
              <NSelect
                v-model:value="transcriptionOptions.language"
                :options="languageOptions"
                placeholder="自动检测"
              />
            </div>

            <div class="config-item">
              <label>转录模型</label>
              <NSelect v-model:value="transcriptionOptions.model" :options="modelOptions" />
            </div>

            <div class="config-item">
              <label>处理设备</label>
              <NSelect v-model:value="transcriptionOptions.deviceType" :options="deviceOptions" />
            </div>

            <div class="config-switches">
              <NSwitch v-model:value="transcriptionOptions.enableSpeakerDiarization">
                <template #checked>说话人识别</template>
                <template #unchecked>说话人识别</template>
              </NSwitch>

              <NSwitch v-model:value="transcriptionOptions.enableTimestamps">
                <template #checked>时间戳</template>
                <template #unchecked>时间戳</template>
              </NSwitch>
            </div>
          </div>
        </div>

        <!-- 转录控制 -->
        <div v-if="selectedFile" class="transcription-controls">
          <NButton
            v-if="!isTranscribing"
            type="primary"
            size="large"
            block
            @click="startTranscription"
            :disabled="!selectedFile"
          >
            开始转录
          </NButton>

          <NButton v-else type="error" size="large" block @click="stopTranscription">
            停止转录
          </NButton>
        </div>
      </div>

      <!-- 右侧：媒体播放器和转录结果 -->
      <div class="content-panel">
        <!-- 媒体播放器 -->
        <div v-if="selectedFile" class="media-player-section">
          <MediaPlayer
            :src="selectedFile.url || ''"
            :type="selectedFile.type.startsWith('audio/') ? 'audio' : 'video'"
            :title="selectedFile.name"
            @timeupdate="handleTimeUpdate"
          />
        </div>

        <!-- 转录进度 -->
        <div v-if="isTranscribing" class="progress-section">
          <TranscriptionProgress
            :file-name="selectedFile?.name || ''"
            :file-size="selectedFile?.size || 0"
            :file-type="selectedFile?.type.startsWith('audio/') ? 'audio' : 'video'"
            :duration="0"
            :status="'processing'"
            :progress="transcriptionProgress"
            :config="transcriptionOptions"
            :start-time="transcriptionStartTime"
            @cancel="stopTranscription"
          />
        </div>

        <!-- 转录结果 -->
        <div v-if="hasTranscription" class="transcription-results">
          <TranscriptionView
            :segments="currentTranscription?.segments || []"
            :speakers="speakers"
            :stats="transcriptionStats"
            @segment-select="handleSegmentSelect"
            @seek-to-time="handleSeekToTime"
            @export="handleExport"
          />
        </div>

        <!-- 空状态 -->
        <div v-if="!selectedFile && !isTranscribing && !hasTranscription" class="empty-state">
          <div class="empty-icon">🎤</div>
          <h3 class="empty-title">开始音视频转录</h3>
          <p class="empty-description">
            选择一个音频或视频文件，配置转录参数，即可开始将语音转换为文字
          </p>
          <div class="empty-features">
            <div class="feature-item">🗣️ 多语言识别</div>
            <div class="feature-item">👥 说话人分离</div>
            <div class="feature-item">⏰ 时间戳标记</div>
            <div class="feature-item">📝 实时编辑</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件选择弹窗 -->
    <NModal v-model:show="showFileList" preset="card" title="选择文件" style="width: 600px">
      <div class="file-list">
        <div
          v-for="file in availableFiles"
          :key="file.id"
          class="file-item"
          @click="selectFile(file)"
        >
          <div class="file-icon">
            <span v-if="file.type.startsWith('audio/')">🎵</span>
            <span v-else>🎬</span>
          </div>
          <div class="file-info">
            <h4 class="file-name">{{ file.name }}</h4>
            <p class="file-meta">
              {{ formatFileSize(file.size) }} • {{ getFileExtension(file.name) }}
            </p>
          </div>
        </div>

        <div v-if="availableFiles.length === 0" class="no-files">
          <p>暂无可用文件</p>
          <NButton type="primary" @click="$router.push('/upload')">上传文件</NButton>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NSelect, NSwitch, NModal, useMessage } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import { useFilesStore } from '@/stores/files'
import { useTranscription } from '@/composables/useTranscription'
import { MediaPlayer } from '@/components/player'
import TranscriptionProgress from '@/components/transcription/TranscriptionProgress.vue'
import TranscriptionView from '@/components/transcription/TranscriptionView.vue'
import type { FileInfo, TranscriptionSegment } from '@/types'

const message = useMessage()
const { isDark } = useTheme()
const filesStore = useFilesStore()
const {
  isTranscribing,
  transcriptionProgress,
  currentTranscription,
  speakers,
  transcriptionStats,
  hasTranscription,
  startTranscription: startTranscriptionProcess,
} = useTranscription()

// 响应式状态
const selectedFile = ref<FileInfo | null>(null)
const showFileList = ref(false)
const transcriptionStartTime = ref<Date | null>(null)
const currentTime = ref(0)

// 转录配置
const transcriptionOptions = ref({
  language: 'auto',
  model: 'whisper-large-v3',
  deviceType: 'auto' as 'cpu' | 'gpu' | 'auto',
  enableSpeakerDiarization: true,
  enableTimestamps: true,
})

// 配置选项
const languageOptions = [
  { label: '自动检测', value: 'auto' },
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
  { label: '日文', value: 'ja' },
  { label: '韩文', value: 'ko' },
  { label: '法文', value: 'fr' },
  { label: '德文', value: 'de' },
  { label: '西班牙文', value: 'es' },
]

const modelOptions = [
  { label: 'Whisper Large v3 (推荐)', value: 'whisper-large-v3' },
  { label: 'Whisper Large v2', value: 'whisper-large-v2' },
  { label: 'Whisper Medium', value: 'whisper-medium' },
  { label: 'Whisper Small', value: 'whisper-small' },
]

const deviceOptions = [
  { label: '自动选择', value: 'auto' },
  { label: 'GPU加速', value: 'gpu' },
  { label: 'CPU处理', value: 'cpu' },
]

// 计算属性
const availableFiles = computed(() => {
  return filesStore.completedFiles.filter(
    (file) => file.type.startsWith('audio/') || file.type.startsWith('video/'),
  )
})

// 方法
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || ''
}

const selectFile = (file: FileInfo) => {
  selectedFile.value = file
  showFileList.value = false
  filesStore.setCurrentFile(file.id)

  // 如果文件已有转录结果，加载并显示
  if (file.transcription && file.transcription.segments.length > 0) {
    // 创建TranscriptionResult对象
    const transcriptionResult = {
      id: file.transcription.taskId || file.id,
      fileId: file.id,
      segments: file.transcription.segments,
      language: 'auto',
      duration: 0,
      status: file.transcription.status as 'processing' | 'completed' | 'error',
      createdAt: file.createdAt,
    }

    // 设置当前转录结果
    currentTranscription.value = transcriptionResult
    console.log('已加载文件的转录结果:', transcriptionResult)
  } else {
    // 清空当前转录结果
    currentTranscription.value = null
  }
}

const clearSelectedFile = () => {
  selectedFile.value = null
  filesStore.setCurrentFile(null)
}

const startTranscription = async () => {
  if (!selectedFile.value) return

  try {
    transcriptionStartTime.value = new Date()
    await startTranscriptionProcess(selectedFile.value, transcriptionOptions.value)
    message.success('转录已开始')
  } catch (error) {
    message.error('启动转录失败')
    console.error('转录启动失败:', error)
  }
}

const stopTranscription = async () => {
  try {
    // TODO: 实现停止转录逻辑
    message.info('转录已停止')
  } catch (error) {
    message.error('停止转录失败')
    console.error('停止转录失败:', error)
  }
}

const handleTimeUpdate = (time: number) => {
  currentTime.value = time
}

const handleSegmentSelect = (segment: TranscriptionSegment) => {
  // TODO: 高亮选中的片段
  console.log('选中片段:', segment)
}

const handleSeekToTime = (time: number) => {
  // TODO: 跳转到指定时间
  console.log('跳转到时间:', time)
}

const handleExport = (format: string, options?: any) => {
  // TODO: 实现导出功能
  console.log('导出格式:', format, '选项:', options)
  message.success(`开始导出${format}格式`)
}

// 生命周期
onMounted(() => {
  // 检查是否有当前文件
  const currentFileId = filesStore.currentFile?.id
  if (currentFileId) {
    const file = availableFiles.value.find((f) => f.id === currentFileId)
    if (file) {
      selectedFile.value = file
    }
  }
})
</script>

<style scoped>
.transcription-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
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
  max-width: 600px;
  margin: 0 auto;
}

[data-theme='dark'] .page-description {
  color: var(--color-neutral-400);
}

/* 主要内容区域 */
.main-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  max-width: 800px;
  margin: 0 auto;
}

/* 控制面板 */
.control-panel {
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
}

.control-panel h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-4) 0;
}

[data-theme='dark'] .control-panel h3 {
  color: var(--color-neutral-200);
}

/* 文件选择 */
.file-selection {
  margin-bottom: var(--spacing-6);
}

.file-selector {
  text-align: center;
  padding: var(--spacing-4);
  border: 2px dashed var(--color-neutral-300);
  border-radius: var(--radius-xl);
  background: rgba(0, 0, 0, 0.02);
}

[data-theme='dark'] .file-selector {
  border-color: var(--color-neutral-600);
  background: rgba(255, 255, 255, 0.02);
}

.selector-hint {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0 0 var(--spacing-3) 0;
}

.selector-actions {
  display: flex;
  gap: var(--spacing-2);
  justify-content: center;
}

.selected-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-4);
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-xl);
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
  font-size: 1rem;
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
  font-size: 0.75rem;
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

/* 转录配置 */
.transcription-config {
  margin-bottom: var(--spacing-6);
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.config-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
}

[data-theme='dark'] .config-item label {
  color: var(--color-neutral-300);
}

.config-switches {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* 转录控制 */
.transcription-controls {
  margin-bottom: var(--spacing-4);
}

/* 内容面板 */
.content-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.media-player-section {
  border-radius: var(--radius-2xl);
  overflow: hidden;
}

.progress-section,
.transcription-results {
  flex: 1;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-8);
  flex: 1;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-4);
  opacity: 0.5;
}

.empty-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .empty-title {
  color: var(--color-neutral-300);
}

.empty-description {
  font-size: 1rem;
  color: var(--color-neutral-500);
  margin: 0 0 var(--spacing-4) 0;
  max-width: 400px;
}

.empty-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-3);
  max-width: 300px;
}

.feature-item {
  padding: var(--spacing-2);
  background: rgba(16, 185, 129, 0.1);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary-aurora);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* 文件选择弹窗 */
.file-list {
  max-height: 400px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-ease-out);
  border: 1px solid transparent;
}

.file-item:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
}

.no-files {
  text-align: center;
  padding: var(--spacing-6);
  color: var(--color-neutral-500);
}

.no-files p {
  margin: 0 0 var(--spacing-3) 0;
}

/* 响应式设计 */

@media (max-width: 768px) {
  .transcription-page {
    padding: var(--spacing-4);
  }

  .main-content {
    max-width: 100%;
  }

  .page-title {
    font-size: 2rem;
  }

  .control-panel {
    padding: var(--spacing-4);
  }

  .selector-actions {
    flex-direction: column;
  }

  .selected-file {
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: stretch;
  }

  .empty-features {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
  }

  .file-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }
}
</style>
