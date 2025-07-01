<!--
  智能总结组件
  提供简要总结和详细总结功能，支持流式响应显示
-->
<template>
  <div class="summary-view">
    <!-- 总结控制面板 -->
    <div class="summary-controls">
      <div class="control-header">
        <h3>智能总结</h3>
        <p class="control-description">基于转录内容生成AI总结，支持简要和详细两种模式</p>
      </div>

      <div class="control-form">
        <div class="form-row">
          <div class="form-item">
            <label>总结类型</label>
            <NSelect
              v-model:value="summaryType"
              :options="summaryTypeOptions"
              :disabled="isGenerating"
            />
          </div>

          <div class="form-item">
            <label>语言设置</label>
            <NSelect v-model:value="language" :options="languageOptions" :disabled="isGenerating" />
          </div>
        </div>

        <div class="form-actions">
          <NButton
            v-if="!isGenerating"
            type="primary"
            size="large"
            :disabled="!hasContent"
            @click="generateSummary"
          >
            <template #icon>
              <span>✨</span>
            </template>
            生成总结
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

    <!-- 总结结果展示 -->
    <div v-if="hasResult || isGenerating" class="summary-result">
      <div class="result-header">
        <h4>总结结果</h4>
        <div class="result-actions">
          <NButton v-if="hasResult" size="small" @click="copyResult"> 📋 复制 </NButton>
          <NButton v-if="hasResult" size="small" @click="downloadResult"> 💾 下载 </NButton>
        </div>
      </div>

      <!-- 生成进度 -->
      <div v-if="isGenerating" class="generation-progress">
        <div class="progress-info">
          <span class="progress-text">正在生成总结...</span>
          <span class="progress-time">{{ formatDuration(generationTime) }}</span>
        </div>
        <NProgress type="line" :percentage="100" :show-indicator="false" status="info" processing />
      </div>

      <!-- 总结内容 -->
      <div class="result-content">
        <div
          v-if="streamContent || summaryContent"
          class="summary-text"
          v-html="formatSummaryContent(streamContent || summaryContent)"
        ></div>

        <!-- 流式响应光标 -->
        <span v-if="isGenerating" class="streaming-cursor">|</span>
      </div>

      <!-- 错误信息 -->
      <div v-if="hasError" class="error-message">
        <NAlert type="error" :title="streamError || '生成失败'"> 请检查网络连接或稍后重试 </NAlert>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasContent" class="empty-content">
      <div class="empty-icon">📝</div>
      <h4 class="empty-title">需要转录内容</h4>
      <p class="empty-description">请先完成音视频转录，然后即可生成智能总结</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NSelect, NButton, NProgress, NAlert, useMessage } from 'naive-ui'
import { useStreamingResponse } from '@/composables/useStreamingResponse'

// Props
interface Props {
  fileId: string
  transcriptionText: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'summary-generated': [summary: any]
}>()

const message = useMessage()
const {
  isStreaming,
  streamContent,
  streamError,
  hasContent: hasStreamContent,
  hasError,
  startStreaming,
  abortStreaming,
  resetStream,
} = useStreamingResponse()

// 响应式状态
const summaryType = ref('brief')
const language = ref('zh')
const summaryContent = ref('')
const generationStartTime = ref<Date | null>(null)
const generationTime = ref(0)
const timer = ref<number | null>(null)

// 配置选项
const summaryTypeOptions = [
  { label: '简要总结', value: 'brief' },
  { label: '详细总结', value: 'detailed' },
]

const languageOptions = [
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
  { label: '日文', value: 'ja' },
  { label: '韩文', value: 'ko' },
]

// 计算属性
const hasContent = computed(() => props.transcriptionText.length > 0)
const isGenerating = computed(() => isStreaming.value)
const hasResult = computed(() => summaryContent.value.length > 0 || hasStreamContent.value)

// 方法
const generateSummary = async () => {
  if (!props.transcriptionText) {
    message.warning('没有转录内容可以总结')
    return
  }

  try {
    // 重置状态
    resetStream()
    summaryContent.value = ''
    generationStartTime.value = new Date()
    startTimer()

    // 确定API端点
    const endpoint = summaryType.value === 'detailed' ? '/api/detailed-summary' : '/api/summary'

    // 启动流式请求
    await startStreaming(
      endpoint,
      {
        text: props.transcriptionText,
        language: language.value,
      },
      {
        onStart: () => {
          console.log('开始生成总结')
        },
        onChunk: () => {
          // 实时更新显示
        },
        onComplete: (fullContent: string) => {
          summaryContent.value = fullContent
          stopTimer()
          emit('summary-generated', {
            type: summaryType.value,
            content: fullContent,
            language: language.value,
          })
        },
        onError: (error: string) => {
          stopTimer()
          console.error('总结生成失败:', error)
        },
        onAbort: () => {
          stopTimer()
          console.log('总结生成已中断')
        },
      },
    )
  } catch (error) {
    stopTimer()
    message.error('启动总结生成失败')
    console.error('总结生成错误:', error)
  }
}

const stopGeneration = () => {
  abortStreaming()
  stopTimer()
  message.info('已停止生成总结')
}

const copyResult = async () => {
  const content = streamContent.value || summaryContent.value
  if (!content) return

  try {
    await navigator.clipboard.writeText(content)
    message.success('总结内容已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const downloadResult = () => {
  const content = streamContent.value || summaryContent.value
  if (!content) return

  const filename = `summary-${summaryType.value}-${Date.now()}.txt`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success('总结文件下载成功')
}

const formatSummaryContent = (content: string) => {
  if (!content) return ''

  // 将Markdown格式转换为HTML
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>')
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
  console.log('SummaryView mounted, fileId:', props.fileId)
})

onUnmounted(() => {
  stopTimer()
  abortStreaming()
})
</script>

<style scoped>
.summary-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

/* 控制面板 */
.summary-controls {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme='dark'] .summary-controls {
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
.summary-result {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .summary-result {
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

/* 内容展示 */
.result-content {
  position: relative;
}

.summary-text {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-neutral-700);
  white-space: pre-wrap;
  word-wrap: break-word;
}

[data-theme='dark'] .summary-text {
  color: var(--color-neutral-300);
}

.summary-text :deep(strong) {
  font-weight: 600;
  color: var(--color-neutral-800);
}

[data-theme='dark'] .summary-text :deep(strong) {
  color: var(--color-neutral-200);
}

.summary-text :deep(em) {
  font-style: italic;
  color: var(--color-primary-aurora);
}

.summary-text :deep(p) {
  margin: 0 0 var(--spacing-3) 0;
}

.summary-text :deep(p:last-child) {
  margin-bottom: 0;
}

.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: var(--color-primary-aurora);
  animation: blink 1s infinite;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
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
}
</style>
