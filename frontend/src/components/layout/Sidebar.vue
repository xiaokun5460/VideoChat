<!--
  侧边栏组件 - 导航菜单和品牌标识
  支持折叠/展开和响应式设计
-->
<template>
  <aside class="sidebar" :class="{ collapsed }">
    <!-- 品牌标识区域 -->
    <div class="sidebar-header">
      <div class="brand-logo">
        <div class="logo-icon">🌌</div>
        <transition name="brand-fade">
          <div v-if="!collapsed" class="brand-text">
            <h1 class="brand-title gradient-text">VideoChat</h1>
            <p class="brand-subtitle">深空极光</p>
          </div>
        </transition>
      </div>
    </div>

    <!-- 导航菜单 -->
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div v-if="!collapsed" class="section-title">主要功能</div>
        <ul class="nav-menu">
          <li v-for="route in menuRoutes" :key="route.name as string" class="nav-item">
            <a
              href="#"
              class="nav-link"
              :class="{ active: isActiveRoute(route.name as string) }"
              @click.prevent="handleNavClick(route.name as string)"
            >
              <span class="nav-icon">{{ route.meta?.icon }}</span>
              <transition name="text-fade">
                <span v-if="!collapsed" class="nav-text">{{ route.meta?.title }}</span>
              </transition>
            </a>
          </li>
        </ul>
      </div>
    </nav>

    <!-- 底部操作区域 -->
    <div class="sidebar-footer">
      <!-- 主题切换按钮 -->
      <button
        class="footer-btn"
        @click="$emit('toggle-theme')"
        :title="collapsed ? '切换主题' : ''"
      >
        <span class="btn-icon">{{ isDark ? '🌙' : '☀️' }}</span>
        <transition name="text-fade">
          <span v-if="!collapsed" class="btn-text">
            {{ isDark ? '暗黑模式' : '明亮模式' }}
          </span>
        </transition>
      </button>

      <!-- 折叠切换按钮 -->
      <button
        class="footer-btn toggle-btn"
        @click="$emit('toggle')"
        :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
      >
        <span class="btn-icon">{{ collapsed ? '→' : '←' }}</span>
        <transition name="text-fade">
          <span v-if="!collapsed" class="btn-text">收起菜单</span>
        </transition>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { getMenuRoutes } from '@/router'

// Props
interface Props {
  collapsed: boolean
}

defineProps<Props>()

// 路由和主题
const route = useRoute()
const { isDark } = useTheme()

// Emits
const emit = defineEmits<{
  toggle: []
  navigate: [routeName: string]
  'toggle-theme': []
}>()

// 菜单路由
const menuRoutes = computed(() => getMenuRoutes())

// 判断是否为活跃路由
const isActiveRoute = (routeName: string): boolean => {
  return route.name === routeName
}

// 处理导航点击
const handleNavClick = (routeName: string) => {
  // 发送导航事件到父组件
  emit('navigate', routeName)
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: var(--gradient-glass-light);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  flex-direction: column;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  position: relative;
  z-index: var(--z-sticky);
}

[data-theme='dark'] .sidebar {
  background: var(--gradient-glass-dark);
  border-right-color: rgba(16, 185, 129, 0.2);
}

.sidebar.collapsed {
  width: 80px;
}

/* 品牌标识区域 */
.sidebar-header {
  padding: var(--spacing-6) var(--spacing-4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme='dark'] .sidebar-header {
  border-bottom-color: rgba(16, 185, 129, 0.1);
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.logo-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-aurora);
  border-radius: var(--radius-xl);
  flex-shrink: 0;
}

.brand-text {
  min-width: 0;
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  font-family: var(--font-display);
}

.brand-subtitle {
  font-size: 0.875rem;
  opacity: 0.7;
  margin: 0;
  font-weight: 500;
}

/* 导航菜单 */
.sidebar-nav {
  flex: 1;
  padding: var(--spacing-4) 0;
  overflow-y: auto;
}

.nav-section {
  padding: 0 var(--spacing-4);
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-neutral-500);
  margin-bottom: var(--spacing-3);
  padding: 0 var(--spacing-2);
}

[data-theme='dark'] .section-title {
  color: var(--color-neutral-400);
}

.nav-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  margin-bottom: var(--spacing-1);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-2);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-neutral-700);
  font-weight: 500;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  position: relative;
  overflow: hidden;
}

[data-theme='dark'] .nav-link {
  color: var(--color-neutral-300);
}

.nav-link:hover {
  background: rgba(30, 58, 138, 0.1);
  color: var(--color-primary-nebula);
  transform: translateX(4px);
}

[data-theme='dark'] .nav-link:hover {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-primary-aurora);
}

.nav-link.active {
  background: var(--gradient-aurora);
  color: white;
  box-shadow: var(--shadow-glow);
}

.nav-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--color-secondary-quantum);
}

.nav-icon {
  font-size: 1.25rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-text {
  font-size: 0.9rem;
  white-space: nowrap;
}

/* 底部操作区域 */
.sidebar-footer {
  padding: var(--spacing-4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

[data-theme='dark'] .sidebar-footer {
  border-top-color: rgba(16, 185, 129, 0.1);
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2);
  border: none;
  background: transparent;
  color: var(--color-neutral-600);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
  width: 100%;
  text-align: left;
}

[data-theme='dark'] .footer-btn {
  color: var(--color-neutral-400);
}

.footer-btn:hover {
  background: rgba(30, 58, 138, 0.1);
  color: var(--color-primary-nebula);
}

[data-theme='dark'] .footer-btn:hover {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-primary-aurora);
}

.btn-icon {
  font-size: 1rem;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-text {
  white-space: nowrap;
}

/* 动画效果 */
.brand-fade-enter-active,
.brand-fade-leave-active,
.text-fade-enter-active,
.text-fade-leave-active {
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.brand-fade-enter-from,
.brand-fade-leave-to,
.text-fade-enter-from,
.text-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 响应式设计 */
@media (max-width: 767px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: var(--z-modal);
    transform: translateX(-100%);
  }

  .sidebar:not(.collapsed) {
    transform: translateX(0);
  }
}

/* 滚动条样式 */
.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

[data-theme='dark'] .sidebar-nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}
</style>
