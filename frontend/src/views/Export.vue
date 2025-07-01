<!--
  数据导出和视频下载页面
  提供转录数据导出和在线视频下载功能
-->
<template>
  <div class="export-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">导出与下载</h1>
      <p class="page-description">导出转录数据和下载在线视频，支持多种格式和平台</p>
    </div>

    <!-- 功能标签页 -->
    <div class="export-tabs">
      <NTabs
        v-model:value="activeTab"
        type="line"
        size="large"
        :tab-style="{ padding: '12px 24px' }"
        @update:value="handleTabChange"
      >
        <!-- 数据导出 -->
        <NTabPane name="export" tab="📤 数据导出">
          <div class="export-section">
            <!-- 转录数据导出 -->
            <div class="export-card">
              <div class="card-header">
                <h3>转录数据导出</h3>
                <p class="card-description">将转录结果导出为多种格式的文件</p>
              </div>

              <div class="export-content">
                <div v-if="hasTranscriptionData" class="export-available">
                  <div class="data-summary">
                    <div class="summary-item">
                      <span class="summary-label">转录片段</span>
                      <span class="summary-value">{{ transcriptionSegments.length }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">总时长</span>
                      <span class="summary-value">{{ formatDuration(totalDuration) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">说话人数</span>
                      <span class="summary-value">{{ speakerCount }}</span>
                    </div>
                  </div>

                  <div class="export-actions">
                    <NButton type="primary" @click="showExportDialog = true">
                      <template #icon>
                        <span>📤</span>
                      </template>
                      导出转录数据
                    </NButton>
                    <NButton @click="refreshTranscriptionData">
                      <template #icon>
                        <span>🔄</span>
                      </template>
                      刷新数据
                    </NButton>
                  </div>
                </div>

                <div v-else class="export-empty">
                  <div class="empty-icon">📝</div>
                  <h4 class="empty-title">暂无转录数据</h4>
                  <p class="empty-description">请先完成音视频转录，然后即可导出转录数据</p>
                  <NButton type="primary" @click="$router.push('/transcription')">
                    开始转录
                  </NButton>
                </div>
              </div>
            </div>

            <!-- AI结果导出 -->
            <div class="export-card">
              <div class="card-header">
                <h3>AI分析结果导出</h3>
                <p class="card-description">导出AI总结、思维导图、评估报告等分析结果</p>
              </div>

              <div class="export-content">
                <div class="ai-export-options">
                  <div class="export-option">
                    <div class="option-info">
                      <h5>智能总结</h5>
                      <p>导出AI生成的内容总结</p>
                    </div>
                    <NButton @click="exportAISummary">导出总结</NButton>
                  </div>

                  <div class="export-option">
                    <div class="option-info">
                      <h5>思维导图</h5>
                      <p>导出可视化思维导图</p>
                    </div>
                    <NButton @click="exportMindmap">导出导图</NButton>
                  </div>

                  <div class="export-option">
                    <div class="option-info">
                      <h5>评估报告</h5>
                      <p>导出AI教学评估报告</p>
                    </div>
                    <NButton @click="exportEvaluation">导出报告</NButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NTabPane>

        <!-- 视频下载 -->
        <NTabPane name="download" tab="📥 视频下载">
          <VideoDownload />
        </NTabPane>
      </NTabs>
    </div>

    <!-- 导出对话框 -->
    <ExportDialog
      v-model:visible="showExportDialog"
      :segments="transcriptionSegments"
      @export-complete="handleExportComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NTabs, NTabPane, NButton, useMessage } from 'naive-ui'
import { useTranscription } from '@/composables/useTranscription'
import { VideoDownload } from '@/components/download'
import { ExportDialog } from '@/components/export'
import type { ExportFormat } from '@/types'

const message = useMessage()
const { currentTranscription } = useTranscription()

// 响应式状态
const activeTab = ref('export')
const showExportDialog = ref(false)

// 计算属性
const transcriptionSegments = computed(() => {
  return currentTranscription.value?.segments || []
})

const hasTranscriptionData = computed(() => {
  return transcriptionSegments.value.length > 0
})

const totalDuration = computed(() => {
  if (!hasTranscriptionData.value) return 0
  const lastSegment = transcriptionSegments.value[transcriptionSegments.value.length - 1]
  return lastSegment?.end || 0
})

const speakerCount = computed(() => {
  if (!hasTranscriptionData.value) return 0
  const speakers = new Set(
    transcriptionSegments.value.map((segment) => segment.speaker).filter((speaker) => speaker),
  )
  return speakers.size
})

// 方法
const handleTabChange = (tabName: string) => {
  console.log('切换到标签页:', tabName)
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

const refreshTranscriptionData = () => {
  // 刷新转录数据
  message.info('转录数据已刷新')
}

const handleExportComplete = (formats: ExportFormat[]) => {
  message.success(`成功导出${formats.length}种格式的文件`)
}

const exportAISummary = async () => {
  // TODO: 获取AI总结内容并导出
  message.info('AI总结导出功能开发中')
}

const exportMindmap = async () => {
  // TODO: 获取思维导图内容并导出
  message.info('思维导图导出功能开发中')
}

const exportEvaluation = async () => {
  // TODO: 获取评估报告内容并导出
  message.info('评估报告导出功能开发中')
}

// 生命周期
onMounted(() => {
  console.log('Export page mounted')
})
</script>

<style scoped>
.export-page {
  max-width: 1200px;
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
  max-width: 600px;
  margin: 0 auto;
}

[data-theme='dark'] .page-description {
  color: var(--color-neutral-400);
}

/* 导出标签页 */
.export-tabs {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .export-tabs {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

/* 导出区域 */
.export-section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.export-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

[data-theme='dark'] .export-card {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.card-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .card-header h3 {
  color: var(--color-neutral-200);
}

.card-description {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0 0 var(--spacing-4) 0;
}

[data-theme='dark'] .card-description {
  color: var(--color-neutral-400);
}

/* 数据摘要 */
.data-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-4);
  margin-bottom: var(--spacing-4);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-3);
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-lg);
}

.summary-label {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin-bottom: var(--spacing-1);
}

[data-theme='dark'] .summary-label {
  color: var(--color-neutral-400);
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-primary-aurora);
}

.export-actions {
  display: flex;
  gap: var(--spacing-3);
  justify-content: center;
}

/* 空状态 */
.export-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--spacing-8);
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
  margin: 0 0 var(--spacing-4) 0;
  max-width: 300px;
}

/* AI导出选项 */
.ai-export-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.export-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  transition: all var(--duration-fast) var(--easing-ease-out);
}

[data-theme='dark'] .export-option {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.export-option:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
}

.option-info h5 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-1) 0;
}

[data-theme='dark'] .option-info h5 {
  color: var(--color-neutral-200);
}

.option-info p {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0;
}

[data-theme='dark'] .option-info p {
  color: var(--color-neutral-400);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .export-page {
    padding: var(--spacing-4);
  }

  .page-title {
    font-size: 2rem;
  }

  .export-tabs {
    padding: var(--spacing-4);
  }

  .data-summary {
    grid-template-columns: 1fr;
  }

  .export-actions {
    flex-direction: column;
    align-items: center;
  }

  .export-option {
    flex-direction: column;
    gap: var(--spacing-3);
    text-align: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
  }

  .export-card {
    padding: var(--spacing-4);
  }
}
</style>
