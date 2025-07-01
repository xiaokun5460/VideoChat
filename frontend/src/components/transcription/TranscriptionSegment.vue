<!--
  转录片段组件
  显示单个转录片段，支持时间跳转、编辑、高亮搜索等功能
-->
<template>
  <div
    class="transcription-segment"
    :class="{
      'is-selected': isSelected,
      'is-editing': isEditing,
      'has-speaker': segment.speaker,
    }"
    @click="handleSelect"
  >
    <!-- 片段头部 -->
    <div class="segment-header">
      <!-- 时间信息 -->
      <div class="time-info">
        <button
          class="time-button"
          @click.stop="handleSeek(segment.start)"
          :title="`跳转到 ${formatTime(segment.start)}`"
        >
          <span class="time-start">{{ formatTime(segment.start) }}</span>
          <span class="time-separator">-</span>
          <span class="time-end">{{ formatTime(segment.end) }}</span>
        </button>
        <span class="duration">{{ formatDuration(segment.start, segment.end) }}</span>
      </div>

      <!-- 说话人信息 -->
      <div v-if="segment.speaker" class="speaker-info">
        <span class="speaker-label">说话人:</span>
        <span class="speaker-name">{{ segment.speaker }}</span>
      </div>

      <!-- 置信度 -->
      <div v-if="segment.confidence !== undefined" class="confidence-info">
        <span class="confidence-label">置信度:</span>
        <span class="confidence-value" :class="getConfidenceClass(segment.confidence)">
          {{ (segment.confidence * 100).toFixed(1) }}%
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="segment-actions">
        <button
          v-if="!isEditing"
          class="action-button edit-button"
          @click.stop="handleEdit"
          title="编辑片段"
        >
          ✏️
        </button>

        <button
          class="action-button seek-button"
          @click.stop="handleSeek(segment.start)"
          title="跳转播放"
        >
          ▶️
        </button>
      </div>
    </div>

    <!-- 片段内容 -->
    <div class="segment-content">
      <!-- 显示模式 -->
      <div v-if="!isEditing" class="text-display">
        <p class="segment-text" v-html="highlightedText"></p>
      </div>

      <!-- 编辑模式 -->
      <div v-else class="text-editor">
        <NInput
          v-model:value="editText"
          type="textarea"
          :rows="3"
          placeholder="编辑转录文本..."
          @keydown.ctrl.enter="handleSave"
          @keydown.esc="handleCancel"
        />

        <div class="editor-actions">
          <NButton size="small" type="primary" @click="handleSave"> 保存 (Ctrl+Enter) </NButton>

          <NButton size="small" @click="handleCancel"> 取消 (Esc) </NButton>
        </div>
      </div>
    </div>

    <!-- 片段元数据 -->
    <div v-if="showMetadata" class="segment-metadata">
      <div class="metadata-grid">
        <div class="metadata-item">
          <span class="metadata-label">片段ID:</span>
          <span class="metadata-value">{{ segment.id }}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">开始时间:</span>
          <span class="metadata-value">{{ segment.start.toFixed(3) }}s</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">结束时间:</span>
          <span class="metadata-value">{{ segment.end.toFixed(3) }}s</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">字符数:</span>
          <span class="metadata-value">{{ segment.text.length }}</span>
        </div>
      </div>
    </div>

    <!-- 展开/收起按钮 -->
    <div class="segment-footer">
      <button class="metadata-toggle" @click.stop="showMetadata = !showMetadata">
        {{ showMetadata ? '隐藏详情' : '显示详情' }}
        <span class="toggle-icon" :class="{ expanded: showMetadata }">▼</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NInput, NButton } from 'naive-ui'
import type { TranscriptionSegment } from '@/types'

// Props
interface Props {
  segment: TranscriptionSegment
  index: number
  isSelected: boolean
  isEditing: boolean
  searchKeyword?: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  select: [segment: TranscriptionSegment]
  edit: [segment: TranscriptionSegment]
  save: [segment: TranscriptionSegment]
  cancel: []
  seek: [time: number]
}>()

// 响应式状态
const editText = ref(props.segment.text)
const showMetadata = ref(false)

// 计算属性
const highlightedText = computed(() => {
  if (!props.searchKeyword) {
    return props.segment.text
  }

  const keyword = props.searchKeyword
  const regex = new RegExp(`(${keyword})`, 'gi')
  return props.segment.text.replace(regex, '<mark class="search-highlight">$1</mark>')
})

// 工具函数
const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || isNaN(seconds)) return '00:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

const formatDuration = (start: number, end: number): string => {
  const duration = end - start
  return `${duration.toFixed(1)}s`
}

const getConfidenceClass = (confidence: number): string => {
  if (confidence >= 0.8) return 'confidence-high'
  if (confidence >= 0.6) return 'confidence-medium'
  return 'confidence-low'
}

// 事件处理
const handleSelect = () => {
  emit('select', props.segment)
}

const handleEdit = () => {
  editText.value = props.segment.text
  emit('edit', props.segment)
}

const handleSave = () => {
  const updatedSegment: TranscriptionSegment = {
    ...props.segment,
    text: editText.value.trim(),
  }
  emit('save', updatedSegment)
}

const handleCancel = () => {
  editText.value = props.segment.text
  emit('cancel')
}

const handleSeek = (time: number) => {
  emit('seek', time)
}
</script>

<style scoped>
.transcription-segment {
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-neutral-200);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  cursor: pointer;
  margin-bottom: var(--spacing-3);
}

[data-theme='dark'] .transcription-segment {
  border-color: var(--color-neutral-700);
  background: rgba(17, 24, 39, 0.8);
}

.transcription-segment:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-neumorphism-md);
  border-color: var(--color-primary-aurora);
}

.transcription-segment.is-selected {
  border-color: var(--color-primary-aurora);
  background: rgba(16, 185, 129, 0.05);
  box-shadow: var(--shadow-glow);
}

.transcription-segment.is-editing {
  border-color: var(--color-secondary-quantum);
  background: rgba(139, 92, 246, 0.05);
}

/* 片段头部 */
.segment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  margin-bottom: var(--spacing-3);
  flex-wrap: wrap;
}

/* 时间信息 */
.time-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.time-button {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: var(--radius-md);
  color: var(--color-primary-aurora);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-ease-out);
}

.time-button:hover {
  background: rgba(16, 185, 129, 0.2);
  transform: scale(1.05);
}

.time-separator {
  color: var(--color-neutral-500);
}

.duration {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  font-family: var(--font-mono);
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(0, 0, 0, 0.05);
  border-radius: var(--radius-sm);
}

[data-theme='dark'] .duration {
  background: rgba(255, 255, 255, 0.05);
}

/* 说话人信息 */
.speaker-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
}

.speaker-label {
  color: var(--color-neutral-600);
  font-weight: 500;
}

.speaker-name {
  color: var(--color-secondary-quantum);
  font-weight: 600;
}

/* 置信度信息 */
.confidence-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: 0.875rem;
}

.confidence-label {
  color: var(--color-neutral-600);
  font-weight: 500;
}

.confidence-value {
  font-weight: 600;
  font-family: var(--font-mono);
}

.confidence-high {
  color: var(--color-success);
}

.confidence-medium {
  color: var(--color-warning);
}

.confidence-low {
  color: var(--color-error);
}

/* 操作按钮 */
.segment-actions {
  display: flex;
  gap: var(--spacing-1);
  margin-left: auto;
}

.action-button {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-neutral-300);
  background: rgba(255, 255, 255, 0.8);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast) var(--easing-ease-out);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

[data-theme='dark'] .action-button {
  border-color: var(--color-neutral-600);
  background: rgba(17, 24, 39, 0.8);
  color: var(--color-neutral-400);
}

.action-button:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-neumorphism-sm);
}

.edit-button:hover {
  border-color: var(--color-secondary-quantum);
  color: var(--color-secondary-quantum);
}

.seek-button:hover {
  border-color: var(--color-primary-aurora);
  color: var(--color-primary-aurora);
}

/* 片段内容 */
.segment-content {
  margin-bottom: var(--spacing-3);
}

.text-display {
  line-height: 1.6;
}

.segment-text {
  font-size: 1rem;
  color: var(--color-neutral-800);
  margin: 0;
  line-height: 1.6;
}

[data-theme='dark'] .segment-text {
  color: var(--color-neutral-200);
}

/* 搜索高亮 */
:deep(.search-highlight) {
  background: rgba(255, 235, 59, 0.3);
  color: var(--color-neutral-900);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 600;
}

[data-theme='dark'] :deep(.search-highlight) {
  background: rgba(255, 235, 59, 0.4);
  color: var(--color-neutral-100);
}

/* 编辑器 */
.text-editor {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.editor-actions {
  display: flex;
  gap: var(--spacing-2);
  justify-content: flex-end;
}

/* 元数据 */
.segment-metadata {
  padding: var(--spacing-3);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.05);
  margin-bottom: var(--spacing-2);
}

[data-theme='dark'] .segment-metadata {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-2);
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.metadata-label {
  color: var(--color-neutral-600);
  font-weight: 500;
}

[data-theme='dark'] .metadata-label {
  color: var(--color-neutral-400);
}

.metadata-value {
  color: var(--color-neutral-800);
  font-weight: 600;
  font-family: var(--font-mono);
}

[data-theme='dark'] .metadata-value {
  color: var(--color-neutral-200);
}

/* 片段底部 */
.segment-footer {
  display: flex;
  justify-content: center;
}

.metadata-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: transparent;
  border: none;
  color: var(--color-neutral-500);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color var(--duration-fast) var(--easing-ease-out);
}

.metadata-toggle:hover {
  color: var(--color-primary-aurora);
}

.toggle-icon {
  transition: transform var(--duration-normal) var(--easing-ease-in-out);
}

.toggle-icon.expanded {
  transform: rotate(180deg);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .transcription-segment {
    padding: var(--spacing-3);
  }

  .segment-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }

  .segment-actions {
    margin-left: 0;
    align-self: flex-end;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
  }

  .editor-actions {
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .time-info {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
  }

  .speaker-info,
  .confidence-info {
    font-size: 0.75rem;
  }
}
</style>
