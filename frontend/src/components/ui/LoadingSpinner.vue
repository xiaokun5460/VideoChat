<!--
  加载动画组件
  提供多种样式的加载指示器
-->
<template>
  <div class="loading-spinner" :class="[`size-${size}`, `type-${type}`]">
    <!-- 默认旋转动画 -->
    <div v-if="type === 'spinner'" class="spinner">
      <div class="spinner-circle"></div>
    </div>
    
    <!-- 脉冲动画 -->
    <div v-else-if="type === 'pulse'" class="pulse">
      <div class="pulse-dot"></div>
      <div class="pulse-dot"></div>
      <div class="pulse-dot"></div>
    </div>
    
    <!-- 波浪动画 -->
    <div v-else-if="type === 'wave'" class="wave">
      <div class="wave-bar"></div>
      <div class="wave-bar"></div>
      <div class="wave-bar"></div>
      <div class="wave-bar"></div>
      <div class="wave-bar"></div>
    </div>
    
    <!-- 骨架屏 -->
    <div v-else-if="type === 'skeleton'" class="skeleton">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
    </div>
    
    <!-- 加载文本 -->
    <div v-if="text && type !== 'skeleton'" class="loading-text">
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  type?: 'spinner' | 'pulse' | 'wave' | 'skeleton'
  size?: 'small' | 'medium' | 'large'
  text?: string
}

withDefaults(defineProps<Props>(), {
  type: 'spinner',
  size: 'medium',
  text: ''
})
</script>

<style scoped>
.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
}

/* 尺寸变体 */
.size-small {
  --spinner-size: 24px;
  --dot-size: 6px;
  --bar-width: 3px;
  --bar-height: 20px;
}

.size-medium {
  --spinner-size: 40px;
  --dot-size: 10px;
  --bar-width: 4px;
  --bar-height: 32px;
}

.size-large {
  --spinner-size: 60px;
  --dot-size: 14px;
  --bar-width: 6px;
  --bar-height: 48px;
}

/* 旋转动画 */
.spinner {
  width: var(--spinner-size);
  height: var(--spinner-size);
  position: relative;
}

.spinner-circle {
  width: 100%;
  height: 100%;
  border: 3px solid rgba(16, 185, 129, 0.2);
  border-top: 3px solid var(--color-primary-aurora);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 脉冲动画 */
.pulse {
  display: flex;
  gap: var(--spacing-2);
  align-items: center;
}

.pulse-dot {
  width: var(--dot-size);
  height: var(--dot-size);
  background: var(--color-primary-aurora);
  border-radius: 50%;
  animation: pulse 1.4s ease-in-out infinite both;
}

.pulse-dot:nth-child(1) { animation-delay: -0.32s; }
.pulse-dot:nth-child(2) { animation-delay: -0.16s; }
.pulse-dot:nth-child(3) { animation-delay: 0s; }

@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 波浪动画 */
.wave {
  display: flex;
  gap: var(--spacing-1);
  align-items: flex-end;
}

.wave-bar {
  width: var(--bar-width);
  height: var(--bar-height);
  background: var(--color-primary-aurora);
  border-radius: var(--radius-sm);
  animation: wave 1.2s ease-in-out infinite;
}

.wave-bar:nth-child(1) { animation-delay: -1.2s; }
.wave-bar:nth-child(2) { animation-delay: -1.1s; }
.wave-bar:nth-child(3) { animation-delay: -1.0s; }
.wave-bar:nth-child(4) { animation-delay: -0.9s; }
.wave-bar:nth-child(5) { animation-delay: -0.8s; }

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
    opacity: 0.5;
  }
  20% {
    transform: scaleY(1);
    opacity: 1;
  }
}

/* 骨架屏 */
.skeleton {
  width: 100%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.skeleton-line {
  height: 16px;
  background: linear-gradient(
    90deg,
    rgba(16, 185, 129, 0.1) 25%,
    rgba(16, 185, 129, 0.2) 50%,
    rgba(16, 185, 129, 0.1) 75%
  );
  background-size: 200% 100%;
  border-radius: var(--radius-sm);
  animation: skeleton 1.5s ease-in-out infinite;
}

.skeleton-line.short {
  width: 60%;
}

.skeleton-line.medium {
  width: 80%;
}

@keyframes skeleton {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* 加载文本 */
.loading-text {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  text-align: center;
  animation: textFade 2s ease-in-out infinite;
}

[data-theme='dark'] .loading-text {
  color: var(--color-neutral-400);
}

@keyframes textFade {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* 深色主题适配 */
[data-theme='dark'] .spinner-circle {
  border-color: rgba(16, 185, 129, 0.3);
  border-top-color: var(--color-primary-aurora);
}

[data-theme='dark'] .skeleton-line {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.1) 25%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.1) 75%
  );
  background-size: 200% 100%;
}
</style>
