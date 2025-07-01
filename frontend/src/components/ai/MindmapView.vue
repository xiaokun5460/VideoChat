<!--
  思维导图组件
  提供JSON格式和图片格式的思维导图生成功能
-->
<template>
  <div class="mindmap-view">
    <!-- 思维导图控制面板 -->
    <div class="mindmap-controls">
      <div class="control-header">
        <h3>思维导图</h3>
        <p class="control-description">基于转录内容生成可视化思维导图，支持JSON和图片两种格式</p>
      </div>

      <div class="control-form">
        <div class="form-row">
          <div class="form-item">
            <label>导图格式</label>
            <NSelect
              v-model:value="mindmapFormat"
              :options="formatOptions"
              :disabled="isGenerating"
            />
          </div>

          <div class="form-item">
            <label>导图样式</label>
            <NSelect
              v-model:value="mindmapStyle"
              :options="styleOptions"
              :disabled="isGenerating"
            />
          </div>
        </div>

        <div class="form-actions">
          <NButton
            v-if="!isGenerating"
            type="primary"
            size="large"
            :disabled="!hasContent"
            @click="generateMindmap"
          >
            <template #icon>
              <span>🧠</span>
            </template>
            生成思维导图
          </NButton>

          <NButton v-else type="error" size="large" @click="stopGeneration">
            <template #icon>
              <span>⏹️</span>
            </template>
            停止生成
          </NButton>
        </div>
      </div>
    </div>

    <!-- 思维导图结果展示 -->
    <div v-if="hasResult || isGenerating" class="mindmap-result">
      <div class="result-header">
        <h4>思维导图结果</h4>
        <div class="result-actions">
          <NButton v-if="hasResult && mindmapFormat === 'json'" size="small" @click="copyResult">
            📋 复制JSON
          </NButton>
          <NButton
            v-if="hasResult && mindmapFormat === 'image'"
            size="small"
            @click="downloadImage"
          >
            🖼️ 下载图片
          </NButton>
          <NButton v-if="hasResult" size="small" @click="regenerate"> 🔄 重新生成 </NButton>
        </div>
      </div>

      <!-- 生成进度 -->
      <div v-if="isGenerating" class="generation-progress">
        <div class="progress-info">
          <span class="progress-text">正在生成思维导图...</span>
          <span class="progress-time">{{ formatDuration(generationTime) }}</span>
        </div>
        <NProgress type="line" :percentage="100" :show-indicator="false" status="info" processing />
      </div>

      <!-- 思维导图内容 -->
      <div class="result-content">
        <!-- JSON格式展示 -->
        <div v-if="mindmapFormat === 'json' && mindmapData" class="mindmap-json">
          <div class="json-viewer">
            <pre><code>{{ formatJSON(mindmapData) }}</code></pre>
          </div>
        </div>

        <!-- 图片格式展示 -->
        <div v-if="mindmapFormat === 'image' && mindmapImageUrl" class="mindmap-image">
          <img
            :src="mindmapImageUrl"
            alt="思维导图"
            class="mindmap-img"
            @load="handleImageLoad"
            @error="handleImageError"
          />
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="hasError" class="error-message">
        <NAlert type="error" :title="mindmapError || '生成失败'"> 请检查网络连接或稍后重试 </NAlert>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasContent" class="empty-content">
      <div class="empty-icon">🧠</div>
      <h4 class="empty-title">需要转录内容</h4>
      <p class="empty-description">请先完成音视频转录，然后即可生成思维导图</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NSelect, NButton, NProgress, NAlert, useMessage } from 'naive-ui'

// Props
interface Props {
  fileId: string
  transcriptionText: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'mindmap-generated': [mindmap: any]
}>()

const message = useMessage()

// 响应式状态
const mindmapFormat = ref('json')
const mindmapStyle = ref('tree')
const isGenerating = ref(false)
const mindmapData = ref<any>(null)
const mindmapImageUrl = ref('')
const mindmapError = ref<string | null>(null)
const generationStartTime = ref<Date | null>(null)
const generationTime = ref(0)
const timer = ref<number | null>(null)

// 配置选项
const formatOptions = [
  { label: 'JSON格式', value: 'json' },
  { label: '图片格式', value: 'image' },
]

const styleOptions = [
  { label: '树形结构', value: 'tree' },
  { label: '放射状', value: 'radial' },
  { label: '流程图', value: 'flowchart' },
]

// 计算属性
const hasContent = computed(() => props.transcriptionText.length > 0)
const hasResult = computed(() => mindmapData.value !== null || mindmapImageUrl.value !== '')
const hasError = computed(() => mindmapError.value !== null)

// 方法
const generateMindmap = async () => {
  if (!props.transcriptionText) {
    message.warning('没有转录内容可以生成思维导图')
    return
  }

  try {
    // 重置状态
    isGenerating.value = true
    mindmapData.value = null
    mindmapImageUrl.value = ''
    mindmapError.value = null
    generationStartTime.value = new Date()
    startTimer()

    // 确定API端点
    const endpoint = mindmapFormat.value === 'image' ? '/api/mindmap-image' : '/api/mindmap'

    // 发起请求
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: props.transcriptionText,
        style: mindmapStyle.value,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (mindmapFormat.value === 'image') {
      mindmapImageUrl.value = result.image_path || result.url
    } else {
      mindmapData.value = result.mindmap
    }

    stopTimer()
    emit('mindmap-generated', {
      format: mindmapFormat.value,
      style: mindmapStyle.value,
      data: mindmapFormat.value === 'image' ? mindmapImageUrl.value : mindmapData.value,
    })
  } catch (error: any) {
    stopTimer()
    mindmapError.value = error.message || '思维导图生成失败'
    message.error('思维导图生成失败')
    console.error('思维导图生成错误:', error)
  } finally {
    isGenerating.value = false
  }
}

const stopGeneration = () => {
  isGenerating.value = false
  stopTimer()
  message.info('已停止生成思维导图')
}

const regenerate = () => {
  generateMindmap()
}

const copyResult = async () => {
  if (!mindmapData.value) return

  try {
    const jsonString = JSON.stringify(mindmapData.value, null, 2)
    await navigator.clipboard.writeText(jsonString)
    message.success('思维导图JSON已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const downloadImage = () => {
  if (!mindmapImageUrl.value) return

  const link = document.createElement('a')
  link.href = mindmapImageUrl.value
  link.download = `mindmap-${Date.now()}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  message.success('思维导图图片下载成功')
}

const formatJSON = (data: any) => {
  return JSON.stringify(data, null, 2)
}

const handleImageLoad = () => {
  console.log('思维导图图片加载成功')
}

const handleImageError = () => {
  mindmapError.value = '思维导图图片加载失败'
  message.error('思维导图图片加载失败')
}

const startTimer = () => {
  timer.value = setInterval(() => {
    if (generationStartTime.value) {
      generationTime.value = Date.now() - generationStartTime.value.getTime()
    }
  }, 100)
}

const stopTimer = () => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${remainingSeconds}s`
}

// 生命周期
onMounted(() => {
  console.log('MindmapView mounted, fileId:', props.fileId)
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.mindmap-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

/* 控制面板 */
.mindmap-controls {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme='dark'] .mindmap-controls {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.control-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .control-header h3 {
  color: var(--color-neutral-200);
}

.control-description {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-4) 0;
}

[data-theme='dark'] .control-description {
  color: var(--color-neutral-400);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
}

[data-theme='dark'] .form-item label {
  color: var(--color-neutral-300);
}

.form-actions {
  display: flex;
  justify-content: center;
}

/* 结果展示 */
.mindmap-result {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .mindmap-result {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-4);
}

.result-header h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0;
}

[data-theme='dark'] .result-header h4 {
  color: var(--color-neutral-200);
}

.result-actions {
  display: flex;
  gap: var(--spacing-2);
}

/* 生成进度 */
.generation-progress {
  margin-bottom: var(--spacing-4);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
}

.progress-text {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

[data-theme='dark'] .progress-text {
  color: var(--color-neutral-400);
}

.progress-time {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  font-family: var(--font-mono);
}

/* JSON展示 */
.mindmap-json {
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .mindmap-json {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.json-viewer {
  max-height: 400px;
  overflow-y: auto;
}

.json-viewer pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-neutral-700);
  white-space: pre-wrap;
  word-wrap: break-word;
}

[data-theme='dark'] .json-viewer pre {
  color: var(--color-neutral-300);
}

/* 图片展示 */
.mindmap-image {
  text-align: center;
}

.mindmap-img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .mindmap-img {
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 错误信息 */
.error-message {
  margin-top: var(--spacing-4);
}

/* 空状态 */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-8);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme='dark'] .empty-content {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-3);
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
  margin: 0;
  max-width: 300px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .result-header {
    flex-direction: column;
    gap: var(--spacing-3);
    align-items: stretch;
  }

  .result-actions {
    justify-content: center;
  }

  .json-viewer {
    max-height: 300px;
  }
}
</style>
