<!--
  VideoChat Vue 3 前端应用主组件
  集成Naive UI主题系统和路由系统
-->
<script setup lang="ts">
import {
  NConfigProvider,
  NGlobalStyle,
  NMessageProvider,
  NDialogProvider,
  NNotificationProvider,
} from 'naive-ui'
import { useTheme } from '@/composables/useTheme'
import GlobalTaskManager from '@/components/common/GlobalTaskManager.vue'

// 使用主题管理
const { currentTheme, themeOverrides } = useTheme()
</script>

<template>
  <!-- Naive UI 配置提供者 - 全局主题配置 -->
  <NConfigProvider :theme="currentTheme" :theme-overrides="themeOverrides" abstract>
    <!-- 全局样式同步 -->
    <NGlobalStyle />

    <!-- 消息提供者 -->
    <NMessageProvider>
      <!-- 对话框提供者 -->
      <NDialogProvider>
        <!-- 通知提供者 -->
        <NNotificationProvider>
          <!-- 路由视图 - 主应用内容 -->
          <router-view />

          <!-- 全局任务管理器 -->
          <GlobalTaskManager />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
/* App组件现在只负责提供全局配置，具体样式由各个页面和布局组件负责 */
</style>
