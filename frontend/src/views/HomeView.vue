<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { get } from '@/utils/request'

const message = ref('Welcome to Challenge Project')

onMounted(async () => {
  try {
    await get('/health')
  } catch (error) {
    console.error('API connection failed:', error)
  }
})
</script>

<template>
  <div class="home">
    <h1>{{ message }}</h1>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

h1 {
  color: white;
  font-size: 2rem;
  font-weight: 600;
}
</style>
