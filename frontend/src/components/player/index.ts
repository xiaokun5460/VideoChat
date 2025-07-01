/**
 * 媒体播放器组件统一导出
 */

export { default as MediaPlayer } from './MediaPlayer.vue'
export { default as PlayControls } from './PlayControls.vue'

// 导出播放器相关类型和组合式函数
export { useMediaPlayer, PLAYBACK_SPEEDS } from '@/composables/useMediaPlayer'
export type { PlaybackState, MediaPlayerState } from '@/composables/useMediaPlayer'