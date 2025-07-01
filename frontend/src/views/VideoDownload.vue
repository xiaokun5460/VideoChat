<!--
  视频下载页面 - 占位页面
-->
<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title gradient-text">视频下载</h1>
      <p class="page-description">从在线平台下载视频内容</p>
    </div>
    
    <div class="content-card glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
      <div class="placeholder-content">
        <div class="placeholder-icon">⬇️</div>
        <h2 class="placeholder-title">在线视频下载</h2>
        <p class="placeholder-text">
          此页面将实现在线视频下载功能，支持多个平台、多种格式、批量下载等特性。
        </p>
        <div class="feature-list">
          <div class="feature-item">🎬 YouTube支持</div>
          <div class="feature-item">📺 Bilibili支持</div>
          <div class="feature-item">📦 批量下载</div>
          <div class="feature-item">🎯 多种格式</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
const { isDark } = useTheme()
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; }
.page-header { text-align: center; margin-bottom: var(--spacing-8); }
.page-title { font-size: 2.5rem; font-weight: 700; margin-bottom: var(--spacing-2); font-family: var(--font-display); }
.page-description { font-size: 1.125rem; color: var(--color-neutral-600); margin: 0; }
[data-theme="dark"] .page-description { color: var(--color-neutral-400); }
.content-card { padding: var(--spacing-8); border-radius: var(--radius-2xl); text-align: center; }
.placeholder-content { max-width: 500px; margin: 0 auto; }
.placeholder-icon { font-size: 4rem; margin-bottom: var(--spacing-4); }
.placeholder-title { font-size: 1.5rem; font-weight: 600; margin-bottom: var(--spacing-3); color: var(--color-neutral-800); }
[data-theme="dark"] .placeholder-title { color: var(--color-neutral-200); }
.placeholder-text { font-size: 1rem; color: var(--color-neutral-600); line-height: 1.6; margin-bottom: var(--spacing-6); }
[data-theme="dark"] .placeholder-text { color: var(--color-neutral-400); }
.feature-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-3); }
.feature-item { padding: var(--spacing-2); background: rgba(30, 58, 138, 0.1); border-radius: var(--radius-lg); font-size: 0.875rem; font-weight: 500; color: var(--color-primary-nebula); }
[data-theme="dark"] .feature-item { background: rgba(16, 185, 129, 0.1); color: var(--color-primary-aurora); }
@media (max-width: 480px) { .page-title { font-size: 2rem; } .feature-list { grid-template-columns: 1fr; } .content-card { padding: var(--spacing-6); } }
</style>