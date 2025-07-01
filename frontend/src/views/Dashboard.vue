<!--
  仪表板页面 - VideoChat应用的主页
  展示系统概览、快速操作和统计信息
-->
<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">仪表板</h1>
      <p class="page-description">欢迎使用VideoChat，您的智能音视频处理助手</p>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div 
        v-for="stat in stats" 
        :key="stat.id"
        class="stat-card glass-effect"
        :class="isDark ? 'glass-dark' : 'glass-light'"
      >
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
          <div class="stat-change" :class="stat.changeType">
            {{ stat.change }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 快速操作 -->
    <div class="quick-actions">
      <h2 class="section-title">快速操作</h2>
      <div class="actions-grid">
        <NCard 
          v-for="action in quickActions"
          :key="action.id"
          class="action-card"
          hoverable
          @click="handleActionClick(action.route)"
        >
          <div class="action-content">
            <div class="action-icon">{{ action.icon }}</div>
            <div class="action-info">
              <h3 class="action-title">{{ action.title }}</h3>
              <p class="action-description">{{ action.description }}</p>
            </div>
          </div>
        </NCard>
      </div>
    </div>
    
    <!-- 最近活动 -->
    <div class="recent-activity">
      <h2 class="section-title">最近活动</h2>
      <NCard class="activity-card">
        <div class="activity-list">
          <div 
            v-for="activity in recentActivities"
            :key="activity.id"
            class="activity-item"
          >
            <div class="activity-icon">{{ activity.icon }}</div>
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
            <div class="activity-status" :class="activity.status">
              {{ getStatusText(activity.status) }}
            </div>
          </div>
        </div>
      </NCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import { NCard } from 'naive-ui'

// 路由和主题
const router = useRouter()
const { isDark } = useTheme()

// 统计数据
const stats = ref([
  {
    id: 1,
    icon: '📁',
    value: '128',
    label: '处理文件',
    change: '+12%',
    changeType: 'positive'
  },
  {
    id: 2,
    icon: '🎵',
    value: '45',
    label: '转录任务',
    change: '+8%',
    changeType: 'positive'
  },
  {
    id: 3,
    icon: '🤖',
    value: '89',
    label: 'AI分析',
    change: '+15%',
    changeType: 'positive'
  },
  {
    id: 4,
    icon: '⬇️',
    value: '23',
    label: '视频下载',
    change: '-3%',
    changeType: 'negative'
  }
])

// 快速操作
const quickActions = ref([
  {
    id: 1,
    icon: '📁',
    title: '上传文件',
    description: '上传音频或视频文件进行处理',
    route: 'Upload'
  },
  {
    id: 2,
    icon: '🎵',
    title: '音视频转录',
    description: '将音频内容转换为文字',
    route: 'Transcription'
  },
  {
    id: 3,
    icon: '🤖',
    title: 'AI功能',
    description: '智能摘要、思维导图、对话分析',
    route: 'AIFeatures'
  },
  {
    id: 4,
    icon: '⬇️',
    title: '视频下载',
    description: '从在线平台下载视频内容',
    route: 'VideoDownload'
  }
])

// 最近活动
const recentActivities = ref([
  {
    id: 1,
    icon: '📁',
    title: '上传了文件 "会议录音.mp3"',
    time: '2分钟前',
    status: 'completed'
  },
  {
    id: 2,
    icon: '🎵',
    title: '转录任务 "产品讨论" 已完成',
    time: '15分钟前',
    status: 'completed'
  },
  {
    id: 3,
    icon: '🤖',
    title: 'AI摘要生成中...',
    time: '30分钟前',
    status: 'processing'
  },
  {
    id: 4,
    icon: '⬇️',
    title: '视频下载失败',
    time: '1小时前',
    status: 'error'
  },
  {
    id: 5,
    icon: '📤',
    title: '导出了转录结果',
    time: '2小时前',
    status: 'completed'
  }
])

// 处理快速操作点击
const handleActionClick = (route: string) => {
  router.push({ name: route })
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    completed: '已完成',
    processing: '处理中',
    error: '失败',
    pending: '等待中'
  }
  return statusMap[status] || '未知'
}
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
}

/* 页面标题 */
.page-header {
  margin-bottom: var(--spacing-8);
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-2);
  font-family: var(--font-display);
}

.page-description {
  font-size: 1.125rem;
  color: var(--color-neutral-600);
  margin: 0;
}

[data-theme="dark"] .page-description {
  color: var(--color-neutral-400);
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-6);
  margin-bottom: var(--spacing-8);
}

.stat-card {
  padding: var(--spacing-6);
  border-radius: var(--radius-2xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-icon {
  font-size: 2.5rem;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-aurora);
  border-radius: var(--radius-xl);
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-neutral-800);
  line-height: 1.2;
}

[data-theme="dark"] .stat-value {
  color: var(--color-neutral-200);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin-bottom: var(--spacing-1);
}

[data-theme="dark"] .stat-label {
  color: var(--color-neutral-400);
}

.stat-change {
  font-size: 0.875rem;
  font-weight: 600;
}

.stat-change.positive {
  color: var(--color-success);
}

.stat-change.negative {
  color: var(--color-error);
}

/* 快速操作 */
.quick-actions {
  margin-bottom: var(--spacing-8);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-4);
  color: var(--color-neutral-800);
}

[data-theme="dark"] .section-title {
  color: var(--color-neutral-200);
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.action-card {
  cursor: pointer;
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.action-card:hover {
  transform: translateY(-2px);
}

.action-content {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}

.action-icon {
  font-size: 2rem;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-quantum);
  border-radius: var(--radius-lg);
  flex-shrink: 0;
}

.action-info {
  flex: 1;
}

.action-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 var(--spacing-1) 0;
  color: var(--color-neutral-800);
}

[data-theme="dark"] .action-title {
  color: var(--color-neutral-200);
}

.action-description {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0;
  line-height: 1.4;
}

[data-theme="dark"] .action-description {
  color: var(--color-neutral-400);
}

/* 最近活动 */
.recent-activity {
  margin-bottom: var(--spacing-8);
}

.activity-card {
  padding: 0;
}

.activity-list {
  padding: var(--spacing-4);
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  border-radius: var(--radius-lg);
  transition: all var(--duration-normal) var(--easing-ease-in-out);
}

.activity-item:hover {
  background: rgba(30, 58, 138, 0.05);
}

[data-theme="dark"] .activity-item:hover {
  background: rgba(16, 185, 129, 0.05);
}

.activity-item:not(:last-child) {
  border-bottom: 1px solid var(--color-neutral-200);
  margin-bottom: var(--spacing-2);
  padding-bottom: var(--spacing-3);
}

[data-theme="dark"] .activity-item:not(:last-child) {
  border-bottom-color: var(--color-neutral-700);
}

.activity-icon {
  font-size: 1.25rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-neutral-100);
  border-radius: var(--radius-md);
  flex-shrink: 0;
}

[data-theme="dark"] .activity-icon {
  background: var(--color-neutral-800);
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-neutral-800);
  margin-bottom: var(--spacing-1);
}

[data-theme="dark"] .activity-title {
  color: var(--color-neutral-200);
}

.activity-time {
  font-size: 0.75rem;
  color: var(--color-neutral-500);
}

.activity-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.activity-status.completed {
  background: rgba(34, 197, 94, 0.1);
  color: var(--color-success);
}

.activity-status.processing {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning);
}

.activity-status.error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-error);
}

.activity-status.pending {
  background: rgba(6, 182, 212, 0.1);
  color: var(--color-info);
}

/* 响应式设计 */
@media (max-width: 767px) {
  .page-title {
    font-size: 2rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: var(--spacing-4);
  }
  
  .stat-icon {
    width: 48px;
    height: 48px;
    font-size: 2rem;
  }
  
  .stat-value {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
  }
  
  .action-content {
    gap: var(--spacing-3);
  }
  
  .action-icon {
    width: 40px;
    height: 40px;
    font-size: 1.5rem;
  }
  
  .activity-item {
    gap: var(--spacing-2);
  }
}
</style>