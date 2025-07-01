<!--
  统一媒体播放器组件
  支持音频和视频播放，包含完整的播放控制功能
-->
<template>
  <div
    class="media-player"
    :class="{
      'is-video': isVideo,
      'is-audio': !isVideo,
      'is-fullscreen': isFullscreen,
      'controls-hidden': !showControls && isPlaying,
    }"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- 视频元素 -->
    <video
      v-if="isVideo"
      ref="videoRef"
      class="media-element video-element"
      v-bind="poster ? { poster } : {}"
      preload="metadata"
      @click="togglePlay"
    >
      <source :src="src" :type="videoType" />
      您的浏览器不支持视频播放。
    </video>

    <!-- 音频元素 -->
    <audio v-else ref="audioRef" class="media-element audio-element" preload="metadata">
      <source :src="src" :type="audioType" />
      您的浏览器不支持音频播放。
    </audio>

    <!-- 音频可视化背景 -->
    <div v-if="!isVideo" class="audio-background">
      <div class="audio-artwork">
        <img v-if="artwork" :src="artwork" :alt="title || '音频封面'" class="artwork-image" />
        <div v-else class="artwork-placeholder">
          <span class="artwork-icon">🎵</span>
        </div>
      </div>
      <div class="audio-info">
        <h3 v-if="title" class="audio-title">{{ title }}</h3>
        <p v-if="artist" class="audio-artist">{{ artist }}</p>
      </div>
    </div>

    <!-- 加载指示器 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span class="loading-text">加载中...</span>
    </div>

    <!-- 错误提示 -->
    <div v-if="hasError" class="error-overlay">
      <div class="error-icon">⚠️</div>
      <div class="error-message">
        <h4>播放出错</h4>
        <p>{{ error || '无法播放此媒体文件' }}</p>
        <NButton @click="retry">重试</NButton>
      </div>
    </div>

    <!-- 播放控制栏 -->
    <PlayControls
      v-show="showControls || !isPlaying"
      :current-time="currentTime"
      :duration="duration"
      :volume="playerVolume"
      :muted="playerMuted"
      :playback-rate="playerPlaybackRate"
      :is-playing="isPlaying"
      :is-loading="isLoading"
      :progress="progress"
      :buffered-progress="bufferedProgress"
      :formatted-current-time="formattedCurrentTime"
      :formatted-duration="formattedDuration"
      :formatted-remaining="formattedRemaining"
      :can-play="canPlay"
      :is-fullscreen="isFullscreen"
      :is-video="isVideo"
      @play="play"
      @pause="pause"
      @toggle-play="togglePlay"
      @seek="seek"
      @seek-to-progress="seekToProgress"
      @skip-forward="skipForward"
      @skip-backward="skipBackward"
      @set-volume="setVolume"
      @toggle-mute="toggleMute"
      @set-playback-rate="setPlaybackRate"
      @toggle-fullscreen="toggleFullscreen"
    />

    <!-- 中央播放按钮 -->
    <div v-if="!isPlaying && !isLoading && canPlay" class="center-play-button" @click="play">
      <div class="play-button-circle">
        <span class="play-icon">▶</span>
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div v-if="showKeyboardHints" class="keyboard-hints">
      <div class="hints-content">
        <h4>快捷键</h4>
        <div class="hints-grid">
          <div class="hint-item">
            <kbd>空格</kbd>
            <span>播放/暂停</span>
          </div>
          <div class="hint-item">
            <kbd>←/→</kbd>
            <span>快退/快进 10秒</span>
          </div>
          <div class="hint-item">
            <kbd>↑/↓</kbd>
            <span>音量调节</span>
          </div>
          <div class="hint-item">
            <kbd>M</kbd>
            <span>静音切换</span>
          </div>
          <div class="hint-item">
            <kbd>F</kbd>
            <span>全屏切换</span>
          </div>
          <div class="hint-item">
            <kbd>Shift + ,/.</kbd>
            <span>速度调节</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { NButton } from 'naive-ui'
import { useMediaPlayer } from '@/composables/useMediaPlayer'
import PlayControls from './PlayControls.vue'

// Props
interface Props {
  src: string
  type?: 'video' | 'audio' | 'auto'
  poster?: string
  title?: string
  artist?: string
  artwork?: string
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  volume?: number
  playbackRate?: number
  showKeyboardHints?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'auto',
  autoplay: false,
  loop: false,
  muted: false,
  volume: 1,
  playbackRate: 1,
  showKeyboardHints: false,
})

// Emits
defineEmits<{
  play: []
  pause: []
  ended: []
  timeupdate: [time: number]
  durationchange: [duration: number]
  volumechange: [volume: number]
  ratechange: [rate: number]
  error: [error: string]
  loadstart: []
  canplay: []
}>()

// 媒体元素引用
const videoRef = ref<HTMLVideoElement>()
const audioRef = ref<HTMLAudioElement>()

// 使用媒体播放器组合式函数
const {
  currentTime,
  duration,
  volume: playerVolume,
  muted: playerMuted,
  playbackRate: playerPlaybackRate,
  error,
  isFullscreen,
  showControls,
  isPlaying,
  isLoading,
  hasError,
  canPlay,
  progress,
  bufferedProgress,
  formattedCurrentTime,
  formattedDuration,
  formattedRemaining,
  play,
  pause,
  togglePlay,
  seek,
  seekToProgress,
  skipForward,
  skipBackward,
  setVolume,
  toggleMute,
  setPlaybackRate,
  toggleFullscreen,
  showControlsTemporarily,
  hideControls,
  setMediaElement,
  loadMedia,
} = useMediaPlayer()

// 计算属性
const isVideo = computed(() => {
  if (props.type === 'video') return true
  if (props.type === 'audio') return false

  // 自动检测
  const extension = props.src.split('.').pop()?.toLowerCase()
  const videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'flv', 'webm', 'wmv']
  return videoExtensions.includes(extension || '')
})

const videoType = computed(() => {
  const extension = props.src.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
      return 'video/ogg'
    case 'avi':
      return 'video/x-msvideo'
    case 'mov':
      return 'video/quicktime'
    default:
      return 'video/mp4'
  }
})

const audioType = computed(() => {
  const extension = props.src.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'm4a':
      return 'audio/mp4'
    case 'aac':
      return 'audio/aac'
    case 'ogg':
      return 'audio/ogg'
    case 'flac':
      return 'audio/flac'
    default:
      return 'audio/mpeg'
  }
})

// 方法
const handleMouseMove = () => {
  showControlsTemporarily()
}

const handleMouseLeave = () => {
  if (isVideo.value) {
    hideControls()
  }
}

const retry = () => {
  if (props.src) {
    loadMedia(props.src)
  }
}

// 监听器
watch(
  () => props.src,
  (newSrc) => {
    if (newSrc) {
      loadMedia(newSrc)
    }
  },
)

watch(
  () => props.volume,
  (newVolume) => {
    setVolume(newVolume)
  },
)

watch(
  () => props.playbackRate,
  (newRate) => {
    setPlaybackRate(newRate)
  },
)

// 生命周期
onMounted(async () => {
  await nextTick()

  // 设置媒体元素
  const mediaElement = isVideo.value ? videoRef.value : audioRef.value
  if (mediaElement) {
    setMediaElement(mediaElement)

    // 设置初始属性
    mediaElement.loop = props.loop
    mediaElement.muted = props.muted
    mediaElement.volume = props.volume
    mediaElement.playbackRate = props.playbackRate

    // 加载媒体
    if (props.src) {
      loadMedia(props.src)
    }

    // 自动播放
    if (props.autoplay) {
      // 延迟自动播放，确保媒体已加载
      setTimeout(() => {
        play()
      }, 100)
    }
  }
})
</script>

<style scoped>
.media-player {
  position: relative;
  width: 100%;
  background: var(--color-neutral-900);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.media-player.is-fullscreen {
  border-radius: 0;
}

/* 媒体元素 */
.media-element {
  width: 100%;
  height: 100%;
  display: block;
}

.video-element {
  min-height: 300px;
  max-height: 70vh;
}

.audio-element {
  display: none;
}

/* 音频背景 */
.audio-background {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  padding: var(--spacing-8);
  min-height: 200px;
  background: linear-gradient(
    135deg,
    rgba(30, 58, 138, 0.1) 0%,
    rgba(139, 92, 246, 0.1) 50%,
    rgba(16, 185, 129, 0.1) 100%
  );
}

[data-theme='dark'] .audio-background {
  background: linear-gradient(
    135deg,
    rgba(30, 58, 138, 0.2) 0%,
    rgba(139, 92, 246, 0.2) 50%,
    rgba(16, 185, 129, 0.2) 100%
  );
}

.audio-artwork {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: var(--radius-xl);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.artwork-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artwork-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.2);
}

.artwork-icon {
  font-size: 3rem;
  color: var(--color-secondary-quantum);
}

.audio-info {
  flex: 1;
  color: white;
}

.audio-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  color: white;
}

.audio-artist {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

/* 加载和错误状态 */
.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid var(--color-primary-aurora);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: var(--spacing-3);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
}

.error-overlay {
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-3);
}

.error-message h4 {
  font-size: 1.25rem;
  margin-bottom: var(--spacing-2);
  color: white;
}

.error-message p {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--spacing-4);
}

/* 中央播放按钮 */
.center-play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 5;
  cursor: pointer;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.center-play-button:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

.play-button-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-neumorphism-lg);
}

.play-icon {
  font-size: 2rem;
  color: var(--color-neutral-800);
  margin-left: 4px; /* 视觉居中调整 */
}

/* 快捷键提示 */
.keyboard-hints {
  position: absolute;
  top: var(--spacing-4);
  right: var(--spacing-4);
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  padding: var(--spacing-4);
  color: white;
  z-index: 15;
  max-width: 300px;
}

.hints-content h4 {
  font-size: 1rem;
  margin-bottom: var(--spacing-3);
  color: white;
}

.hints-grid {
  display: grid;
  gap: var(--spacing-2);
}

.hint-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: 0.875rem;
}

.hint-item kbd {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-sm);
  padding: var(--spacing-1) var(--spacing-2);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  min-width: 24px;
  text-align: center;
}

/* 控制栏隐藏动画 */
.controls-hidden {
  cursor: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .audio-background {
    flex-direction: column;
    text-align: center;
    padding: var(--spacing-6);
  }

  .audio-artwork {
    width: 100px;
    height: 100px;
  }

  .center-play-button .play-button-circle {
    width: 60px;
    height: 60px;
  }

  .play-icon {
    font-size: 1.5rem;
  }

  .keyboard-hints {
    display: none;
  }
}
</style>
