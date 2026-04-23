<template>
  <div class="doc-edit-page page-container" v-loading="loading">
    <div class="page-header">
      <div>
        <el-button text @click="router.push('/document')"><el-icon><ArrowLeft /></el-icon>返回</el-button>
        <span class="page-title">{{ doc?.title || '文书编辑' }}</span>
        <el-tag size="small" :type="getStatusTag(doc?.status)">{{ getStatusLabel(doc?.status) }}</el-tag>
      </div>
      <div class="btn-group">
        <el-button @click="handleSave">保存</el-button>
        <el-button v-if="doc?.status === 'draft'" type="warning" @click="handleSubmit">提交审核</el-button>
        <el-button v-if="doc?.status === 'submitted'" type="success" @click="handleApprove">审批通过</el-button>
        <el-button v-if="doc?.status === 'submitted'" type="danger" @click="handleReject">退回</el-button>
      </div>
    </div>

    <div class="editor-area card">
      <el-input
        v-model="content"
        type="textarea"
        :rows="20"
        placeholder="请输入文书内容"
        style="font-family: 'Times New Roman', serif; font-size: 15px; line-height: 2"
      />
    </div>

    <div class="meta-info">
      <span>文书编号：{{ doc?.docNo }}</span>
      <span>版本：v{{ doc?.version || 1 }}</span>
      <span>创建人：{{ doc?.createdByName }}</span>
      <span>创建时间：{{ dayjs(doc?.createdAt).format('YYYY-MM-DD HH:mm') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { documentApi } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const doc = ref<any>(null)
const content = ref('')

const statusMap: Record<string, string> = {
  draft: '草稿', submitted: '审核中', approved: '已生效', rejected: '退回', archived: '已归档',
}

function getStatusLabel(status: string) { return statusMap[status] || status }
function getStatusTag(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'submitted') return 'primary'
  if (status === 'rejected') return 'danger'
  return 'info'
}

async function loadData() {
  loading.value = true
  try {
    doc.value = await documentApi.getById(route.params.id as string)
    content.value = doc.value.content
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  try {
    await documentApi.update(route.params.id as string, content.value)
    ElMessage.success('保存成功')
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

async function handleSubmit() {
  await handleSave()
  try {
    await documentApi.submit(route.params.id as string)
    ElMessage.success('已提交审核')
    loadData()
  } catch (e) {
    ElMessage.error('提交失败')
  }
}

async function handleApprove() {
  await ElMessageBox.prompt('请填写审批意见', '审批通过', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  }).then(async ({ value }) => {
    try {
      await documentApi.approve(route.params.id as string, value || '同意')
      ElMessage.success('审批通过')
      loadData()
    } catch (e) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

async function handleReject() {
  await ElMessageBox.prompt('请填写退回意见', '退回修改', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
  }).then(async ({ value }) => {
    try {
      await documentApi.reject(route.params.id as string, value || '不符合要求')
      ElMessage.success('已退回')
      loadData()
    } catch (e) {
      ElMessage.error('操作失败')
    }
  }).catch(() => {})
}

onMounted(() => { loadData() })
</script>

<style scoped>
.doc-edit-page { background: var(--color-bg-page); }

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title { font-size: 18px; font-weight: 600; margin: 0 12px; }

.editor-area { margin-bottom: 12px; }

.meta-info {
  display: flex;
  gap: 24px;
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
