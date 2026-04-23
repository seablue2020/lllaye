<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">403</div>
      <div class="error-title">无权限访问</div>
      <div class="error-desc">您没有访问该页面的权限，请联系管理员</div>
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
.error-code { font-size: 80px; font-weight: 800; color: var(--color-risk-high); line-height: 1; }
.error-title { font-size: 24px; font-weight: 600; margin: 16px 0 8px; }
.error-desc { color: var(--color-text-muted); margin-bottom: 24px; }
</style>
