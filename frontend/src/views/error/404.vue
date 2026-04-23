<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">404</div>
      <div class="error-title">页面不存在</div>
      <div class="error-desc">您访问的页面不存在或已被删除</div>
      <el-button type="primary" @click="router.push('/dashboard')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-page);
}
.error-content { text-align: center; }
.error-code { font-size: 80px; font-weight: 800; color: var(--color-text-muted); line-height: 1; }
.error-title { font-size: 24px; font-weight: 600; margin: 16px 0 8px; }
.error-desc { color: var(--color-text-muted); margin-bottom: 24px; }
</style>
