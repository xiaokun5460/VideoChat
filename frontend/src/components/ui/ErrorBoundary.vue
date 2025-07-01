<!--
  错误边界组件
  提供友好的错误处理和重试机制
-->
<template>
  <div class="error-boundary">
    <!-- 错误状态 -->
    <div v-if="hasError" class="error-content">
      <div class="error-visual">
        <div class="error-icon">{{ getErrorIcon(errorType || 'unknown') }}</div>
        <div class="error-animation">
          <div class="error-ripple"></div>
          <div class="error-ripple"></div>
          <div class="error-ripple"></div>
        </div>
      </div>

      <div class="error-info">
        <h3 class="error-title">{{ getErrorTitle(errorType || 'unknown') }}</h3>
        <p class="error-message">{{ errorMessage || getErrorMessage(errorType || 'unknown') }}</p>

        <!-- 错误详情 -->
        <div v-if="showDetails" class="error-details">
          <div class="details-header" @click="toggleDetails">
            <span>错误详情</span>
            <span class="details-toggle">{{ detailsExpanded ? '▼' : '▶' }}</span>
          </div>
          <div v-if="detailsExpanded" class="details-content">
            <pre><code>{{ errorDetails }}</code></pre>
          </div>
        </div>
      </div>

      <div class="error-actions">
        <NButton type="primary" @click="handleRetry" :loading="retrying">
          <template #icon>
            <span>🔄</span>
          </template>
          重试
        </NButton>

        <NButton @click="handleRefresh">
          <template #icon>
            <span>🔃</span>
          </template>
          刷新页面
        </NButton>

        <NButton @click="handleReport">
          <template #icon>
            <span>📧</span>
          </template>
          报告问题
        </NButton>
      </div>
    </div>

    <!-- 正常内容 -->
    <div v-else class="normal-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured } from 'vue'
import { NButton, useMessage } from 'naive-ui'

interface Props {
  errorType?: 'network' | 'server' | 'client' | 'unknown'
  errorMessage?: string
  errorDetails?: string
  showDetails?: boolean
  onRetry?: () => void | Promise<void>
}

const props = withDefaults(defineProps<Props>(), {
  errorType: 'unknown',
  showDetails: true,
})

const emit = defineEmits<{
  error: [error: Error]
  retry: []
}>()

const message = useMessage()

// 响应式状态
const hasError = ref(false)
const currentError = ref<Error | null>(null)
const retrying = ref(false)
const detailsExpanded = ref(false)

// 计算属性
const errorDetails = computed(() => {
  if (props.errorDetails) return props.errorDetails
  if (currentError.value) {
    return `${currentError.value.name}: ${currentError.value.message}\n\nStack Trace:\n${currentError.value.stack}`
  }
  return '暂无详细信息'
})

// 错误捕获
onErrorCaptured((error: Error) => {
  hasError.value = true
  currentError.value = error
  emit('error', error)
  console.error('ErrorBoundary caught error:', error)
  return false // 阻止错误继续传播
})

// 方法
const getErrorIcon = (type: string) => {
  const icons = {
    network: '🌐',
    server: '🔧',
    client: '💻',
    unknown: '❌',
  }
  return icons[type as keyof typeof icons] || '❌'
}

const getErrorTitle = (type: string) => {
  const titles = {
    network: '网络连接错误',
    server: '服务器错误',
    client: '客户端错误',
    unknown: '未知错误',
  }
  return titles[type as keyof typeof titles] || '发生错误'
}

const getErrorMessage = (type: string) => {
  const messages = {
    network: '无法连接到服务器，请检查网络连接后重试',
    server: '服务器暂时无法处理请求，请稍后重试',
    client: '应用程序遇到问题，请刷新页面或重试',
    unknown: '发生了未知错误，请重试或联系技术支持',
  }
  return messages[type as keyof typeof messages] || '发生了未知错误'
}

const toggleDetails = () => {
  detailsExpanded.value = !detailsExpanded.value
}

const handleRetry = async () => {
  try {
    retrying.value = true

    if (props.onRetry) {
      await props.onRetry()
    }

    // 重置错误状态
    hasError.value = false
    currentError.value = null

    emit('retry')
    message.success('重试成功')
  } catch (error) {
    message.error('重试失败')
    console.error('Retry failed:', error)
  } finally {
    retrying.value = false
  }
}

const handleRefresh = () => {
  window.location.reload()
}

const handleReport = () => {
  const errorInfo = {
    type: props.errorType,
    message: props.errorMessage || currentError.value?.message,
    details: errorDetails.value,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    url: window.location.href,
  }

  // 这里可以集成错误报告服务
  console.log('Error report:', errorInfo)
  message.info('错误报告已生成，请联系技术支持')
}

// 暴露方法供外部调用
const triggerError = (error: Error) => {
  hasError.value = true
  currentError.value = error
}

const clearError = () => {
  hasError.value = false
  currentError.value = null
}

defineExpose({
  triggerError,
  clearError,
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.normal-content {
  width: 100%;
  height: 100%;
}

/* 错误内容 */
.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-8);
  min-height: 400px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .error-content {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 错误视觉效果 */
.error-visual {
  position: relative;
  margin-bottom: var(--spacing-6);
}

.error-icon {
  font-size: 4rem;
  position: relative;
  z-index: 2;
}

.error-animation {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.error-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80px;
  height: 80px;
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: ripple 2s ease-out infinite;
}

.error-ripple:nth-child(2) {
  animation-delay: 0.5s;
}

.error-ripple:nth-child(3) {
  animation-delay: 1s;
}

@keyframes ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 120px;
    height: 120px;
    opacity: 0;
  }
}

/* 错误信息 */
.error-info {
  margin-bottom: var(--spacing-6);
  max-width: 500px;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-3) 0;
}

[data-theme='dark'] .error-title {
  color: var(--color-neutral-200);
}

.error-message {
  font-size: 1rem;
  color: var(--color-neutral-600);
  line-height: 1.6;
  margin: 0 0 var(--spacing-4) 0;
}

[data-theme='dark'] .error-message {
  color: var(--color-neutral-400);
}

/* 错误详情 */
.error-details {
  margin-top: var(--spacing-4);
  text-align: left;
}

.details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-2) var(--spacing-3);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-700);
  transition: background-color var(--duration-fast);
}

[data-theme='dark'] .details-header {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-neutral-300);
}

.details-header:hover {
  background: rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .details-header:hover {
  background: rgba(255, 255, 255, 0.15);
}

.details-toggle {
  font-size: 0.75rem;
  transition: transform var(--duration-fast);
}

.details-content {
  margin-top: var(--spacing-2);
  padding: var(--spacing-3);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
  max-height: 200px;
  overflow-y: auto;
}

[data-theme='dark'] .details-content {
  background: rgba(255, 255, 255, 0.05);
}

.details-content pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--color-neutral-600);
  white-space: pre-wrap;
  word-wrap: break-word;
}

[data-theme='dark'] .details-content pre {
  color: var(--color-neutral-400);
}

/* 错误操作 */
.error-actions {
  display: flex;
  gap: var(--spacing-3);
  flex-wrap: wrap;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-content {
    padding: var(--spacing-6);
    min-height: 300px;
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-title {
    font-size: 1.25rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>
