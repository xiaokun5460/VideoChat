<!--
  播放控制组件
  提供播放、暂停、进度、音量、速度等控制功能
-->
<template>
  <div class="play-controls" :class="{ 'is-video': isVideo }">
    <!-- 进度条 -->
    <div class="progress-section">
      <div
        class="progress-bar-container"
        @click="handleProgressClick"
        @mousedown="handleProgressMouseDown"
      >
        <!-- 缓冲进度 -->
        <div class="progress-bar buffered-bar">
          <div class="progress-fill buffered-fill" :style="{ width: `${bufferedProgress}%` }"></div>
        </div>

        <!-- 播放进度 -->
        <div class="progress-bar play-bar">
          <div class="progress-fill play-fill" :style="{ width: `${progress}%` }"></div>
          <div
            class="progress-thumb"
            :style="{ left: `${progress}%` }"
            @mousedown="handleThumbMouseDown"
          ></div>
        </div>

        <!-- 进度提示 -->
        <div
          v-if="showProgressTooltip"
          class="progress-tooltip"
          :style="{ left: `${tooltipPosition}%` }"
        >
          {{ tooltipTime }}
        </div>
      </div>
    </div>

    <!-- 控制按钮区域 -->
    <div class="controls-section">
      <!-- 左侧控制 -->
      <div class="controls-left">
        <!-- 播放/暂停按钮 -->
        <NButton
          text
          size="large"
          class="control-button play-button"
          :disabled="!canPlay"
          @click="$emit('toggle-play')"
        >
          <span v-if="isLoading" class="loading-icon">⏳</span>
          <span v-else-if="isPlaying" class="pause-icon">⏸️</span>
          <span v-else class="play-icon">▶️</span>
        </NButton>

        <!-- 快退/快进按钮 -->
        <NButton
          text
          size="medium"
          class="control-button"
          :disabled="!canPlay"
          @click="$emit('skip-backward', 10)"
          title="快退 10秒 (←)"
        >
          ⏪
        </NButton>

        <NButton
          text
          size="medium"
          class="control-button"
          :disabled="!canPlay"
          @click="$emit('skip-forward', 10)"
          title="快进 10秒 (→)"
        >
          ⏩
        </NButton>

        <!-- 时间显示 -->
        <div class="time-display">
          <span class="current-time">{{ formattedCurrentTime }}</span>
          <span class="time-separator">/</span>
          <span class="total-time">{{ formattedDuration }}</span>
        </div>
      </div>

      <!-- 右侧控制 -->
      <div class="controls-right">
        <!-- 播放速度 -->
        <NDropdown :options="speedOptions" @select="handleSpeedSelect" placement="top">
          <NButton text size="medium" class="control-button speed-button" :disabled="!canPlay">
            {{ playbackRate }}x
          </NButton>
        </NDropdown>

        <!-- 音量控制 -->
        <div class="volume-control">
          <NButton
            text
            size="medium"
            class="control-button volume-button"
            @click="$emit('toggle-mute')"
            :title="muted ? '取消静音 (M)' : '静音 (M)'"
          >
            <span v-if="muted" class="volume-icon">🔇</span>
            <span v-else-if="volume > 0.5" class="volume-icon">🔊</span>
            <span v-else-if="volume > 0" class="volume-icon">🔉</span>
            <span v-else class="volume-icon">🔈</span>
          </NButton>

          <div class="volume-slider" @click="handleVolumeClick" @mousedown="handleVolumeMouseDown">
            <div class="volume-track">
              <div class="volume-fill" :style="{ width: `${muted ? 0 : volume * 100}%` }"></div>
              <div class="volume-thumb" :style="{ left: `${muted ? 0 : volume * 100}%` }"></div>
            </div>
          </div>
        </div>

        <!-- 全屏按钮 (仅视频) -->
        <NButton
          v-if="isVideo"
          text
          size="medium"
          class="control-button fullscreen-button"
          @click="$emit('toggle-fullscreen')"
          :title="isFullscreen ? '退出全屏 (F)' : '全屏 (F)'"
        >
          <span v-if="isFullscreen">🗗</span>
          <span v-else>🗖</span>
        </NButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { NButton, NDropdown } from 'naive-ui'
import { PLAYBACK_SPEEDS } from '@/composables/useMediaPlayer'

// Props
interface Props {
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  playbackRate: number
  isPlaying: boolean
  isLoading: boolean
  progress: number
  bufferedProgress: number
  formattedCurrentTime: string
  formattedDuration: string
  formattedRemaining: string
  canPlay: boolean
  isFullscreen: boolean
  isVideo: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  play: []
  pause: []
  'toggle-play': []
  seek: [time: number]
  'seek-to-progress': [progress: number]
  'skip-forward': [seconds: number]
  'skip-backward': [seconds: number]
  'set-volume': [volume: number]
  'toggle-mute': []
  'set-playback-rate': [rate: number]
  'toggle-fullscreen': []
}>()

// 响应式状态
const showProgressTooltip = ref(false)
const tooltipPosition = ref(0)
const tooltipTime = ref('00:00')
const isDraggingProgress = ref(false)
const isDraggingVolume = ref(false)

// 计算属性
const speedOptions = computed(() => {
  return PLAYBACK_SPEEDS.map((speed) => ({
    label: `${speed}x`,
    key: speed.toString(),
    value: speed,
  }))
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

const getProgressFromEvent = (event: MouseEvent, element: HTMLElement): number => {
  const rect = element.getBoundingClientRect()
  const x = event.clientX - rect.left
  const width = rect.width
  return Math.max(0, Math.min(100, (x / width) * 100))
}

const getVolumeFromEvent = (event: MouseEvent, element: HTMLElement): number => {
  const rect = element.getBoundingClientRect()
  const x = event.clientX - rect.left
  const width = rect.width
  return Math.max(0, Math.min(1, x / width))
}

// 进度条事件处理
const handleProgressClick = (event: MouseEvent) => {
  if (isDraggingProgress.value) return

  const target = event.currentTarget as HTMLElement
  const progress = getProgressFromEvent(event, target)
  emit('seek-to-progress', progress)
}

const handleProgressMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return // 只处理左键

  isDraggingProgress.value = true
  const target = event.currentTarget as HTMLElement

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingProgress.value) return

    const progress = getProgressFromEvent(e, target)
    emit('seek-to-progress', progress)
  }

  const handleMouseUp = () => {
    isDraggingProgress.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // 立即处理当前位置
  handleMouseMove(event)
}

const handleThumbMouseDown = (event: MouseEvent) => {
  event.stopPropagation()
  handleProgressMouseDown(event)
}

// 音量控制事件处理
const handleVolumeClick = (event: MouseEvent) => {
  if (isDraggingVolume.value) return

  const target = event.currentTarget as HTMLElement
  const volume = getVolumeFromEvent(event, target)
  emit('set-volume', volume)
}

const handleVolumeMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return

  isDraggingVolume.value = true
  const target = event.currentTarget as HTMLElement

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingVolume.value) return

    const volume = getVolumeFromEvent(e, target)
    emit('set-volume', volume)
  }

  const handleMouseUp = () => {
    isDraggingVolume.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  handleMouseMove(event)
}

// 播放速度选择
const handleSpeedSelect = (key: string) => {
  const speed = parseFloat(key)
  emit('set-playback-rate', speed)
}

// 进度条悬停提示
const handleProgressMouseEnter = (event: Event) => {
  showProgressTooltip.value = true
  updateTooltip(event as MouseEvent)
}

const handleProgressMouseMove = (event: Event) => {
  if (showProgressTooltip.value) {
    updateTooltip(event as MouseEvent)
  }
}

const handleProgressMouseLeave = () => {
  showProgressTooltip.value = false
}

const updateTooltip = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  const progress = getProgressFromEvent(event, target)
  const time = (progress / 100) * props.duration

  tooltipPosition.value = progress
  tooltipTime.value = formatTime(time)
}

// 生命周期
onMounted(() => {
  // 添加进度条悬停事件
  const progressContainer = document.querySelector('.progress-bar-container')
  if (progressContainer) {
    progressContainer.addEventListener('mouseenter', handleProgressMouseEnter)
    progressContainer.addEventListener('mousemove', handleProgressMouseMove)
    progressContainer.addEventListener('mouseleave', handleProgressMouseLeave)
  }
})

onUnmounted(() => {
  // 清理事件监听器
  const progressContainer = document.querySelector('.progress-bar-container')
  if (progressContainer) {
    progressContainer.removeEventListener('mouseenter', handleProgressMouseEnter)
    progressContainer.removeEventListener('mousemove', handleProgressMouseMove)
    progressContainer.removeEventListener('mouseleave', handleProgressMouseLeave)
  }
})
</script>

<style scoped>
.play-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.6) 50%,
    transparent 100%
  );
  backdrop-filter: blur(10px);
  padding: var(--spacing-4);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  z-index: 10;
}

.play-controls.is-video {
  color: white;
}

/* 进度条区域 */
.progress-section {
  margin-bottom: var(--spacing-3);
}

.progress-bar-container {
  position: relative;
  height: 6px;
  cursor: pointer;
  padding: var(--spacing-2) 0;
}

.progress-bar {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: 4px;
  border-radius: 2px;
  overflow: hidden;
}

.buffered-bar {
  background: rgba(255, 255, 255, 0.2);
  z-index: 1;
}

.play-bar {
  background: rgba(255, 255, 255, 0.3);
  z-index: 2;
}

.progress-fill {
  height: 100%;
  transition: width var(--duration-fast) var(--easing-ease-out);
}

.buffered-fill {
  background: rgba(255, 255, 255, 0.4);
}

.play-fill {
  background: var(--color-primary-aurora);
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  box-shadow: var(--shadow-neumorphism-sm);
  opacity: 0;
  transition: opacity var(--duration-fast) var(--easing-ease-out);
  z-index: 3;
  cursor: grab;
}

.progress-thumb:active {
  cursor: grabbing;
}

.progress-bar-container:hover .progress-thumb {
  opacity: 1;
}

.progress-tooltip {
  position: absolute;
  bottom: 100%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-family: var(--font-mono);
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
}

/* 控制按钮区域 */
.controls-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.control-button {
  color: white !important;
  font-size: 1.25rem;
  min-width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  transition: all var(--duration-fast) var(--easing-ease-out);
}

.control-button:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: scale(1.05);
}

.control-button:active {
  transform: scale(0.95);
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-button {
  font-size: 1.5rem;
  min-width: 48px;
  height: 48px;
}

/* 时间显示 */
.time-display {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  min-width: 100px;
}

.time-separator {
  color: rgba(255, 255, 255, 0.6);
}

/* 播放速度按钮 */
.speed-button {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  min-width: 48px;
}

/* 音量控制 */
.volume-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.volume-slider {
  width: 80px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: var(--spacing-1) 0;
}

.volume-track {
  position: relative;
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.volume-fill {
  height: 100%;
  background: var(--color-primary-aurora);
  border-radius: 2px;
  transition: width var(--duration-fast) var(--easing-ease-out);
}

.volume-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
  box-shadow: var(--shadow-neumorphism-sm);
  transition: all var(--duration-fast) var(--easing-ease-out);
}

.volume-slider:hover .volume-thumb {
  width: 10px;
  height: 10px;
}

/* 加载图标动画 */
.loading-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .play-controls {
    padding: var(--spacing-3);
  }

  .controls-section {
    gap: var(--spacing-2);
  }

  .controls-left,
  .controls-right {
    gap: var(--spacing-1);
  }

  .control-button {
    min-width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .play-button {
    min-width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }

  .time-display {
    font-size: 0.75rem;
    min-width: 80px;
  }

  .volume-slider {
    width: 60px;
  }

  .progress-tooltip {
    display: none;
  }
}

@media (max-width: 480px) {
  .controls-section {
    flex-wrap: wrap;
    justify-content: center;
  }

  .controls-left {
    order: 1;
    flex: 1;
    justify-content: flex-start;
  }

  .controls-right {
    order: 2;
    flex: 1;
    justify-content: flex-end;
  }

  .time-display {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: var(--spacing-2);
  }
}
</style>
