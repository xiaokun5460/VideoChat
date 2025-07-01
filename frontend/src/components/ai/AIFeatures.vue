<!--
  AI功能主组件
  提供标签页式的AI功能切换，包括智能总结、思维导图、AI对话等
-->
<template>
  <div class="ai-features">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">AI智能分析</h1>
      <p class="page-description">基于转录内容的智能分析和交互功能</p>
    </div>

    <!-- 功能标签页 -->
    <div class="ai-tabs">
      <NTabs
        v-model:value="activeTab"
        type="line"
        size="large"
        :tab-style="{ padding: '12px 24px' }"
        @update:value="handleTabChange"
      >
        <!-- 智能总结 -->
        <NTabPane name="summary" tab="📝 智能总结">
          <SummaryView
            :file-id="currentFileId"
            :transcription-text="transcriptionText"
            @summary-generated="handleSummaryGenerated"
          />
        </NTabPane>

        <!-- 思维导图 -->
        <NTabPane name="mindmap" tab="🧠 思维导图">
          <MindmapView
            :file-id="currentFileId"
            :transcription-text="transcriptionText"
            @mindmap-generated="handleMindmapGenerated"
          />
        </NTabPane>

        <!-- AI对话 -->
        <NTabPane name="chat" tab="💬 AI对话">
          <ChatInterface
            :file-id="currentFileId"
            :transcription-text="transcriptionText"
            @message-sent="handleMessageSent"
          />
        </NTabPane>

        <!-- AI评估 -->
        <NTabPane name="evaluation" tab="📊 AI评估">
          <EvaluationView
            :file-id="currentFileId"
            :transcription-text="transcriptionText"
            @evaluation-generated="handleEvaluationGenerated"
          />
        </NTabPane>
      </NTabs>
    </div>

    <!-- 空状态 -->
    <div v-if="!hasTranscriptionText" class="empty-state">
      <div class="empty-icon">🤖</div>
      <h3 class="empty-title">AI功能需要转录内容</h3>
      <p class="empty-description">请先上传音视频文件并完成转录，然后即可使用AI智能分析功能</p>
      <div class="empty-actions">
        <NButton type="primary" @click="$router.push('/upload')"> 上传文件 </NButton>
        <NButton @click="$router.push('/transcription')"> 查看转录 </NButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NTabs, NTabPane, NButton, useMessage } from 'naive-ui'
import { useFilesStore } from '@/stores/files'
import { useTranscription } from '@/composables/useTranscription'
import SummaryView from './SummaryView.vue'
import MindmapView from './MindmapView.vue'
import ChatInterface from './ChatInterface.vue'
import EvaluationView from './EvaluationView.vue'

const message = useMessage()
const filesStore = useFilesStore()
const { currentTranscription } = useTranscription()

// 响应式状态
const activeTab = ref('summary')

// 计算属性
const currentFileId = computed(() => filesStore.currentFile?.id || '')
const transcriptionText = computed(() => {
  if (!currentTranscription.value) return ''
  return currentTranscription.value.segments.map((segment) => segment.text).join(' ')
})
const hasTranscriptionText = computed(() => transcriptionText.value.length > 0)

// 方法
const handleTabChange = (tabName: string) => {
  console.log('切换到标签页:', tabName)
}

const handleSummaryGenerated = (summary: any) => {
  console.log('总结生成完成:', summary)
  message.success('智能总结生成完成')
}

const handleMindmapGenerated = (mindmap: any) => {
  console.log('思维导图生成完成:', mindmap)
  message.success('思维导图生成完成')
}

const handleMessageSent = (message: any) => {
  console.log('AI对话消息:', message)
}

const handleEvaluationGenerated = (evaluation: any) => {
  console.log('AI评估生成完成:', evaluation)
  message.success('AI评估生成完成')
}

// 生命周期
onMounted(() => {
  // 检查是否有当前文件和转录内容
  if (!currentFileId.value) {
    console.log('没有当前文件，建议用户先上传文件')
  }
})

// 监听文件变化
watch(currentFileId, (newFileId) => {
  if (newFileId) {
    console.log('当前文件ID:', newFileId)
  }
})
</script>

<style scoped>
.ai-features {
  max-width: 1200px;
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

/* AI标签页 */
.ai-tabs {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .ai-tabs {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-12);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .empty-state {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-4);
  opacity: 0.6;
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
  margin: 0 0 var(--spacing-6) 0;
  max-width: 400px;
  line-height: 1.6;
}

.empty-actions {
  display: flex;
  gap: var(--spacing-3);
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .ai-features {
    padding: var(--spacing-4);
  }

  .page-title {
    font-size: 2rem;
  }

  .ai-tabs {
    padding: var(--spacing-4);
  }

  .empty-actions {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
  }

  .empty-state {
    padding: var(--spacing-8);
  }
}
</style>
