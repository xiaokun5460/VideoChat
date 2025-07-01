<!--
  404页面 - 页面未找到
-->
<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <div class="error-animation">
        <div class="error-number gradient-text">404</div>
        <div class="error-icon">🌌</div>
      </div>
      
      <div class="error-message">
        <h1 class="error-title">页面走丢了</h1>
        <p class="error-description">
          抱歉，您访问的页面在深空中迷失了方向。
          <br>
          让我们帮您回到正确的轨道上。
        </p>
      </div>
      
      <div class="error-actions">
        <NButton type="primary" size="large" @click="goHome">
          🏠 返回首页
        </NButton>
        <NButton size="large" @click="goBack">
          ← 返回上页
        </NButton>
      </div>
      
      <div class="helpful-links">
        <h3>您可能在寻找：</h3>
        <div class="links-grid">
          <router-link 
            v-for="link in helpfulLinks"
            :key="link.name"
            :to="{ name: link.name }"
            class="help-link glass-effect"
            :class="isDark ? 'glass-dark' : 'glass-light'"
          >
            <span class="link-icon">{{ link.icon }}</span>
            <span class="link-text">{{ link.title }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { NButton } from 'naive-ui'

const router = useRouter()
const { isDark } = useTheme()

// 有用的链接
const helpfulLinks = [
  { name: 'Dashboard', title: '仪表板', icon: '📊' },
  { name: 'Upload', title: '文件上传', icon: '📁' },
  { name: 'Transcription', title: '音视频转录', icon: '🎵' },
  { name: 'AIFeatures', title: 'AI功能', icon: '🤖' }
]

// 返回首页
const goHome = () => {
  router.push({ name: 'Dashboard' })
}

// 返回上一页
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    goHome()
  }
}
</script>

<style scoped>
.not-found-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-6);
  text-align: center;
}

.not-found-content {
  max-width: 600px;
  width: 100%;
}

/* 错误动画 */
.error-animation {
  position: relative;
  margin-bottom: var(--spacing-8);
}

.error-number {
  font-size: 8rem;
  font-weight: 900;
  font-family: var(--font-display);
  line-height: 1;
  margin-bottom: var(--spacing-4);
  animation: float 3s ease-in-out infinite;
}

.error-icon {
  font-size: 3rem;
  animation: rotate 4s linear infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 错误信息 */
.error-message {
  margin-bottom: var(--spacing-8);
}

.error-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: var(--spacing-3);
  color: var(--color-neutral-800);
  font-family: var(--font-display);
}

[data-theme="dark"] .error-title {
  color: var(--color-neutral-200);
}

.error-description {
  font-size: 1.125rem;
  color: var(--color-neutral-600);
  line-height: 1.6;
  margin: 0;
}

[data-theme="dark"] .error-description {
  color: var(--color-neutral-400);
}

/* 操作按钮 */
.error-actions {
  display: flex;
  gap: var(--spacing-4);
  justify-content: center;
  margin-bottom: var(--spacing-8);
  flex-wrap: wrap;
}

/* 有用的链接 */
.helpful-links {
  margin-top: var(--spacing-8);
}

.helpful-links h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-4);
  color: var(--color-neutral-700);
}

[data-theme="dark"] .helpful-links h3 {
  color: var(--color-neutral-300);
}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--spacing-3);
}

.help-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  text-decoration: none;
  color: inherit;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.help-link:hover {
  transform: translateY(-2px);
  text-decoration: none;
  color: inherit;
}

.link-icon {
  font-size: 1.5rem;
}

.link-text {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .not-found-page {
    padding: var(--spacing-4);
  }
  
  .error-number {
    font-size: 6rem;
  }
  
  .error-title {
    font-size: 1.75rem;
  }
  
  .error-description {
    font-size: 1rem;
  }
  
  .error-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .links-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .error-number {
    font-size: 4rem;
  }
  
  .error-title {
    font-size: 1.5rem;
  }
  
  .links-grid {
    grid-template-columns: 1fr;
  }
  
  .help-link {
    padding: var(--spacing-3);
  }
}
</style>