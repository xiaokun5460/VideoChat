<!--
  主页视图 - VideoChat应用的欢迎页面
-->
<template>
  <div class="home-page">
    <!-- 英雄区域 -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="gradient-text">VideoChat</span>
            <br />
            <span class="hero-subtitle">智能音视频处理平台</span>
          </h1>
          <p class="hero-description">
            基于AI技术的音视频转录、分析和处理平台。
            支持多语言识别、智能总结、思维导图生成等强大功能。
          </p>
          <div class="hero-actions">
            <NButton
              type="primary"
              size="large"
              class="cta-button"
              @click="$router.push('/upload')"
            >
              <template #icon>
                <span>🚀</span>
              </template>
              立即开始
            </NButton>
            <NButton size="large" class="demo-button" @click="() => scrollToFeatures()">
              <template #icon>
                <span>📖</span>
              </template>
              了解更多
            </NButton>
          </div>
        </div>
        <div class="hero-visual">
          <div class="floating-cards">
            <div class="feature-card" v-for="(card, index) in floatingCards" :key="index">
              <div class="card-icon">{{ card.icon }}</div>
              <div class="card-title">{{ card.title }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 功能特色 -->
    <section class="features-section" ref="featuresRef">
      <div class="section-header">
        <h2 class="section-title">核心功能</h2>
        <p class="section-description">强大的AI驱动功能，让音视频处理变得简单高效</p>
      </div>

      <div class="features-grid">
        <div
          v-for="(feature, index) in features"
          :key="index"
          class="feature-item"
          :style="{ animationDelay: `${index * 0.1}s` }"
        >
          <div class="feature-icon">{{ feature.icon }}</div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
          <div class="feature-tags">
            <span v-for="tag in feature.tags" :key="tag" class="feature-tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 工作流程 -->
    <section class="workflow-section">
      <div class="section-header">
        <h2 class="section-title">简单三步，完成处理</h2>
        <p class="section-description">直观的操作流程，让您快速上手</p>
      </div>

      <div class="workflow-steps">
        <div v-for="(step, index) in workflowSteps" :key="index" class="workflow-step">
          <div class="step-number">{{ index + 1 }}</div>
          <div class="step-content">
            <div class="step-icon">{{ step.icon }}</div>
            <h3 class="step-title">{{ step.title }}</h3>
            <p class="step-description">{{ step.description }}</p>
          </div>
          <div v-if="index < workflowSteps.length - 1" class="step-arrow">
            <span>→</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 统计数据 -->
    <section class="stats-section">
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-item">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </section>

    <!-- 快速开始 -->
    <section class="cta-section">
      <div class="cta-content">
        <h2 class="cta-title">准备好开始了吗？</h2>
        <p class="cta-description">立即体验VideoChat的强大功能，让AI为您的音视频内容赋能</p>
        <div class="cta-actions">
          <NButton type="primary" size="large" @click="$router.push('/upload')"> 开始使用 </NButton>
          <NButton size="large" @click="$router.push('/dashboard')"> 查看仪表板 </NButton>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton } from 'naive-ui'

// 响应式引用
const featuresRef = ref<HTMLElement>()

// 浮动卡片数据
const floatingCards = ref([
  { icon: '🎵', title: '音频转录' },
  { icon: '🎬', title: '视频处理' },
  { icon: '🤖', title: 'AI分析' },
  { icon: '📊', title: '数据导出' },
])

// 功能特色数据
const features = ref([
  {
    icon: '🎤',
    title: '智能转录',
    description: '高精度语音识别，支持多语言和说话人分离',
    tags: ['多语言', '说话人识别', '高精度'],
  },
  {
    icon: '🧠',
    title: 'AI分析',
    description: '智能总结、思维导图、内容评估等AI功能',
    tags: ['智能总结', '思维导图', '内容分析'],
  },
  {
    icon: '💬',
    title: 'AI对话',
    description: '基于转录内容的智能问答和深度分析',
    tags: ['智能问答', '上下文理解', '深度分析'],
  },
  {
    icon: '📤',
    title: '多格式导出',
    description: '支持VTT、SRT、TXT、JSON等多种格式导出',
    tags: ['多格式', '批量导出', '自定义配置'],
  },
  {
    icon: '📥',
    title: '视频下载',
    description: '支持YouTube、Bilibili等平台的在线视频下载',
    tags: ['多平台', '高质量', '批量下载'],
  },
  {
    icon: '🎨',
    title: '现代界面',
    description: '美观的用户界面，支持深色模式和响应式设计',
    tags: ['现代设计', '深色模式', '响应式'],
  },
])

// 工作流程步骤
const workflowSteps = ref([
  {
    icon: '📁',
    title: '上传文件',
    description: '支持拖拽上传或在线视频下载',
  },
  {
    icon: '⚙️',
    title: '配置参数',
    description: '选择语言、模型和处理选项',
  },
  {
    icon: '🚀',
    title: '获得结果',
    description: '获取转录文本和AI分析结果',
  },
])

// 统计数据
const stats = ref([
  { value: '99%+', label: '转录准确率' },
  { value: '50+', label: '支持语言' },
  { value: '10+', label: '导出格式' },
  { value: '24/7', label: '在线服务' },
])

// 方法
const scrollToFeatures = () => {
  featuresRef.value?.scrollIntoView({ behavior: 'smooth' })
}

// 生命周期
onMounted(() => {
  // 添加页面加载动画
  document.body.classList.add('page-loaded')
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  overflow-x: hidden;
}

/* 英雄区域 */
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-8) var(--spacing-6);
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(139, 92, 246, 0.1) 50%,
    rgba(16, 185, 129, 0.1) 100%
  );
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 50%);
  pointer-events: none;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-12);
  max-width: 1200px;
  width: 100%;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.1;
  margin: 0;
  font-family: var(--font-display);
}

.hero-subtitle {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-neutral-700);
  background: linear-gradient(135deg, var(--color-primary-nebula), var(--color-primary-aurora));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme='dark'] .hero-subtitle {
  color: var(--color-neutral-300);
}

.hero-description {
  font-size: 1.25rem;
  line-height: 1.6;
  color: var(--color-neutral-600);
  margin: 0;
  max-width: 500px;
}

[data-theme='dark'] .hero-description {
  color: var(--color-neutral-400);
}

.hero-actions {
  display: flex;
  gap: var(--spacing-4);
  align-items: center;
}

.cta-button {
  background: linear-gradient(
    135deg,
    var(--color-primary-nebula),
    var(--color-primary-aurora)
  ) !important;
  border: none !important;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3) !important;
  transition: all var(--duration-normal) var(--easing-ease-out) !important;
}

.cta-button:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.4) !important;
}

.demo-button {
  background: rgba(255, 255, 255, 0.1) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  transition: all var(--duration-normal) var(--easing-ease-out) !important;
}

.demo-button:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  transform: translateY(-1px) !important;
}

/* 英雄视觉效果 */
.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

.floating-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-4);
  animation: float 6s ease-in-out infinite;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-xl);
  padding: var(--spacing-6);
  text-align: center;
  transition: all var(--duration-normal) var(--easing-ease-out);
  animation: cardFloat 4s ease-in-out infinite;
}

.feature-card:nth-child(2) {
  animation-delay: -1s;
}
.feature-card:nth-child(3) {
  animation-delay: -2s;
}
.feature-card:nth-child(4) {
  animation-delay: -3s;
}

.feature-card:hover {
  transform: translateY(-5px) scale(1.05);
  background: rgba(255, 255, 255, 0.15);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-2);
}

.card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-neutral-800);
}

[data-theme='dark'] .card-title {
  color: var(--color-neutral-200);
}

/* 功能特色区域 */
.features-section {
  padding: var(--spacing-16) var(--spacing-6);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
}

[data-theme='dark'] .features-section {
  background: rgba(0, 0, 0, 0.3);
}

.section-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-4);
  color: var(--color-neutral-800);
  font-family: var(--font-display);
}

[data-theme='dark'] .section-title {
  color: var(--color-neutral-200);
}

.section-description {
  font-size: 1.125rem;
  color: var(--color-neutral-600);
  line-height: 1.6;
  margin: 0;
}

[data-theme='dark'] .section-description {
  color: var(--color-neutral-400);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: var(--spacing-6);
  max-width: 1200px;
  margin: 0 auto;
}

.feature-item {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  padding: var(--spacing-8);
  text-align: center;
  transition: all var(--duration-normal) var(--easing-ease-out);
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
  transform: translateY(30px);
}

[data-theme='dark'] .feature-item {
  background: rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
}

.feature-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border-color: rgba(99, 102, 241, 0.3);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-4);
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-3);
  color: var(--color-neutral-800);
}

[data-theme='dark'] .feature-title {
  color: var(--color-neutral-200);
}

.feature-description {
  font-size: 1rem;
  color: var(--color-neutral-600);
  line-height: 1.6;
  margin-bottom: var(--spacing-4);
}

[data-theme='dark'] .feature-description {
  color: var(--color-neutral-400);
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  justify-content: center;
}

.feature-tag {
  padding: var(--spacing-1) var(--spacing-3);
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary-nebula);
}

/* 动画定义 */
@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

@keyframes cardFloat {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(1deg);
  }
  75% {
    transform: translateY(-5px) rotate(-1deg);
  }
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: var(--spacing-8);
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.5rem;
  }

  .hero-actions {
    justify-content: center;
    flex-direction: column;
    align-items: center;
  }

  .floating-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-3);
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-4);
  }

  .feature-item {
    padding: var(--spacing-6);
  }
}

/* 工作流程区域 */
.workflow-section {
  padding: var(--spacing-16) var(--spacing-6);
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.05) 0%,
    rgba(139, 92, 246, 0.05) 50%,
    rgba(16, 185, 129, 0.05) 100%
  );
}

.workflow-steps {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--spacing-8);
  max-width: 1000px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.workflow-step {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  flex: 1;
  min-width: 250px;
}

.step-number {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-nebula), var(--color-primary-aurora));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
}

.step-content {
  flex: 1;
}

.step-icon {
  font-size: 2rem;
  margin-bottom: var(--spacing-2);
}

.step-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: var(--spacing-2);
  color: var(--color-neutral-800);
}

[data-theme='dark'] .step-title {
  color: var(--color-neutral-200);
}

.step-description {
  font-size: 1rem;
  color: var(--color-neutral-600);
  line-height: 1.5;
  margin: 0;
}

[data-theme='dark'] .step-description {
  color: var(--color-neutral-400);
}

.step-arrow {
  font-size: 2rem;
  color: var(--color-primary-aurora);
  margin: 0 var(--spacing-4);
  animation: pulse 2s ease-in-out infinite;
}

/* 统计数据区域 */
.stats-section {
  padding: var(--spacing-12) var(--spacing-6);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
}

[data-theme='dark'] .stats-section {
  background: rgba(0, 0, 0, 0.4);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-6);
  max-width: 800px;
  margin: 0 auto;
}

.stat-item {
  text-align: center;
  padding: var(--spacing-6);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-xl);
  transition: all var(--duration-normal) var(--easing-ease-out);
}

[data-theme='dark'] .stat-item {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
}

.stat-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-nebula), var(--color-primary-aurora));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: var(--spacing-2);
  font-family: var(--font-display);
}

.stat-label {
  font-size: 1rem;
  color: var(--color-neutral-600);
  font-weight: 500;
}

[data-theme='dark'] .stat-label {
  color: var(--color-neutral-400);
}

/* CTA区域 */
.cta-section {
  padding: var(--spacing-16) var(--spacing-6);
  background: linear-gradient(
    135deg,
    rgba(99, 102, 241, 0.1) 0%,
    rgba(139, 92, 246, 0.1) 50%,
    rgba(16, 185, 129, 0.1) 100%
  );
  text-align: center;
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
}

.cta-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: var(--spacing-4);
  color: var(--color-neutral-800);
  font-family: var(--font-display);
}

[data-theme='dark'] .cta-title {
  color: var(--color-neutral-200);
}

.cta-description {
  font-size: 1.125rem;
  color: var(--color-neutral-600);
  line-height: 1.6;
  margin-bottom: var(--spacing-8);
}

[data-theme='dark'] .cta-description {
  color: var(--color-neutral-400);
}

.cta-actions {
  display: flex;
  gap: var(--spacing-4);
  justify-content: center;
  align-items: center;
}

/* 额外动画 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* 移动端工作流程适配 */
@media (max-width: 768px) {
  .workflow-steps {
    flex-direction: column;
    gap: var(--spacing-6);
  }

  .workflow-step {
    flex-direction: column;
    text-align: center;
    min-width: auto;
  }

  .step-arrow {
    transform: rotate(90deg);
    margin: var(--spacing-2) 0;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-4);
  }

  .cta-title {
    font-size: 2rem;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 2rem;
  }
}
</style>
