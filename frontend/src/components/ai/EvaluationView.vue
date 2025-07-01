<!--
  AI评估组件
  提供基于转录内容的智能教学评估功能，支持多维度评分和建议
-->
<template>
  <div class="evaluation-view">
    <!-- 评估控制面板 -->
    <div class="evaluation-controls">
      <div class="control-header">
        <h3>AI评估</h3>
        <p class="control-description">基于转录内容生成专业的教学评估报告，包含8个维度的详细分析</p>
      </div>

      <div class="evaluation-dimensions">
        <h4>评估维度</h4>
        <div class="dimensions-grid">
          <div class="dimension-item">🚀 课堂导入</div>
          <div class="dimension-item">🎯 课程重点</div>
          <div class="dimension-item">💡 课程难点</div>
          <div class="dimension-item">🏗️ 课堂设计</div>
          <div class="dimension-item">🔍 内容深度</div>
          <div class="dimension-item">📚 内容广度</div>
          <div class="dimension-item">🌟 知识延伸</div>
          <div class="dimension-item">📝 课堂总结</div>
        </div>
      </div>

      <div class="control-actions">
        <NButton
          v-if="!isGenerating"
          type="primary"
          size="large"
          :disabled="!hasContent"
          @click="generateEvaluation"
        >
          <template #icon>
            <span>📊</span>
          </template>
          生成评估报告
        </NButton>

        <NButton v-else type="error" size="large" @click="stopGeneration">
          <template #icon>
            <span>⏹️</span>
          </template>
          停止生成
        </NButton>
      </div>
    </div>

    <!-- 评估结果展示 -->
    <div v-if="hasResult || isGenerating" class="evaluation-result">
      <div class="result-header">
        <h4>评估报告</h4>
        <div class="result-actions">
          <NButton v-if="hasResult" size="small" @click="copyResult"> 📋 复制报告 </NButton>
          <NButton v-if="hasResult" size="small" @click="downloadResult"> 💾 下载报告 </NButton>
        </div>
      </div>

      <!-- 生成进度 -->
      <div v-if="isGenerating" class="generation-progress">
        <div class="progress-info">
          <span class="progress-text">正在生成评估报告...</span>
          <span class="progress-time">{{ formatDuration(generationTime) }}</span>
        </div>
        <NProgress type="line" :percentage="100" :show-indicator="false" status="info" processing />
      </div>

      <!-- 评估内容 -->
      <div class="result-content">
        <div
          v-if="streamContent || evaluationContent"
          class="evaluation-text"
          v-html="formatEvaluationContent(streamContent || evaluationContent)"
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
      <div class="empty-icon">📊</div>
      <h4 class="empty-title">需要转录内容</h4>
      <p class="empty-description">请先完成音视频转录，然后即可生成专业的教学评估报告</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NProgress, NAlert, useMessage } from 'naive-ui'
import { useStreamingResponse } from '@/composables/useStreamingResponse'

// Props
interface Props {
  fileId: string
  transcriptionText: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'evaluation-generated': [evaluation: any]
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
const evaluationContent = ref('')
const generationStartTime = ref<Date | null>(null)
const generationTime = ref(0)
const timer = ref<number | null>(null)

// 计算属性
const hasContent = computed(() => props.transcriptionText.length > 0)
const isGenerating = computed(() => isStreaming.value)
const hasResult = computed(() => evaluationContent.value.length > 0 || hasStreamContent.value)

// 方法
const generateEvaluation = async () => {
  if (!props.transcriptionText) {
    message.warning('没有转录内容可以评估')
    return
  }

  try {
    // 重置状态
    resetStream()
    evaluationContent.value = ''
    generationStartTime.value = new Date()
    startTimer()

    // 启动流式请求
    await startStreaming(
      '/api/ai/evaluate-teaching',
      {
        text: props.transcriptionText,
      },
      {
        onStart: () => {
          console.log('开始生成评估报告')
        },
        onChunk: () => {
          // 实时更新显示
        },
        onComplete: (fullContent: string) => {
          evaluationContent.value = fullContent
          stopTimer()
          emit('evaluation-generated', {
            content: fullContent,
            timestamp: new Date(),
          })
        },
        onError: (error: string) => {
          stopTimer()
          console.error('评估生成失败:', error)
        },
        onAbort: () => {
          stopTimer()
          console.log('评估生成已中断')
        },
      },
    )
  } catch (error) {
    stopTimer()
    message.error('启动评估生成失败')
    console.error('评估生成错误:', error)
  }
}

const stopGeneration = () => {
  abortStreaming()
  stopTimer()
  message.info('已停止生成评估报告')
}

const copyResult = async () => {
  const content = streamContent.value || evaluationContent.value
  if (!content) return

  try {
    await navigator.clipboard.writeText(content)
    message.success('评估报告已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const downloadResult = () => {
  const content = streamContent.value || evaluationContent.value
  if (!content) return

  const filename = `evaluation-report-${Date.now()}.md`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success('评估报告下载成功')
}

const formatEvaluationContent = (content: string) => {
  if (!content) return ''

  // 将Markdown格式转换为HTML
  return content
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
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
  console.log('EvaluationView mounted, fileId:', props.fileId)
})

onUnmounted(() => {
  stopTimer()
  abortStreaming()
})
</script>

<style scoped>
.evaluation-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

/* 控制面板 */
.evaluation-controls {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme='dark'] .evaluation-controls {
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

/* 评估维度 */
.evaluation-dimensions {
  margin-bottom: var(--spacing-4);
}

.evaluation-dimensions h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: 0 0 var(--spacing-3) 0;
}

[data-theme='dark'] .evaluation-dimensions h4 {
  color: var(--color-neutral-300);
}

.dimensions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-2);
}

.dimension-item {
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-lg);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary-aurora);
  text-align: center;
}

.control-actions {
  display: flex;
  justify-content: center;
}

/* 结果展示 */
.evaluation-result {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .evaluation-result {
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

.evaluation-text {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--color-neutral-700);
  white-space: pre-wrap;
  word-wrap: break-word;
}

[data-theme='dark'] .evaluation-text {
  color: var(--color-neutral-300);
}

.evaluation-text :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-neutral-800);
  margin: var(--spacing-4) 0 var(--spacing-3) 0;
  border-bottom: 2px solid var(--color-primary-aurora);
  padding-bottom: var(--spacing-2);
}

[data-theme='dark'] .evaluation-text :deep(h1) {
  color: var(--color-neutral-200);
}

.evaluation-text :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: var(--spacing-3) 0 var(--spacing-2) 0;
}

[data-theme='dark'] .evaluation-text :deep(h2) {
  color: var(--color-neutral-200);
}

.evaluation-text :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  margin: var(--spacing-3) 0 var(--spacing-2) 0;
}

[data-theme='dark'] .evaluation-text :deep(h3) {
  color: var(--color-neutral-300);
}

.evaluation-text :deep(strong) {
  font-weight: 600;
  color: var(--color-neutral-800);
}

[data-theme='dark'] .evaluation-text :deep(strong) {
  color: var(--color-neutral-200);
}

.evaluation-text :deep(em) {
  font-style: italic;
  color: var(--color-primary-aurora);
}

.evaluation-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.9em;
}

[data-theme='dark'] .evaluation-text :deep(code) {
  background: rgba(255, 255, 255, 0.1);
}

.evaluation-text :deep(p) {
  margin: 0 0 var(--spacing-3) 0;
}

.evaluation-text :deep(p:last-child) {
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
  .dimensions-grid {
    grid-template-columns: repeat(2, 1fr);
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

@media (max-width: 480px) {
  .dimensions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
