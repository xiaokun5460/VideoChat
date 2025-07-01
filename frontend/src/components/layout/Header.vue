<!--
  顶部导航组件 - 面包屑、搜索、用户信息等
  支持响应式设计和主题切换
-->
<template>
  <header class="app-header">
    <div class="header-content">
      <!-- 左侧区域 -->
      <div class="header-left">
        <!-- 移动端菜单按钮 -->
        <button v-if="isMobile" class="mobile-menu-btn" @click="$emit('toggle-sidebar')">
          <span class="menu-icon">☰</span>
        </button>

        <!-- 面包屑导航 -->
        <nav class="breadcrumb" v-if="!isMobile">
          <ol class="breadcrumb-list">
            <li class="breadcrumb-item">
              <router-link to="/dashboard" class="breadcrumb-link">
                <span class="breadcrumb-icon">🏠</span>
                <span class="breadcrumb-text">首页</span>
              </router-link>
            </li>
            <li v-if="currentRoute.name !== 'Dashboard'" class="breadcrumb-item">
              <span class="breadcrumb-separator">›</span>
              <span class="breadcrumb-current">
                <span class="breadcrumb-icon">{{ currentRoute.meta?.icon }}</span>
                <span class="breadcrumb-text">{{ currentRoute.meta?.title }}</span>
              </span>
            </li>
          </ol>
        </nav>

        <!-- 移动端页面标题 -->
        <div v-if="isMobile" class="mobile-title">
          <span class="title-icon">{{ currentRoute.meta?.icon }}</span>
          <h1 class="title-text">{{ currentRoute.meta?.title || 'VideoChat' }}</h1>
        </div>
      </div>

      <!-- 右侧区域 -->
      <div class="header-right">
        <!-- 搜索框 -->
        <div class="search-box" v-if="!isMobile">
          <NInput v-model:value="searchQuery" placeholder="搜索功能..." size="medium" clearable>
            <template #prefix>
              <span class="search-icon">🔍</span>
            </template>
          </NInput>
        </div>

        <!-- 操作按钮组 -->
        <div class="action-buttons">
          <!-- 通知按钮 -->
          <button class="action-btn" title="通知">
            <span class="btn-icon">🔔</span>
            <span v-if="notificationCount > 0" class="notification-badge">
              {{ notificationCount }}
            </span>
          </button>

          <!-- 主题切换按钮 -->
          <button
            class="action-btn theme-btn"
            @click="$emit('toggle-theme')"
            :title="isDark ? '切换到明亮模式' : '切换到暗黑模式'"
          >
            <span class="btn-icon">{{ isDark ? '🌙' : '☀️' }}</span>
          </button>

          <!-- 全屏按钮 -->
          <button
            class="action-btn"
            @click="toggleFullscreen"
            :title="isFullscreen ? '退出全屏' : '进入全屏'"
          >
            <span class="btn-icon">{{ isFullscreen ? '🗗' : '🗖' }}</span>
          </button>

          <!-- 用户菜单 -->
          <NDropdown
            :options="userMenuOptions"
            @select="handleUserMenuSelect"
            placement="bottom-end"
          >
            <button class="user-avatar">
              <span class="avatar-fallback">👤</span>
            </button>
          </NDropdown>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { NInput, NDropdown } from 'naive-ui'
import type { DropdownOption } from 'naive-ui'

// Props
interface Props {
  sidebarCollapsed: boolean
}

defineProps<Props>()

// Emits
defineEmits<{
  'toggle-sidebar': []
  'toggle-theme': []
}>()

// 路由和主题
const route = useRoute()
const router = useRouter()
const { isDark } = useTheme()

// 响应式状态
const searchQuery = ref('')
const notificationCount = ref(3) // 模拟通知数量
const windowWidth = ref(window.innerWidth)
const isFullscreen = ref(false)

// 计算属性
const isMobile = computed(() => windowWidth.value < 768)
const currentRoute = computed(() => route)

// 用户菜单选项
const userMenuOptions: DropdownOption[] = [
  {
    label: '个人资料',
    key: 'profile',
    icon: () => '👤',
  },
  {
    label: '账户设置',
    key: 'account',
    icon: () => '⚙️',
  },
  {
    type: 'divider',
    key: 'divider1',
  },
  {
    label: '帮助中心',
    key: 'help',
    icon: () => '❓',
  },
  {
    label: '关于',
    key: 'about',
    icon: () => 'ℹ️',
  },
  {
    type: 'divider',
    key: 'divider2',
  },
  {
    label: '退出登录',
    key: 'logout',
    icon: () => '🚪',
  },
]

// 处理用户菜单选择
const handleUserMenuSelect = (key: string) => {
  switch (key) {
    case 'profile':
      console.log('打开个人资料')
      break
    case 'account':
      router.push('/settings')
      break
    case 'help':
      console.log('打开帮助中心')
      break
    case 'about':
      console.log('显示关于信息')
      break
    case 'logout':
      console.log('退出登录')
      break
  }
}

// 全屏切换
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 头像相关功能预留

// 窗口大小变化处理
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 全屏状态变化处理
const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
})
</script>

<style scoped>
.app-header {
  height: 64px;
  background: var(--gradient-glass-light);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

[data-theme='dark'] .app-header {
  background: var(--gradient-glass-dark);
  border-bottom-color: rgba(16, 185, 129, 0.2);
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-6);
  max-width: 100%;
}

/* 左侧区域 */
.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex: 1;
  min-width: 0;
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--color-neutral-600);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

[data-theme='dark'] .mobile-menu-btn {
  color: var(--color-neutral-400);
}

.mobile-menu-btn:hover {
  background: rgba(30, 58, 138, 0.1);
  color: var(--color-primary-nebula);
}

[data-theme='dark'] .mobile-menu-btn:hover {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-primary-aurora);
}

.menu-icon {
  font-size: 1.25rem;
}

/* 面包屑导航 */
.breadcrumb {
  flex: 1;
  min-width: 0;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: var(--spacing-2);
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  text-decoration: none;
  color: var(--color-neutral-600);
  font-size: 0.875rem;
  font-weight: 500;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-md);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

[data-theme='dark'] .breadcrumb-link {
  color: var(--color-neutral-400);
}

.breadcrumb-link:hover {
  background: rgba(30, 58, 138, 0.1);
  color: var(--color-primary-nebula);
}

[data-theme='dark'] .breadcrumb-link:hover {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-primary-aurora);
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--color-neutral-800);
  font-size: 0.875rem;
  font-weight: 600;
}

[data-theme='dark'] .breadcrumb-current {
  color: var(--color-neutral-200);
}

.breadcrumb-separator {
  color: var(--color-neutral-400);
  font-size: 0.875rem;
}

.breadcrumb-icon {
  font-size: 1rem;
}

.breadcrumb-text {
  white-space: nowrap;
}

/* 移动端标题 */
.mobile-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex: 1;
  min-width: 0;
}

.title-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.title-text {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: var(--color-neutral-800);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

[data-theme='dark'] .title-text {
  color: var(--color-neutral-200);
}

/* 右侧区域 */
.header-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  flex-shrink: 0;
}

.search-box {
  width: 240px;
}

.search-icon {
  color: var(--color-neutral-500);
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.action-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--color-neutral-600);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

[data-theme='dark'] .action-btn {
  color: var(--color-neutral-400);
}

.action-btn:hover {
  background: rgba(30, 58, 138, 0.1);
  color: var(--color-primary-nebula);
  transform: translateY(-1px);
}

[data-theme='dark'] .action-btn:hover {
  background: rgba(16, 185, 129, 0.1);
  color: var(--color-primary-aurora);
}

.btn-icon {
  font-size: 1.125rem;
}

.notification-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--color-error);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

/* 用户头像 */
.user-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border: none;
  background: var(--gradient-aurora);
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.user-avatar:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-glow);
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: white;
}

/* 响应式设计 */
@media (max-width: 767px) {
  .header-content {
    padding: 0 var(--spacing-4);
  }

  .action-buttons {
    gap: var(--spacing-1);
  }

  .action-btn {
    width: 36px;
    height: 36px;
  }

  .user-avatar {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .header-content {
    padding: 0 var(--spacing-3);
  }

  .mobile-title .title-text {
    font-size: 1rem;
  }
}
</style>
