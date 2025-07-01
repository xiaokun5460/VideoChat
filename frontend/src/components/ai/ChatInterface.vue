<!--
  AI对话组件
  提供基于转录内容的智能对话功能，支持上下文对话和流式响应
-->
<template>
  <div class="chat-interface">
    <!-- 对话历史 -->
    <div class="chat-history" ref="chatHistoryRef">
      <div v-if="messages.length === 0" class="empty-chat">
        <div class="empty-icon">💬</div>
        <h4 class="empty-title">开始AI对话</h4>
        <p class="empty-description">基于转录内容与AI进行智能对话，获取深入的内容分析和解答</p>
      </div>

      <div v-else class="message-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{
            'user-message': message.role === 'user',
            'ai-message': message.role === 'assistant',
          }"
        >
          <div class="message-avatar">
            <span v-if="message.role === 'user'">👤</span>
            <span v-else>🤖</span>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessageContent(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <!-- 正在输入指示器 -->
        <div v-if="isTyping" class="message-item ai-message typing">
          <div class="message-avatar">
            <span>🤖</span>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
              <span class="typing-dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input">
      <div class="input-container">
        <NInput
          v-model:value="inputMessage"
          type="textarea"
          placeholder="输入您的问题..."
          :autosize="{ minRows: 1, maxRows: 4 }"
          :disabled="isSending"
          @keydown="handleKeyDown"
        />
        <div class="input-actions">
          <NButton v-if="!isSending" type="primary" :disabled="!canSend" @click="sendMessage">
            <template #icon>
              <span>📤</span>
            </template>
            发送
          </NButton>
          <NButton v-else type="error" @click="stopSending">
            <template #icon>
              <span>⏹️</span>
            </template>
            停止
          </NButton>
        </div>
      </div>

      <!-- 快捷问题 -->
      <div v-if="messages.length === 0" class="quick-questions">
        <h5>快捷问题</h5>
        <div class="question-chips">
          <NButton
            v-for="question in quickQuestions"
            :key="question"
            size="small"
            secondary
            @click="selectQuickQuestion(question)"
          >
            {{ question }}
          </NButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { NInput, NButton, useMessage } from 'naive-ui'
import { useStreamingResponse } from '@/composables/useStreamingResponse'
import type { AIChatMessage } from '@/types'

// Props
interface Props {
  fileId: string
  transcriptionText: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'message-sent': [message: AIChatMessage]
}>()

const message = useMessage()
const { isStreaming, startStreaming, abortStreaming } = useStreamingResponse()

// 响应式状态
const messages = ref<AIChatMessage[]>([])
const inputMessage = ref('')
const isTyping = ref(false)
const chatHistoryRef = ref<HTMLElement>()
const currentStreamingMessage = ref<AIChatMessage | null>(null)

// 快捷问题
const quickQuestions = [
  '请总结这段内容的主要观点',
  '这段内容有哪些关键信息？',
  '能否解释一下其中的重点概念？',
  '这段内容的逻辑结构是什么？',
  '有什么值得深入思考的地方？',
]

// 计算属性
const canSend = computed(() => inputMessage.value.trim().length > 0 && !isSending.value)
const isSending = computed(() => isStreaming.value || isTyping.value)

// 方法
const sendMessage = async () => {
  const messageText = inputMessage.value.trim()
  if (!messageText || !props.transcriptionText) return

  // 添加用户消息
  const userMessage: AIChatMessage = {
    id: generateMessageId(),
    role: 'user',
    content: messageText,
    timestamp: new Date(),
  }
  messages.value.push(userMessage)
  inputMessage.value = ''

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 创建AI响应消息
  const aiMessage: AIChatMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: '',
    timestamp: new Date(),
  }
  messages.value.push(aiMessage)
  currentStreamingMessage.value = aiMessage

  try {
    // 启动流式响应
    await startStreaming(
      '/api/chat',
      {
        messages: messages.value.slice(0, -1), // 不包含当前正在生成的消息
        context: props.transcriptionText,
      },
      {
        onStart: () => {
          isTyping.value = true
        },
        onChunk: (chunk: string) => {
          if (currentStreamingMessage.value) {
            currentStreamingMessage.value.content += chunk
            scrollToBottom()
          }
        },
        onComplete: (fullContent: string) => {
          if (currentStreamingMessage.value) {
            currentStreamingMessage.value.content = fullContent
            currentStreamingMessage.value.timestamp = new Date()
          }
          isTyping.value = false
          currentStreamingMessage.value = null
          emit('message-sent', aiMessage)
        },
        onError: (error: string) => {
          isTyping.value = false
          if (currentStreamingMessage.value) {
            currentStreamingMessage.value.content = '抱歉，回复生成失败，请稍后重试。'
          }
          currentStreamingMessage.value = null
          console.error('AI对话失败:', error)
        },
        onAbort: () => {
          isTyping.value = false
          if (currentStreamingMessage.value) {
            currentStreamingMessage.value.content = '回复已中断。'
          }
          currentStreamingMessage.value = null
        },
      },
    )
  } catch (error) {
    isTyping.value = false
    message.error('发送消息失败')
    console.error('发送消息错误:', error)
  }
}

const stopSending = () => {
  abortStreaming()
  isTyping.value = false
  if (currentStreamingMessage.value) {
    currentStreamingMessage.value.content += '\n\n[回复已中断]'
  }
  currentStreamingMessage.value = null
}

const selectQuickQuestion = (question: string) => {
  inputMessage.value = question
  sendMessage()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    if (canSend.value) {
      sendMessage()
    }
  }
}

const formatMessageContent = (content: string) => {
  if (!content) return ''

  // 将Markdown格式转换为HTML
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^(.*)$/, '<p>$1</p>')
}

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const scrollToBottom = () => {
  if (chatHistoryRef.value) {
    chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight
  }
}

// 生命周期
onMounted(() => {
  console.log('ChatInterface mounted, fileId:', props.fileId)
})

onUnmounted(() => {
  abortStreaming()
})
</script>

<style scoped>
.chat-interface {
  display: flex;
  flex-direction: column;
  height: 600px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

[data-theme='dark'] .chat-interface {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 对话历史 */
.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-4);
  scroll-behavior: smooth;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
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
  line-height: 1.5;
}

/* 消息列表 */
.message-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.message-item {
  display: flex;
  gap: var(--spacing-3);
  align-items: flex-start;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.user-message .message-avatar {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.user-message .message-content {
  text-align: right;
}

.message-text {
  background: rgba(255, 255, 255, 0.8);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--color-neutral-700);
  word-wrap: break-word;
}

[data-theme='dark'] .message-text {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--color-neutral-300);
}

.user-message .message-text {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
}

.ai-message .message-text {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.message-text :deep(strong) {
  font-weight: 600;
  color: var(--color-neutral-800);
}

[data-theme='dark'] .message-text :deep(strong) {
  color: var(--color-neutral-200);
}

.message-text :deep(em) {
  font-style: italic;
  color: var(--color-primary-aurora);
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.8em;
}

[data-theme='dark'] .message-text :deep(code) {
  background: rgba(255, 255, 255, 0.1);
}

.message-text :deep(p) {
  margin: 0 0 var(--spacing-2) 0;
}

.message-text :deep(p:last-child) {
  margin-bottom: 0;
}

.message-time {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin-top: var(--spacing-1);
  font-family: var(--font-mono);
}

.user-message .message-time {
  text-align: right;
}

/* 正在输入指示器 */
.typing .message-text {
  padding: var(--spacing-2) var(--spacing-3);
}

.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary-aurora);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 输入区域 */
.chat-input {
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
}

[data-theme='dark'] .chat-input {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.input-container {
  display: flex;
  gap: var(--spacing-3);
  align-items: flex-end;
}

.input-container :deep(.n-input) {
  flex: 1;
}

.input-actions {
  flex-shrink: 0;
}

/* 快捷问题 */
.quick-questions {
  margin-top: var(--spacing-4);
}

.quick-questions h5 {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .quick-questions h5 {
  color: var(--color-neutral-400);
}

.question-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-interface {
    height: 500px;
  }

  .message-content {
    max-width: 90%;
  }

  .input-container {
    flex-direction: column;
    align-items: stretch;
  }

  .question-chips {
    flex-direction: column;
  }
}
</style>
