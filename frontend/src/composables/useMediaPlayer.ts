/**
 * 媒体播放器组合式函数
 * 提供音视频播放的核心逻辑，包括播放控制、进度管理、音量控制等功能
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

// 播放状态枚举
export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

// 播放速度选项
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

// 媒体播放器接口
export interface MediaPlayerState {
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  playbackRate: number
  state: PlaybackState
  buffered: number
  error: string | null
}

export const useMediaPlayer = (mediaElement?: HTMLMediaElement) => {
  // 响应式状态
  const mediaRef = ref<HTMLMediaElement | null>(mediaElement || null)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const muted = ref(false)
  const playbackRate = ref(1)
  const state = ref<PlaybackState>('idle')
  const buffered = ref(0)
  const error = ref<string | null>(null)
  const isFullscreen = ref(false)
  const showControls = ref(true)
  const controlsTimeout = ref<number | null>(null)
  
  // 计算属性
  const isPlaying = computed(() => state.value === 'playing')
  const isPaused = computed(() => state.value === 'paused')
  const isLoading = computed(() => state.value === 'loading')
  const hasError = computed(() => state.value === 'error')
  const canPlay = computed(() => duration.value > 0 && !hasError.value)
  
  const progress = computed(() => {
    return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  })
  
  const bufferedProgress = computed(() => {
    return duration.value > 0 ? (buffered.value / duration.value) * 100 : 0
  })
  
  const formattedCurrentTime = computed(() => formatTime(currentTime.value))
  const formattedDuration = computed(() => formatTime(duration.value))
  const formattedRemaining = computed(() => formatTime(duration.value - currentTime.value))
  
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
  
  // 媒体元素事件处理
  const setupMediaEvents = (element: HTMLMediaElement) => {
    const updateCurrentTime = () => {
      currentTime.value = element.currentTime
    }
    
    const updateDuration = () => {
      duration.value = element.duration || 0
    }
    
    const updateVolume = () => {
      volume.value = element.volume
      muted.value = element.muted
    }
    
    const updatePlaybackRate = () => {
      playbackRate.value = element.playbackRate
    }
    
    const updateBuffered = () => {
      if (element.buffered.length > 0) {
        buffered.value = element.buffered.end(element.buffered.length - 1)
      }
    }
    
    const handleLoadStart = () => {
      state.value = 'loading'
      error.value = null
    }
    
    const handleCanPlay = () => {
      if (state.value === 'loading') {
        state.value = 'paused'
      }
    }
    
    const handlePlay = () => {
      state.value = 'playing'
    }
    
    const handlePause = () => {
      state.value = 'paused'
    }
    
    const handleEnded = () => {
      state.value = 'ended'
    }
    
    const handleError = () => {
      state.value = 'error'
      error.value = element.error?.message || '播放出错'
    }
    
    const handleWaiting = () => {
      if (state.value === 'playing') {
        state.value = 'loading'
      }
    }
    
    const handleCanPlayThrough = () => {
      if (state.value === 'loading') {
        state.value = 'paused'
      }
    }
    
    // 绑定事件
    element.addEventListener('timeupdate', updateCurrentTime)
    element.addEventListener('durationchange', updateDuration)
    element.addEventListener('volumechange', updateVolume)
    element.addEventListener('ratechange', updatePlaybackRate)
    element.addEventListener('progress', updateBuffered)
    element.addEventListener('loadstart', handleLoadStart)
    element.addEventListener('canplay', handleCanPlay)
    element.addEventListener('canplaythrough', handleCanPlayThrough)
    element.addEventListener('play', handlePlay)
    element.addEventListener('pause', handlePause)
    element.addEventListener('ended', handleEnded)
    element.addEventListener('error', handleError)
    element.addEventListener('waiting', handleWaiting)
    
    // 返回清理函数
    return () => {
      element.removeEventListener('timeupdate', updateCurrentTime)
      element.removeEventListener('durationchange', updateDuration)
      element.removeEventListener('volumechange', updateVolume)
      element.removeEventListener('ratechange', updatePlaybackRate)
      element.removeEventListener('progress', updateBuffered)
      element.removeEventListener('loadstart', handleLoadStart)
      element.removeEventListener('canplay', handleCanPlay)
      element.removeEventListener('canplaythrough', handleCanPlayThrough)
      element.removeEventListener('play', handlePlay)
      element.removeEventListener('pause', handlePause)
      element.removeEventListener('ended', handleEnded)
      element.removeEventListener('error', handleError)
      element.removeEventListener('waiting', handleWaiting)
    }
  }
  
  // 播放控制方法
  const play = async () => {
    if (!mediaRef.value) return
    
    try {
      await mediaRef.value.play()
    } catch (err) {
      console.error('播放失败:', err)
      error.value = '播放失败'
      state.value = 'error'
    }
  }
  
  const pause = () => {
    if (!mediaRef.value) return
    mediaRef.value.pause()
  }
  
  const togglePlay = async () => {
    if (isPlaying.value) {
      pause()
    } else {
      await play()
    }
  }
  
  const stop = () => {
    if (!mediaRef.value) return
    pause()
    seek(0)
  }
  
  const seek = (time: number) => {
    if (!mediaRef.value) return
    mediaRef.value.currentTime = Math.max(0, Math.min(time, duration.value))
  }
  
  const seekToProgress = (progress: number) => {
    const time = (progress / 100) * duration.value
    seek(time)
  }
  
  const skipForward = (seconds = 10) => {
    seek(currentTime.value + seconds)
  }
  
  const skipBackward = (seconds = 10) => {
    seek(currentTime.value - seconds)
  }
  
  // 音量控制
  const setVolume = (vol: number) => {
    if (!mediaRef.value) return
    const newVolume = Math.max(0, Math.min(1, vol))
    mediaRef.value.volume = newVolume
    volume.value = newVolume
  }
  
  const toggleMute = () => {
    if (!mediaRef.value) return
    mediaRef.value.muted = !mediaRef.value.muted
    muted.value = mediaRef.value.muted
  }
  
  const volumeUp = (step = 0.1) => {
    setVolume(volume.value + step)
  }
  
  const volumeDown = (step = 0.1) => {
    setVolume(volume.value - step)
  }
  
  // 播放速度控制
  const setPlaybackRate = (rate: number) => {
    if (!mediaRef.value) return
    const newRate = Math.max(0.25, Math.min(4, rate))
    mediaRef.value.playbackRate = newRate
    playbackRate.value = newRate
  }
  
  const increaseSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate.value)
    if (currentIndex < PLAYBACK_SPEEDS.length - 1) {
      setPlaybackRate(PLAYBACK_SPEEDS[currentIndex + 1])
    }
  }
  
  const decreaseSpeed = () => {
    const currentIndex = PLAYBACK_SPEEDS.indexOf(playbackRate.value)
    if (currentIndex > 0) {
      setPlaybackRate(PLAYBACK_SPEEDS[currentIndex - 1])
    }
  }
  
  const resetSpeed = () => {
    setPlaybackRate(1)
  }
  
  // 全屏控制
  const toggleFullscreen = async () => {
    if (!mediaRef.value) return
    
    try {
      if (!document.fullscreenElement) {
        await mediaRef.value.requestFullscreen()
        isFullscreen.value = true
      } else {
        await document.exitFullscreen()
        isFullscreen.value = false
      }
    } catch (err) {
      console.error('全屏切换失败:', err)
    }
  }
  
  // 控制栏显示/隐藏
  const showControlsTemporarily = () => {
    showControls.value = true
    
    if (controlsTimeout.value) {
      clearTimeout(controlsTimeout.value)
    }
    
    controlsTimeout.value = window.setTimeout(() => {
      if (isPlaying.value) {
        showControls.value = false
      }
    }, 3000)
  }
  
  const hideControls = () => {
    if (isPlaying.value) {
      showControls.value = false
    }
  }
  
  // 快捷键处理
  const handleKeydown = (event: KeyboardEvent) => {
    if (!mediaRef.value) return
    
    // 防止在输入框中触发快捷键
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }
    
    switch (event.code) {
      case 'Space':
        event.preventDefault()
        togglePlay()
        break
      case 'ArrowLeft':
        event.preventDefault()
        skipBackward(event.shiftKey ? 30 : 10)
        break
      case 'ArrowRight':
        event.preventDefault()
        skipForward(event.shiftKey ? 30 : 10)
        break
      case 'ArrowUp':
        event.preventDefault()
        volumeUp(0.1)
        break
      case 'ArrowDown':
        event.preventDefault()
        volumeDown(0.1)
        break
      case 'KeyM':
        event.preventDefault()
        toggleMute()
        break
      case 'KeyF':
        event.preventDefault()
        toggleFullscreen()
        break
      case 'Home':
        event.preventDefault()
        seek(0)
        break
      case 'End':
        event.preventDefault()
        seek(duration.value)
        break
      case 'Comma':
        if (event.shiftKey) {
          event.preventDefault()
          decreaseSpeed()
        }
        break
      case 'Period':
        if (event.shiftKey) {
          event.preventDefault()
          increaseSpeed()
        }
        break
    }
  }
  
  // 设置媒体元素
  const setMediaElement = (element: HTMLMediaElement | null) => {
    // 清理之前的事件监听器
    if (mediaRef.value && cleanupEvents) {
      cleanupEvents()
    }
    
    mediaRef.value = element
    
    if (element) {
      // 设置初始状态
      currentTime.value = element.currentTime
      duration.value = element.duration || 0
      volume.value = element.volume
      muted.value = element.muted
      playbackRate.value = element.playbackRate
      
      // 设置事件监听器
      cleanupEvents = setupMediaEvents(element)
    }
  }
  
  // 加载媒体
  const loadMedia = (src: string) => {
    if (!mediaRef.value) return
    
    state.value = 'loading'
    error.value = null
    mediaRef.value.src = src
    mediaRef.value.load()
  }
  
  // 清理函数
  let cleanupEvents: (() => void) | null = null
  
  // 监听媒体元素变化
  watch(mediaRef, (newElement) => {
    if (newElement) {
      setMediaElement(newElement)
    }
  })
  
  // 生命周期
  onMounted(() => {
    // 添加全局键盘事件监听
    document.addEventListener('keydown', handleKeydown)
    
    // 监听全屏变化
    document.addEventListener('fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement
    })
  })
  
  onUnmounted(() => {
    // 清理事件监听器
    document.removeEventListener('keydown', handleKeydown)
    
    if (cleanupEvents) {
      cleanupEvents()
    }
    
    if (controlsTimeout.value) {
      clearTimeout(controlsTimeout.value)
    }
  })
  
  return {
    // 状态
    mediaRef,
    currentTime,
    duration,
    volume,
    muted,
    playbackRate,
    state,
    buffered,
    error,
    isFullscreen,
    showControls,
    
    // 计算属性
    isPlaying,
    isPaused,
    isLoading,
    hasError,
    canPlay,
    progress,
    bufferedProgress,
    formattedCurrentTime,
    formattedDuration,
    formattedRemaining,
    
    // 播放控制
    play,
    pause,
    togglePlay,
    stop,
    seek,
    seekToProgress,
    skipForward,
    skipBackward,
    
    // 音量控制
    setVolume,
    toggleMute,
    volumeUp,
    volumeDown,
    
    // 播放速度
    setPlaybackRate,
    increaseSpeed,
    decreaseSpeed,
    resetSpeed,
    
    // 全屏控制
    toggleFullscreen,
    
    // 控制栏
    showControlsTemporarily,
    hideControls,
    
    // 媒体管理
    setMediaElement,
    loadMedia,
    
    // 工具函数
    formatTime,
    
    // 常量
    PLAYBACK_SPEEDS
  }
}