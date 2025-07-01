<!--
  AI功能页面
  整合所有AI功能组件，提供统一的AI功能入口
-->
<template>
  <div class="ai-features-page">
    <AIFeatures />
  </div>
</template>

<script setup lang="ts">
import { AIFeatures } from '@/components/ai'
</script>

<style scoped>
.ai-features-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-6);
}

@media (max-width: 768px) {
  .ai-features-page {
    padding: var(--spacing-4);
  }
}
</style>
