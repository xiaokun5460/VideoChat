<!--
  导出对话框组件
  提供多格式导出选择和配置功能
-->
<template>
  <NModal v-model:show="visible" preset="card" title="导出设置" style="width: 600px">
    <div class="export-dialog">
      <!-- 导出格式选择 -->
      <div class="format-selection">
        <h4>选择导出格式</h4>
        <div class="format-grid">
          <div
            v-for="format in formatOptions"
            :key="format.value"
            class="format-item"
            :class="{ active: selectedFormats.includes(format.value) }"
            @click="toggleFormat(format.value)"
          >
            <div class="format-icon">{{ format.icon }}</div>
            <div class="format-info">
              <h5>{{ format.label }}</h5>
              <p>{{ format.description }}</p>
            </div>
            <div class="format-checkbox">
              <NCheckbox :checked="selectedFormats.includes(format.value)" />
            </div>
          </div>
        </div>
      </div>

      <!-- 导出选项 -->
      <div class="export-options">
        <h4>导出选项</h4>
        <div class="options-grid">
          <div class="option-item">
            <NSwitch v-model:value="exportOptions.includeTimestamps">
              <template #checked>包含时间戳</template>
              <template #unchecked>包含时间戳</template>
            </NSwitch>
            <p class="option-desc">在导出文件中包含精确的时间戳信息</p>
          </div>

          <div class="option-item">
            <NSwitch v-model:value="exportOptions.includeSpeakers">
              <template #checked>包含说话人</template>
              <template #unchecked>包含说话人</template>
            </NSwitch>
            <p class="option-desc">标识不同的说话人信息</p>
          </div>

          <div class="option-item">
            <NSwitch v-model:value="exportOptions.includeConfidence">
              <template #checked>包含置信度</template>
              <template #unchecked>包含置信度</template>
            </NSwitch>
            <p class="option-desc">包含转录准确度的置信度分数</p>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div v-if="previewContent" class="preview-section">
        <h4>导出预览</h4>
        <div class="preview-content">
          <pre><code>{{ previewContent }}</code></pre>
        </div>
      </div>

      <!-- 进度显示 -->
      <div v-if="isExporting" class="export-progress">
        <div class="progress-info">
          <span>正在导出...</span>
          <span>{{ exportProgress }}%</span>
        </div>
        <NProgress type="line" :percentage="exportProgress" :show-indicator="false" status="info" />
      </div>

      <!-- 错误信息 -->
      <div v-if="hasError" class="error-section">
        <NAlert type="error" :title="exportError || '导出失败'"> 请检查设置后重试 </NAlert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <NButton @click="handleCancel">取消</NButton>
        <NButton @click="generatePreview" :disabled="selectedFormats.length === 0"> 预览 </NButton>
        <NButton
          type="primary"
          :loading="isExporting"
          :disabled="selectedFormats.length === 0"
          @click="handleExport"
        >
          {{ selectedFormats.length > 1 ? '批量导出' : '导出' }}
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NCheckbox, NSwitch, NProgress, NAlert, NButton } from 'naive-ui'
import { useExport } from '@/composables/useExport'
import type { TranscriptionSegment, ExportFormat, ExportOptions } from '@/types'

// Props
interface Props {
  visible: boolean
  segments: TranscriptionSegment[]
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [visible: boolean]
  'export-complete': [formats: ExportFormat[]]
}>()

const { isExporting, exportProgress, exportError, hasError, exportTranscription, batchExport } =
  useExport()

// 响应式状态
const selectedFormats = ref<ExportFormat[]>(['vtt'])
const exportOptions = ref<ExportOptions>({
  format: 'vtt',
  includeTimestamps: true,
  includeSpeakers: true,
  includeConfidence: false,
})
const previewContent = ref('')

// 格式选项
const formatOptions = [
  {
    value: 'vtt' as ExportFormat,
    label: 'VTT字幕',
    icon: '🎬',
    description: 'WebVTT格式，适用于网页播放器',
  },
  {
    value: 'srt' as ExportFormat,
    label: 'SRT字幕',
    icon: '📺',
    description: 'SubRip格式，通用性最强',
  },
  {
    value: 'txt' as ExportFormat,
    label: '纯文本',
    icon: '📝',
    description: '纯文本格式，仅包含文字内容',
  },
  {
    value: 'json' as ExportFormat,
    label: 'JSON数据',
    icon: '📊',
    description: '结构化数据，包含完整信息',
  },
]

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
})

// 方法
const toggleFormat = (format: ExportFormat) => {
  const index = selectedFormats.value.indexOf(format)
  if (index > -1) {
    selectedFormats.value.splice(index, 1)
  } else {
    selectedFormats.value.push(format)
  }
}

const generatePreview = () => {
  if (!props.segments || props.segments.length === 0) {
    previewContent.value = '没有可预览的内容'
    return
  }

  const format = selectedFormats.value[0]
  const sampleSegments = props.segments.slice(0, 3) // 只预览前3个片段

  switch (format) {
    case 'vtt':
      previewContent.value = generateVTTPreview(sampleSegments)
      break
    case 'srt':
      previewContent.value = generateSRTPreview(sampleSegments)
      break
    case 'txt':
      previewContent.value = generateTXTPreview(sampleSegments)
      break
    case 'json':
      previewContent.value = generateJSONPreview(sampleSegments)
      break
    default:
      previewContent.value = '不支持的格式'
  }
}

const generateVTTPreview = (segments: TranscriptionSegment[]) => {
  let content = 'WEBVTT\n\n'
  segments.forEach((segment) => {
    const start = formatTimestamp(segment.start)
    const end = formatTimestamp(segment.end)
    content += `${start} --> ${end}\n`
    if (exportOptions.value.includeSpeakers && segment.speaker) {
      content += `<v ${segment.speaker}>${segment.text}</v>\n\n`
    } else {
      content += `${segment.text}\n\n`
    }
  })
  return content + '...'
}

const generateSRTPreview = (segments: TranscriptionSegment[]) => {
  let content = ''
  segments.forEach((segment, index) => {
    const start = formatTimestamp(segment.start, true)
    const end = formatTimestamp(segment.end, true)
    content += `${index + 1}\n${start} --> ${end}\n`
    if (exportOptions.value.includeSpeakers && segment.speaker) {
      content += `[${segment.speaker}] ${segment.text}\n\n`
    } else {
      content += `${segment.text}\n\n`
    }
  })
  return content + '...'
}

const generateTXTPreview = (segments: TranscriptionSegment[]) => {
  return (
    segments
      .map((segment) => {
        let text = segment.text
        if (exportOptions.value.includeSpeakers && segment.speaker) {
          text = `[${segment.speaker}] ${text}`
        }
        if (exportOptions.value.includeTimestamps) {
          text = `[${formatTimestamp(segment.start)}] ${text}`
        }
        return text
      })
      .join('\n') + '\n...'
  )
}

const generateJSONPreview = (segments: TranscriptionSegment[]) => {
  const data = segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    text: segment.text,
    ...(exportOptions.value.includeSpeakers && segment.speaker && { speaker: segment.speaker }),
    ...(exportOptions.value.includeConfidence &&
      segment.confidence && { confidence: segment.confidence }),
  }))
  return JSON.stringify(data, null, 2) + '\n...'
}

const formatTimestamp = (seconds: number, srt = false) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  if (srt) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

const handleExport = async () => {
  if (selectedFormats.value.length === 1) {
    // 单个格式导出
    await exportTranscription(props.segments, selectedFormats.value[0], exportOptions.value)
  } else {
    // 批量导出
    await batchExport(props.segments, selectedFormats.value, exportOptions.value)
  }

  if (!hasError.value) {
    emit('export-complete', selectedFormats.value)
    visible.value = false
  }
}

const handleCancel = () => {
  visible.value = false
  previewContent.value = ''
}

// 监听格式变化，自动生成预览
watch(
  selectedFormats,
  () => {
    if (selectedFormats.value.length > 0 && previewContent.value) {
      generatePreview()
    }
  },
  { deep: true },
)

watch(
  () => exportOptions.value,
  () => {
    if (previewContent.value) {
      generatePreview()
    }
  },
  { deep: true },
)
</script>

<style scoped>
.export-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

/* 格式选择 */
.format-selection h4,
.export-options h4,
.preview-section h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-3) 0;
}

[data-theme='dark'] .format-selection h4,
[data-theme='dark'] .export-options h4,
[data-theme='dark'] .preview-section h4 {
  color: var(--color-neutral-200);
}

.format-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--spacing-3);
}

.format-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border: 2px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-ease-out);
  background: rgba(255, 255, 255, 0.5);
}

[data-theme='dark'] .format-item {
  border-color: var(--color-neutral-600);
  background: rgba(0, 0, 0, 0.2);
}

.format-item:hover {
  border-color: var(--color-primary-aurora);
  background: rgba(16, 185, 129, 0.05);
}

.format-item.active {
  border-color: var(--color-primary-aurora);
  background: rgba(16, 185, 129, 0.1);
}

.format-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.format-info {
  flex: 1;
}

.format-info h5 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-1) 0;
}

[data-theme='dark'] .format-info h5 {
  color: var(--color-neutral-200);
}

.format-info p {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0;
}

[data-theme='dark'] .format-info p {
  color: var(--color-neutral-400);
}

.format-checkbox {
  flex-shrink: 0;
}

/* 导出选项 */
.options-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.option-desc {
  font-size: 0.875rem;
  color: var(--color-neutral-500);
  margin: 0;
  margin-left: var(--spacing-6);
}

/* 预览区域 */
.preview-content {
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  max-height: 200px;
  overflow-y: auto;
}

[data-theme='dark'] .preview-content {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--color-neutral-600);
}

.preview-content pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-neutral-700);
  white-space: pre-wrap;
  word-wrap: break-word;
}

[data-theme='dark'] .preview-content pre {
  color: var(--color-neutral-300);
}

/* 进度显示 */
.export-progress {
  padding: var(--spacing-4);
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-lg);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2);
  font-size: 0.875rem;
  color: var(--color-neutral-600);
}

[data-theme='dark'] .progress-info {
  color: var(--color-neutral-400);
}

/* 错误信息 */
.error-section {
  margin-top: var(--spacing-2);
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  gap: var(--spacing-3);
  justify-content: flex-end;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .format-item {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-2);
  }

  .format-info {
    order: 2;
  }

  .format-checkbox {
    order: 3;
  }

  .dialog-footer {
    flex-direction: column;
  }
}
</style>
