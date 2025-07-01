<!--
  设置页面 - 用户偏好和系统配置
  提供主题设置、语言配置、通知管理等个性化选项
-->
<template>
  <div class="settings-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title gradient-text">设置</h1>
      <p class="page-description">个性化配置和系统偏好设置</p>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 外观设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🎨</span>
            外观设置
          </h3>
          <p class="section-description">自定义应用的视觉外观</p>
        </div>

        <div class="settings-group">
          <!-- 主题切换 -->
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">主题模式</h4>
              <p class="setting-description">选择浅色或深色主题</p>
            </div>
            <div class="setting-control">
              <NSwitch v-model:value="isDark" @update:value="toggleTheme" size="large">
                <template #checked>🌙</template>
                <template #unchecked>☀️</template>
              </NSwitch>
            </div>
          </div>

          <!-- 动画效果 -->
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">动画效果</h4>
              <p class="setting-description">启用或禁用界面动画</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.animations"
                @update:value="updateSetting('animations', $event)"
                size="large"
              />
            </div>
          </div>

          <!-- 紧凑模式 -->
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">紧凑模式</h4>
              <p class="setting-description">减少界面元素间距</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.compactMode"
                @update:value="updateSetting('compactMode', $event)"
                size="large"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 语言设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🌍</span>
            语言设置
          </h3>
          <p class="section-description">选择应用界面语言</p>
        </div>

        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">界面语言</h4>
              <p class="setting-description">设置应用界面显示语言</p>
            </div>
            <div class="setting-control">
              <NSelect
                v-model:value="settings.language"
                @update:value="updateSetting('language', $event)"
                :options="languageOptions"
                style="width: 200px"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">转录语言</h4>
              <p class="setting-description">默认的音视频转录语言</p>
            </div>
            <div class="setting-control">
              <NSelect
                v-model:value="settings.transcriptionLanguage"
                @update:value="updateSetting('transcriptionLanguage', $event)"
                :options="transcriptionLanguageOptions"
                style="width: 200px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 通知设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🔔</span>
            通知设置
          </h3>
          <p class="section-description">管理应用通知和提醒</p>
        </div>

        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">桌面通知</h4>
              <p class="setting-description">允许显示桌面通知</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.desktopNotifications"
                @update:value="updateSetting('desktopNotifications', $event)"
                size="large"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">处理完成通知</h4>
              <p class="setting-description">转录或分析完成时通知</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.processCompleteNotifications"
                @update:value="updateSetting('processCompleteNotifications', $event)"
                size="large"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">错误通知</h4>
              <p class="setting-description">处理错误时显示通知</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.errorNotifications"
                @update:value="updateSetting('errorNotifications', $event)"
                size="large"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 性能设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">⚡</span>
            性能设置
          </h3>
          <p class="section-description">优化应用性能和资源使用</p>
        </div>

        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">自动保存</h4>
              <p class="setting-description">自动保存工作进度</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.autoSave"
                @update:value="updateSetting('autoSave', $event)"
                size="large"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">缓存大小</h4>
              <p class="setting-description">设置本地缓存大小限制</p>
            </div>
            <div class="setting-control">
              <NSelect
                v-model:value="settings.cacheSize"
                @update:value="updateSetting('cacheSize', $event)"
                :options="cacheSizeOptions"
                style="width: 150px"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">并发处理</h4>
              <p class="setting-description">同时处理的最大文件数</p>
            </div>
            <div class="setting-control">
              <NInputNumber
                v-model:value="settings.maxConcurrentFiles"
                @update:value="updateSetting('maxConcurrentFiles', $event)"
                :min="1"
                :max="10"
                style="width: 120px"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 隐私设置 -->
      <div class="settings-section">
        <div class="section-header">
          <h3 class="section-title">
            <span class="section-icon">🔒</span>
            隐私设置
          </h3>
          <p class="section-description">管理数据隐私和安全选项</p>
        </div>

        <div class="settings-group">
          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">数据收集</h4>
              <p class="setting-description">允许收集匿名使用数据</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.dataCollection"
                @update:value="updateSetting('dataCollection', $event)"
                size="large"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">自动清理</h4>
              <p class="setting-description">定期清理临时文件</p>
            </div>
            <div class="setting-control">
              <NSwitch
                v-model:value="settings.autoCleanup"
                @update:value="updateSetting('autoCleanup', $event)"
                size="large"
              />
            </div>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <h4 class="setting-title">清理周期</h4>
              <p class="setting-description">自动清理的时间间隔</p>
            </div>
            <div class="setting-control">
              <NSelect
                v-model:value="settings.cleanupInterval"
                @update:value="updateSetting('cleanupInterval', $event)"
                :options="cleanupIntervalOptions"
                style="width: 150px"
                :disabled="!settings.autoCleanup"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="settings-actions">
        <NButton @click="resetSettings">
          <template #icon>
            <span>🔄</span>
          </template>
          重置设置
        </NButton>
        <NButton @click="exportSettings">
          <template #icon>
            <span>📤</span>
          </template>
          导出设置
        </NButton>
        <NButton @click="importSettings">
          <template #icon>
            <span>📥</span>
          </template>
          导入设置
        </NButton>
        <NButton type="primary" @click="saveSettings">
          <template #icon>
            <span>💾</span>
          </template>
          保存设置
        </NButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue'
import { NSwitch, NSelect, NInputNumber, NButton, useMessage } from 'naive-ui'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
const message = useMessage()

// 设置状态
const settings = reactive({
  animations: true,
  compactMode: false,
  language: 'zh-CN',
  transcriptionLanguage: 'zh',
  desktopNotifications: true,
  processCompleteNotifications: true,
  errorNotifications: true,
  autoSave: true,
  cacheSize: '1GB',
  maxConcurrentFiles: 3,
  dataCollection: false,
  autoCleanup: true,
  cleanupInterval: '7days',
})

// 选项数据
const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
  { label: '日本語', value: 'ja-JP' },
  { label: '한국어', value: 'ko-KR' },
]

const transcriptionLanguageOptions = [
  { label: '中文', value: 'zh' },
  { label: 'English', value: 'en' },
  { label: '日本語', value: 'ja' },
  { label: '한국어', value: 'ko' },
  { label: 'Français', value: 'fr' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Español', value: 'es' },
]

const cacheSizeOptions = [
  { label: '512MB', value: '512MB' },
  { label: '1GB', value: '1GB' },
  { label: '2GB', value: '2GB' },
  { label: '5GB', value: '5GB' },
  { label: '10GB', value: '10GB' },
]

const cleanupIntervalOptions = [
  { label: '每天', value: '1day' },
  { label: '每周', value: '7days' },
  { label: '每月', value: '30days' },
  { label: '从不', value: 'never' },
]

// 方法
const updateSetting = (key: string, value: any) => {
  ;(settings as any)[key] = value
  message.info(`${key} 设置已更新`)
}

const resetSettings = () => {
  Object.assign(settings, {
    animations: true,
    compactMode: false,
    language: 'zh-CN',
    transcriptionLanguage: 'zh',
    desktopNotifications: true,
    processCompleteNotifications: true,
    errorNotifications: true,
    autoSave: true,
    cacheSize: '1GB',
    maxConcurrentFiles: 3,
    dataCollection: false,
    autoCleanup: true,
    cleanupInterval: '7days',
  })
  message.success('设置已重置为默认值')
}

const exportSettings = () => {
  const settingsData = JSON.stringify(settings, null, 2)
  const blob = new Blob([settingsData], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'videochat-settings.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  message.success('设置已导出')
}

const importSettings = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target?.result as string)
          Object.assign(settings, importedSettings)
          message.success('设置已导入')
        } catch (error) {
          message.error('导入失败：文件格式错误')
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}

const saveSettings = () => {
  // 保存设置到本地存储
  localStorage.setItem('videochat-settings', JSON.stringify(settings))
  message.success('设置已保存')
}

// 生命周期
onMounted(() => {
  // 从本地存储加载设置
  const savedSettings = localStorage.getItem('videochat-settings')
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings)
      Object.assign(settings, parsed)
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
})
</script>

<style scoped>
.settings-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: var(--spacing-8);
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

[data-theme='dark'] .page-description {
  color: var(--color-neutral-400);
}

/* 设置内容 */
.settings-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-8);
}

/* 设置区域 */
.settings-section {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-6);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .settings-section {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.section-header {
  margin-bottom: var(--spacing-6);
  padding-bottom: var(--spacing-4);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .section-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-2) 0;
}

[data-theme='dark'] .section-title {
  color: var(--color-neutral-200);
}

.section-icon {
  font-size: 1.5rem;
}

.section-description {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0;
}

[data-theme='dark'] .section-description {
  color: var(--color-neutral-400);
}

/* 设置组 */
.settings-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-4);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--radius-lg);
  transition: all var(--duration-fast) var(--easing-ease-out);
}

[data-theme='dark'] .setting-item {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.setting-item:hover {
  background: rgba(16, 185, 129, 0.05);
  border-color: rgba(16, 185, 129, 0.2);
  transform: translateY(-1px);
}

.setting-info {
  flex: 1;
  margin-right: var(--spacing-4);
}

.setting-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-neutral-800);
  margin: 0 0 var(--spacing-1) 0;
}

[data-theme='dark'] .setting-title {
  color: var(--color-neutral-200);
}

.setting-description {
  font-size: 0.875rem;
  color: var(--color-neutral-600);
  margin: 0;
  line-height: 1.4;
}

[data-theme='dark'] .setting-description {
  color: var(--color-neutral-400);
}

.setting-control {
  flex-shrink: 0;
}

/* 操作按钮 */
.settings-actions {
  display: flex;
  gap: var(--spacing-4);
  justify-content: center;
  flex-wrap: wrap;
  padding: var(--spacing-6);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-radius: var(--radius-2xl);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] .settings-actions {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-page {
    padding: var(--spacing-4);
  }

  .page-title {
    font-size: 2rem;
  }

  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-3);
  }

  .setting-info {
    margin-right: 0;
  }

  .setting-control {
    align-self: flex-end;
  }

  .settings-actions {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.75rem;
  }

  .section-title {
    font-size: 1.25rem;
  }

  .settings-section {
    padding: var(--spacing-4);
  }
}
</style>
