<template>
  <div class="review-page page-container">
    <div class="page-header">
      <h2 class="page-title">AI辅助审查</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>新建案件
        </el-button>
      </div>
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
      <el-table-column label="AI审查" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.reviewedAt || row.aiReviewResult" type="success" size="small">已完成</el-tag>
          <el-tag v-else type="warning" size="small">待审查</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click.stop="router.push(`/review/${row.id}`)">审查</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建案件对话框 -->
    <el-dialog v-model="showCreateDialog" title="新建案件" width="580px" destroy-on-close>
      <el-form :model="createForm" label-width="100px">
        <el-form-item label="申请人" required>
          <el-input v-model="createForm.applicantName" placeholder="请输入申请人姓名" />
        </el-form-item>
        <el-form-item label="身份证号" required>
          <el-input v-model="createForm.applicantIdNo" placeholder="请输入身份证号码" />
        </el-form-item>
        <el-form-item label="联系电话" required>
          <el-input v-model="createForm.applicantPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="被申请人" required>
          <el-input v-model="createForm.respondentName" placeholder="请输入被申请人名称" />
        </el-form-item>
        <el-form-item label="被申请人单位">
          <el-input v-model="createForm.respondentOrg" placeholder="请输入被申请人单位（选填）" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="createForm.respondentContact" placeholder="被申请人联系方式（选填）" />
        </el-form-item>
        <el-form-item label="涉案金额">
          <el-input-number v-model="createForm.amount" :min="0" :precision="2" placeholder="请输入涉案金额" style="width: 100%" />
        </el-form-item>
        <el-form-item label="涉及人数">
          <el-input-number v-model="createForm.personCount" :min="1" :max="99999" placeholder="请输入涉及人数" style="width: 100%" />
        </el-form-item>
        <el-form-item label="案件标题">
          <el-input v-model="createForm.title" placeholder="不填则自动生成" />
        </el-form-item>
        <el-form-item label="案件描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" placeholder="请输入案件描述或诉求内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreate">创建并审查</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { caseApi } from '@/api'

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const showCreateDialog = ref(false)
const cases = ref<any[]>([])

const createForm = ref({
  applicantName: '',
  applicantIdNo: '',
  applicantPhone: '',
  respondentName: '',
  respondentOrg: '',
  respondentContact: '',
  amount: 0,
  personCount: 1,
  title: '',
  description: '',
})

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
    const res: any = await caseApi.list()
    cases.value = res.list || []
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  if (!createForm.value.applicantName || !createForm.value.applicantIdNo || !createForm.value.applicantPhone || !createForm.value.respondentName) {
    ElMessage.warning('请填写必填项')
    return
  }
  creating.value = true
  try {
    const created: any = await caseApi.create(createForm.value)
    ElMessage.success('案件创建成功')
    showCreateDialog.value = false
    createForm.value = { applicantName: '', applicantIdNo: '', applicantPhone: '', respondentName: '', respondentOrg: '', respondentContact: '', amount: 0, personCount: 1, title: '', description: '' }
    await loadData()
    router.push(`/review/${created.id}`)
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.review-page { background: var(--color-bg-page); }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.header-actions { display: flex; gap: 8px; }
:deep(.clickable-row) { cursor: pointer; }
</style>
