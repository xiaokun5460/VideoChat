<!--
  设计系统展示页面 - 将原App.vue的设计系统展示移到这里
-->
<template>
  <div class="design-system-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">深空极光设计系统</h1>
      <p class="page-description">VideoChat应用的完整视觉设计语言展示</p>
    </div>
    
    <!-- 粒子背景 -->
    <div class="particles-bg">
      <div class="particle" style="left: 10%; top: 20%; animation-delay: 0s;"></div>
      <div class="particle" style="left: 20%; top: 80%; animation-delay: -1s;"></div>
      <div class="particle" style="left: 60%; top: 30%; animation-delay: -2s;"></div>
      <div class="particle" style="left: 80%; top: 70%; animation-delay: -3s;"></div>
      <div class="particle" style="left: 40%; top: 10%; animation-delay: -4s;"></div>
      <div class="particle" style="left: 90%; top: 50%; animation-delay: -5s;"></div>
    </div>
    
    <!-- 主题切换控制 -->
    <div class="theme-controls glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
      <h3>主题控制</h3>
      <div class="control-group">
        <NButton @click="toggleTheme" type="primary" size="large">
          {{ isDark ? '🌙 暗黑模式' : '☀️ 明亮模式' }}
        </NButton>
        <NButton @click="enableSystemTheme" :disabled="isSystemTheme" ghost>
          🖥️ 系统主题
        </NButton>
      </div>
    </div>
    
    <!-- 设计系统展示 -->
    <div class="design-showcase">
      <div class="showcase-grid">
        <!-- 按钮展示 -->
        <div class="showcase-card glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
          <h4>按钮系统</h4>
          <div class="button-group">
            <NButton type="primary" size="large">主要按钮</NButton>
            <NButton type="default" size="large">默认按钮</NButton>
            <NButton type="tertiary" size="large">第三按钮</NButton>
            <NButton type="primary" ghost size="large">幽灵按钮</NButton>
          </div>
        </div>
        
        <!-- 卡片展示 -->
        <div class="showcase-card glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
          <h4>卡片系统</h4>
          <NCard title="示例卡片" size="small" style="margin-bottom: 12px;">
            <template #header-extra>
              <NButton size="small" type="primary">操作</NButton>
            </template>
            这是一个使用新拟态设计的卡片组件，具有柔和的阴影效果和现代化的视觉风格。
          </NCard>
        </div>
        
        <!-- 输入框展示 -->
        <div class="showcase-card glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
          <h4>输入系统</h4>
          <div class="input-group">
            <NInput placeholder="请输入内容..." size="large" style="margin-bottom: 12px;" />
            <NInput placeholder="带图标的输入框" size="large">
              <template #prefix>
                <span>🔍</span>
              </template>
            </NInput>
          </div>
        </div>
        
        <!-- 色彩展示 -->
        <div class="showcase-card glass-effect" :class="isDark ? 'glass-dark' : 'glass-light'">
          <h4>色彩系统</h4>
          <div class="color-palette">
            <div class="color-item">
              <div class="color-swatch" style="background: var(--color-primary-aurora);"></div>
              <span>极光绿</span>
            </div>
            <div class="color-item">
              <div class="color-swatch" style="background: var(--color-secondary-quantum);"></div>
              <span>量子紫</span>
            </div>
            <div class="color-item">
              <div class="color-swatch" style="background: var(--color-secondary-fusion);"></div>
              <span>聚变青</span>
            </div>
            <div class="color-item">
              <div class="color-swatch" style="background: var(--color-secondary-energy);"></div>
              <span>能量橙</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'
import { NButton, NCard, NInput } from 'naive-ui'

// 使用主题管理
const { isDark, isSystemTheme, toggleTheme, enableSystemTheme } = useTheme()
</script>

<style scoped>
.design-system-page {
  position: relative;
  min-height: 100vh;
  padding: var(--spacing-6);
}

.page-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
}

.page-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: var(--spacing-2);
  font-family: var(--font-display);
}

.page-description {
  font-size: 1.2rem;
  opacity: 0.8;
  margin: 0;
}

/* 主题控制区域 */
.theme-controls {
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
  text-align: center;
  margin: 0 auto var(--spacing-8);
  max-width: 500px;
}

.theme-controls h3 {
  margin-bottom: var(--spacing-4);
  font-size: 1.2rem;
  font-weight: 600;
}

.control-group {
  display: flex;
  gap: var(--spacing-4);
  justify-content: center;
  flex-wrap: wrap;
}

/* 设计系统展示 */
.design-showcase {
  max-width: 1200px;
  margin: 0 auto;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--spacing-6);
}

.showcase-card {
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.showcase-card h4 {
  margin-bottom: var(--spacing-4);
  font-size: 1.1rem;
  font-weight: 600;
  color: inherit;
}

/* 按钮组 */
.button-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* 输入框组 */
.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

/* 色彩面板 */
.color-palette {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
}

.color-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 2px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.color-item span {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .design-system-page {
    padding: var(--spacing-4);
  }
  
  .page-title {
    font-size: 2.5rem;
  }
  
  .showcase-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }
  
  .control-group {
    flex-direction: column;
    align-items: center;
  }
  
  .color-palette {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 2rem;
  }
  
  .showcase-card {
    padding: var(--spacing-4);
  }
  
  .theme-controls {
    padding: var(--spacing-4);
  }
}
</style>