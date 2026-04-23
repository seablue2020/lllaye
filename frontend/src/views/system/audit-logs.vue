<template>
  <div class="system-page page-container">
    <div class="page-header">
      <h2 class="page-title">审计日志</h2>
    </div>

    <el-table :data="logs" v-loading="loading" stripe>
      <el-table-column prop="userId" label="用户ID" width="180" />
      <el-table-column prop="action" label="操作" width="80" />
      <el-table-column prop="module" label="模块" width="120" />
      <el-table-column prop="bizId" label="业务ID" width="180" />
      <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
      <el-table-column prop="ip" label="IP地址" width="140" />
      <el-table-column prop="timestamp" label="时间" width="170">
        <template #default="{ row }">{{ dayjs(row.timestamp).format('YYYY-MM-DD HH:mm:ss') }}</template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="loadData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { systemApi } from '@/api'
import dayjs from 'dayjs'

const loading = ref(false)
const logs = ref<any[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

async function loadData() {
  loading.value = true
  try {
    const res: any = await systemApi.getAuditLogs({ page: pagination.page, pageSize: pagination.pageSize })
    logs.value = res.list
    pagination.total = res.total
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.system-page { background: var(--color-bg-page); }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
