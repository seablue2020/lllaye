<template>
  <div class="review-page page-container">
    <div class="page-header">
      <h2 class="page-title">AI辅助审查</h2>
    </div>

    <el-table :data="cases" v-loading="loading" stripe @row-click="handleRowClick" row-class-name="clickable-row">
      <el-table-column prop="caseNo" label="案件编号" width="160" />
      <el-table-column prop="title" label="案件标题" min-width="200" />
      <el-table-column prop="applicantName" label="申请人" width="100" />
      <el-table-column prop="respondentName" label="被申请人" width="120" />
      <el-table-column label="涉案金额" width="120" align="right">
        <template #default="{ row }">¥{{ Number(row.amount || 0).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column prop="personCount" label="人数" width="70" align="center" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="getStatusTag(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="审查状态" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.reviewConclusion === 'accepted'" type="success" size="small">已受理</el-tag>
          <el-tag v-else-if="row.reviewConclusion === 'rejected'" type="danger" size="small">不予受理</el-tag>
          <el-tag v-else type="info" size="small">待审查</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click.stop="router.push(`/review/${row.id}`)">审查</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/utils/request'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const cases = ref<any[]>([])

const statusMap: Record<string, string> = {
  pending: '待处理', under_review: '审查中', investigating: '调查中',
  document_review: '文书审核', approved: '已审批', closed: '已办结', rejected: '不予受理',
}

function getStatusLabel(status: string) { return statusMap[status] || status }
function getStatusTag(status: string) {
  if (status === 'under_review') return 'primary'
  if (status === 'closed') return 'success'
  if (status === 'rejected') return 'danger'
  return 'info'
}

function handleRowClick(row: any) {
  router.push(`/review/${row.id}`)
}

async function loadData() {
  loading.value = true
  try {
    const res: any = await request.get('/case/list')
    cases.value = res.list || []
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.review-page { background: var(--color-bg-page); }
:deep(.clickable-row) { cursor: pointer; }
</style>
