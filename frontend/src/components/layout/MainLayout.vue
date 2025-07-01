<!--
  主布局组件 - VideoChat应用的主要布局结构
  包含侧边栏、顶部导航和内容区域
-->
<template>
  <div class="main-layout" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <!-- 侧边栏 -->
    <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" @navigate="handleNavigation" />

    <!-- 主内容区域 -->
    <div class="layout-content">
      <!-- 顶部导航 -->
      <Header
        :sidebar-collapsed="sidebarCollapsed"
        @toggle-sidebar="toggleSidebar"
        @toggle-theme="toggleTheme"
      />

      <!-- 页面内容 -->
      <main class="content-main">
        <div class="content-wrapper">
          <!-- 路由视图 -->
          <router-view v-slot="{ Component, route }">
            <transition name="page-fade" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>

    <!-- 移动端遮罩层 -->
    <div v-if="isMobile && !sidebarCollapsed" class="mobile-overlay" @click="toggleSidebar"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import Sidebar from './Sidebar.vue'
import Header from './Header.vue'

// 路由和主题
const router = useRouter()
const { toggleTheme } = useTheme()

// 响应式状态
const sidebarCollapsed = ref(false)
const windowWidth = ref(window.innerWidth)

// 计算属性
const isMobile = computed(() => windowWidth.value < 768)

// 侧边栏控制
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value

  // 保存侧边栏状态到localStorage
  localStorage.setItem('sidebar-collapsed', sidebarCollapsed.value.toString())
}

// 导航处理
const handleNavigation = (routeName: string) => {
  router.push({ name: routeName })

  // 移动端导航后自动收起侧边栏
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

// 窗口大小变化处理
const handleResize = () => {
  windowWidth.value = window.innerWidth

  // 移动端自动收起侧边栏
  if (isMobile.value && !sidebarCollapsed.value) {
    sidebarCollapsed.value = true
  }
}

// 初始化
const initLayout = () => {
  // 从localStorage恢复侧边栏状态
  const savedState = localStorage.getItem('sidebar-collapsed')
  if (savedState !== null) {
    sidebarCollapsed.value = savedState === 'true'
  }

  // 移动端默认收起侧边栏
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

// 生命周期
onMounted(() => {
  initLayout()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.main-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-neutral-50);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

[data-theme='dark'] .main-layout {
  background: var(--color-neutral-900);
}

.layout-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 防止flex子项溢出 */
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.content-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.content-wrapper {
  height: 100%;
  overflow-y: auto;
  padding: var(--spacing-6);
  background: transparent;
}

/* 移动端遮罩层 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-overlay);
  backdrop-filter: blur(4px);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

/* 页面切换动画 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* 响应式设计 */
@media (max-width: 767px) {
  .content-wrapper {
    padding: var(--spacing-4);
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .content-wrapper {
    padding: var(--spacing-5);
  }
}

@media (min-width: 1024px) {
  .content-wrapper {
    padding: var(--spacing-6);
  }
}

/* 侧边栏收起状态的布局调整 */
.sidebar-collapsed .layout-content {
  /* 布局会自动调整，因为侧边栏宽度变化 */
}

/* 滚动条样式 */
.content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.content-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.content-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.content-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

[data-theme='dark'] .content-wrapper::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

[data-theme='dark'] .content-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
