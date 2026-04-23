<template>
  <div class="batch-page page-container">
    <div class="page-header">
      <h2 class="page-title">批量办案</h2>
    </div>

    <el-table :data="aggregates" v-loading="loading" stripe>
      <el-table-column prop="aggregateNo" label="合集编号" width="180" />
      <el-table-column prop="name" label="合集名称" min-width="200" />
      <el-table-column prop="aggregateType" label="聚合类型" width="100">
        <template #default="{ row }">{{ getTypeLabel(row.aggregateType) }}</template>
      </el-table-column>
      <el-table-column prop="clueCount" label="线索数" width="80" align="center" />
      <el-table-column label="涉案金额" width="120" align="right">
        <template #default="{ row }">¥{{ Number(row.totalAmount || 0).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column prop="totalPersonCount" label="涉及人数" width="80" align="center" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'closed' ? 'info' : 'success'">
            {{ row.status === 'closed' ? '已关闭' : '进行中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdByName" label="创建人" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="160">
        <template #default="{ row }">{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click="handleEnter(row)">进入批量办理</el-button>
          <el-button type="warning" size="small" text @click="handleSplit(row)">拆分</el-button>
          <el-button type="info" size="small" text @click="handleClose(row)">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { batchApi } from '@/api'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const loading = ref(false)
const aggregates = ref<any[]>([])

const typeMap: Record<string, string> = {
  project: '同工地', subject: '同企业', contractor: '同包工头', area: '同区域',
}

function getTypeLabel(type: string) { return typeMap[type] || type }

function handleEnter(row: any) { ElMessage.info('进入批量办理') }
function handleSplit(row: any) { ElMessage.info('拆分合集') }
function handleClose(row: any) { ElMessage.info('关闭合集') }

async function loadData() {
  loading.value = true
  try {
    aggregates.value = await batchApi.getAggregates()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.batch-page { background: var(--color-bg-page); }
</style>
