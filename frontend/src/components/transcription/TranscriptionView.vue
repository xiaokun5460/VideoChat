<!--
  转录结果展示组件
  显示转录文本、时间轴、说话人信息，支持搜索、编辑、导出等功能
-->
<template>
  <div class="transcription-view">
    <!-- 工具栏 -->
    <div class="toolbar glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
      <!-- 搜索区域 -->
      <div class="search-section">
        <div class="search-input-group">
          <NInput
            v-model:value="searchKeyword"
            placeholder="搜索转录内容..."
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <span class="search-icon">🔍</span>
            </template>
          </NInput>
        </div>

        <!-- 过滤器 -->
        <div class="filter-group">
          <NSelect
            v-model:value="selectedSpeaker"
            placeholder="选择说话人"
            clearable
            :options="speakerOptions"
            style="width: 150px"
            @update:value="handleSpeakerFilter"
          />

          <NInputNumber
            v-model:value="confidenceThreshold"
            placeholder="置信度"
            :min="0"
            :max="1"
            :step="0.1"
            style="width: 120px"
            @update:value="handleConfidenceFilter"
          />
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <NButton size="small" @click="showStats = !showStats">
          {{ showStats ? '隐藏统计' : '显示统计' }}
        </NButton>

        <NDropdown :options="exportOptions" @select="handleExport">
          <NButton size="small" type="primary">
            导出
            <template #icon>
              <span>📥</span>
            </template>
          </NButton>
        </NDropdown>

        <NButton size="small" type="success" @click="$emit('start-editing')"> 编辑模式 </NButton>
      </div>
    </div>

    <!-- 统计信息 -->
    <div
      v-if="showStats"
      class="stats-panel glass-effect"
      :class="isDark ? 'glass-dark' : 'glass-light'"
    >
      <h4 class="stats-title">转录统计</h4>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">总片段</span>
          <span class="stat-value">{{ transcriptionStats.totalSegments }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总时长</span>
          <span class="stat-value">{{ formatTime(transcriptionStats.totalDuration) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">说话人数</span>
          <span class="stat-value">{{ transcriptionStats.speakerCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">字数统计</span>
          <span class="stat-value">{{ transcriptionStats.wordCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">平均置信度</span>
          <span class="stat-value"
            >{{ (transcriptionStats.averageConfidence * 100).toFixed(1) }}%</span
          >
        </div>
        <div class="stat-item">
          <span class="stat-label">匹配结果</span>
          <span class="stat-value">{{ filteredSegments.length }} / {{ totalSegments }}</span>
        </div>
      </div>
    </div>

    <!-- 转录内容 -->
    <div class="transcription-content">
      <!-- 无结果提示 -->
      <div v-if="filteredSegments.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">没有找到匹配的内容</h3>
        <p class="empty-description">
          {{ searchKeyword ? '尝试调整搜索关键词或过滤条件' : '暂无转录内容' }}
        </p>
        <NButton v-if="searchKeyword" @click="clearFilters">清除搜索条件</NButton>
      </div>

      <!-- 转录片段列表 -->
      <div v-else class="segments-list">
        <TranscriptionSegment
          v-for="(segment, index) in paginatedSegments"
          :key="segment.id"
          :segment="segment"
          :index="startIndex + index"
          :is-selected="selectedSegment?.id === segment.id"
          :is-editing="editingSegment?.id === segment.id"
          :search-keyword="searchKeyword"
          @select="handleSegmentSelect"
          @edit="handleSegmentEdit"
          @save="handleSegmentSave"
          @cancel="handleSegmentCancel"
          @seek="handleSeek"
        />
      </div>

      <!-- 分页 -->
      <div v-if="totalPages > 1" class="pagination-section">
        <NPagination
          v-model:page="currentPage"
          :page-count="totalPages"
          :page-size="pageSize"
          :show-size-picker="true"
          :page-sizes="[10, 20, 50, 100]"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NInput,
  NSelect,
  NInputNumber,
  NButton,
  NDropdown,
  NPagination,
  useMessage,
} from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import { useTranscription } from '@/composables/useTranscription'
import TranscriptionSegment from './TranscriptionSegment.vue'
import type { TranscriptionSegment as SegmentType } from '@/types'

// Props
interface Props {
  segments: SegmentType[]
  speakers: string[]
  stats: {
    totalSegments: number
    totalDuration: number
    speakerCount: number
    wordCount: number
    averageConfidence: number
  }
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'segment-select': [segment: SegmentType]
  'segment-edit': [segment: SegmentType]
  'segment-save': [segment: SegmentType]
  'seek-to-time': [time: number]
  'start-editing': []
  export: [format: string, options?: any]
}>()

const { isDark } = useTheme()
const message = useMessage()
const {
  selectedSegment,
  editingSegment,
  updateSearchFilters,
  clearSearchFilters,
  selectSegment,
  startEditingSegment,
  saveSegmentEdit,
  cancelSegmentEdit,
  formatTime,
} = useTranscription()

// 响应式状态
const searchKeyword = ref('')
const selectedSpeaker = ref<string | null>(null)
const confidenceThreshold = ref<number | null>(null)
const showStats = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// 计算属性
const speakerOptions = computed(() => {
  return props.speakers.map((speaker) => ({
    label: speaker || '未知说话人',
    value: speaker,
  }))
})

const exportOptions = computed(() => [
  { label: 'VTT字幕', key: 'vtt' },
  { label: 'SRT字幕', key: 'srt' },
  { label: '纯文本', key: 'txt' },
  { label: 'JSON数据', key: 'json' },
])

const filteredSegments = computed(() => {
  let segments = props.segments

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    segments = segments.filter((segment) => segment.text.toLowerCase().includes(keyword))
  }

  // 说话人过滤
  if (selectedSpeaker.value) {
    segments = segments.filter((segment) => segment.speaker === selectedSpeaker.value)
  }

  // 置信度过滤
  if (confidenceThreshold.value !== null) {
    segments = segments.filter((segment) => (segment.confidence || 1) >= confidenceThreshold.value!)
  }

  return segments
})

const totalSegments = computed(() => props.segments.length)
const totalPages = computed(() => Math.ceil(filteredSegments.value.length / pageSize.value))
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)

const paginatedSegments = computed(() => {
  const start = startIndex.value
  const end = start + pageSize.value
  return filteredSegments.value.slice(start, end)
})

const transcriptionStats = computed(() => props.stats)

// 方法
const handleSearch = (value: string) => {
  searchKeyword.value = value
  currentPage.value = 1
  updateSearchFilters({ keyword: value })
}

const handleSpeakerFilter = (speaker: string | null) => {
  selectedSpeaker.value = speaker
  currentPage.value = 1
  if (speaker) {
    updateSearchFilters({ speaker })
  } else {
    updateSearchFilters({ speaker: undefined })
  }
}

const handleConfidenceFilter = (confidence: number | null) => {
  confidenceThreshold.value = confidence
  currentPage.value = 1
  if (confidence !== null) {
    updateSearchFilters({ confidence })
  } else {
    updateSearchFilters({ confidence: undefined })
  }
}

const clearFilters = () => {
  searchKeyword.value = ''
  selectedSpeaker.value = null
  confidenceThreshold.value = null
  currentPage.value = 1
  clearSearchFilters()
}

const handlePageSizeChange = (newPageSize: number) => {
  pageSize.value = newPageSize
  currentPage.value = 1
}

const handleSegmentSelect = (segment: SegmentType) => {
  selectSegment(segment)
  emit('segment-select', segment)
}

const handleSegmentEdit = (segment: SegmentType) => {
  startEditingSegment(segment)
  emit('segment-edit', segment)
}

const handleSegmentSave = async (segment: SegmentType) => {
  try {
    await saveSegmentEdit(segment)
    emit('segment-save', segment)
    message.success('片段保存成功')
  } catch (error) {
    message.error('片段保存失败')
    console.error('保存片段失败:', error)
  }
}

const handleSegmentCancel = () => {
  cancelSegmentEdit()
}

const handleSeek = (time: number) => {
  emit('seek-to-time', time)
}

const handleExport = async (key: string) => {
  try {
    const options = {
      includeTimestamps: true,
      includeSpeakers: true,
      includeConfidence: key === 'json',
    }

    emit('export', key, options)
    message.success(`开始导出${exportOptions.value.find((opt) => opt.key === key)?.label}`)
  } catch (error) {
    message.error('导出失败')
    console.error('导出失败:', error)
  }
}

// 监听器
watch(
  () => props.segments,
  () => {
    currentPage.value = 1
  },
)
</script>

<style scoped>
.transcription-view {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  height: 100%;
}

/* 工具栏 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  gap: var(--spacing-4);
}

.search-section {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex: 1;
}

.search-input-group {
  min-width: 300px;
}

.search-icon {
  color: var(--color-neutral-500);
}

.filter-group {
  display: flex;
  gap: var(--spacing-2);
}

.action-section {
  display: flex;
  gap: var(--spacing-2);
  flex-shrink: 0;
}

/* 统计面板 */
.stats-panel {
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
}

.stats-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-3) 0;
}

[data-theme='dark'] .stats-title {
  color: var(--color-neutral-200);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--spacing-3);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--spacing-3);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

[data-theme='dark'] .stat-item {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.05);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
  margin-bottom: var(--spacing-1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary-aurora);
  font-family: var(--font-mono);
}

/* 转录内容 */
.transcription-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8);
  text-align: center;
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

/* 片段列表 */
.segments-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-2);
}

/* 分页 */
.pagination-section {
  display: flex;
  justify-content: center;
  padding: var(--spacing-4);
  border-top: 1px solid var(--color-neutral-200);
  margin-top: auto;
}

[data-theme='dark'] .pagination-section {
  border-top-color: var(--color-neutral-700);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-3);
  }

  .search-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input-group {
    min-width: auto;
  }

  .filter-group {
    justify-content: space-between;
  }

  .action-section {
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .toolbar {
    padding: var(--spacing-3);
  }

  .stats-panel {
    padding: var(--spacing-3);
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .filter-group {
    flex-direction: column;
  }

  .action-section {
    flex-wrap: wrap;
  }
}
</style>
