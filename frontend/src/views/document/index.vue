<template>
  <div class="document-page page-container">
    <div class="page-header">
      <h2 class="page-title">文书管理</h2>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="文书列表" name="list">
        <div v-loading="loading" class="case-document-list">
          <el-collapse v-if="caseGroups.length" v-model="activeCases">
            <el-collapse-item v-for="group in caseGroups" :key="group.case.id" :name="group.case.id">
              <template #title>
                <div class="case-title">
                  <span class="case-no">{{ group.case.caseNo }}</span>
                  <span class="case-name">{{ group.case.title }}</span>
                  <el-tag size="small" type="info">{{ group.documents.length }} 份文书</el-tag>
                </div>
              </template>
              <el-table :data="group.documents" stripe @row-click="handlePreview">
                <el-table-column prop="docNo" label="文书编号" width="170" />
                <el-table-column prop="title" label="文书标题" min-width="220" show-overflow-tooltip />
                <el-table-column prop="docType" label="文书类型" width="140">
                  <template #default="{ row }">{{ getDocTypeLabel(row.docType) }}</template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="{ row }">
                    <el-tag size="small" :type="getStatusTag(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="currentLevel" label="审批层级" width="90" align="center">
                  <template #default="{ row }">{{ row.currentLevel || 0 }}级</template>
                </el-table-column>
                <el-table-column prop="createdByName" label="创建人" width="110" />
                <el-table-column prop="createdAt" label="创建时间" width="170">
                  <template #default="{ row }">{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
                </el-table-column>
                <el-table-column label="操作" width="190" fixed="right">
                  <template #default="{ row }">
                    <el-button type="success" size="small" text @click.stop="handlePreview(row)">预览</el-button>
                    <el-button type="primary" size="small" text @click.stop="handleEdit(row)">编辑</el-button>
                    <el-button
                      v-if="row.status === 'draft'"
                      type="warning"
                      size="small"
                      text
                      @click.stop="handleSubmit(row)"
                    >
                      提交
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-collapse-item>
          </el-collapse>
          <div v-else class="empty-state">暂无文书</div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="模板库" name="templates">
        <div v-loading="loading">
          <div v-for="category in templateCategories" :key="category" class="template-section">
            <div class="section-title">{{ category }}</div>
            <el-row :gutter="16">
              <el-col v-for="tpl in groupedTemplates[category]" :key="tpl.id" :span="6">
                <div class="template-card" @click="handleUseTemplate(tpl)">
                  <div class="tpl-icon"><el-icon :size="32"><Document /></el-icon></div>
                  <div class="tpl-name">{{ tpl.name }}</div>
                  <div class="tpl-meta">{{ tpl.originalFileName || tpl.code }}</div>
                  <el-tag size="small" type="info">{{ getDocTypeLabel(tpl.docType) }}</el-tag>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="previewVisible" title="文书预览" width="860px" class="document-preview-dialog">
      <div v-loading="previewLoading">
        <template v-if="previewDoc">
          <div class="preview-header">
            <div>
              <div class="preview-title">{{ previewDoc.title }}</div>
              <div class="preview-subtitle">
                {{ previewDoc.docNo }} · {{ getDocTypeLabel(previewDoc.docType) }} · {{ getStatusLabel(previewDoc.status) }}
              </div>
            </div>
            <el-tag :type="getStatusTag(previewDoc.status)">{{ getStatusLabel(previewDoc.status) }}</el-tag>
          </div>

          <el-descriptions :column="3" border size="small" class="preview-meta">
            <el-descriptions-item label="案件编号">{{ previewDoc.case?.caseNo || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建人">{{ previewDoc.createdByName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="版本">v{{ previewDoc.version || 1 }}</el-descriptions-item>
            <el-descriptions-item label="申请人">{{ previewDoc.case?.applicantName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="被申请人">{{ previewDoc.case?.respondentName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ previewDoc.createdAt ? dayjs(previewDoc.createdAt).format('YYYY-MM-DD HH:mm') : '-' }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="preview-content">{{ previewDoc.content || '暂无文书内容' }}</div>
        </template>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button v-if="previewDoc" type="primary" @click="openPreviewDocForEdit">进入编辑</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { documentApi } from '@/api'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const previewLoading = ref(false)
const previewVisible = ref(false)
const activeTab = ref('list')
const activeCases = ref<string[]>([])
const caseGroups = ref<any[]>([])
const templates = ref<any[]>([])
const previewDoc = ref<any>(null)

const docTypeMap: Record<string, string> = {
  support_prosecution: '支持起诉书',
  civil_complaint: '民事起诉状',
  civil_judgment: '民事判决书',
  support_letter: '支持起诉意见书',
  inquiry_record: '询问笔录',
  evidence_list: '证据目录',
  service_receipt: '送达回证',
  case_report: '案件审结报告',
}

const statusMap: Record<string, string> = {
  draft: '草稿',
  submitted: '审核中',
  approved: '已生效',
  rejected: '退回',
  archived: '已归档',
}

const groupedTemplates = computed<Record<string, any[]>>(() => {
  return templates.value.reduce((groups, tpl) => {
    const category = tpl.category || '其他'
    if (!groups[category]) groups[category] = []
    groups[category].push(tpl)
    return groups
  }, {} as Record<string, any[]>)
})

const templateCategories = computed(() => Object.keys(groupedTemplates.value))

function getDocTypeLabel(type: string) {
  return docTypeMap[type] || type
}

function getStatusLabel(status: string) {
  return statusMap[status] || status
}

function getStatusTag(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'submitted') return 'primary'
  if (status === 'rejected') return 'danger'
  return 'info'
}

function handleEdit(row: any) {
  router.push(`/document/${row.id}`)
}

async function handlePreview(row: any) {
  previewVisible.value = true
  previewLoading.value = true
  previewDoc.value = null
  try {
    previewDoc.value = await documentApi.getById(row.id)
  } catch (error) {
    console.error(error)
    ElMessage.error('预览加载失败')
    previewVisible.value = false
  } finally {
    previewLoading.value = false
  }
}

function openPreviewDocForEdit() {
  if (!previewDoc.value) return
  previewVisible.value = false
  router.push(`/document/${previewDoc.value.id}`)
}

async function handleSubmit(row: any) {
  try {
    await documentApi.submit(row.id)
    ElMessage.success('已提交审核')
    loadData()
  } catch (error) {
    console.error(error)
    ElMessage.error('提交失败')
  }
}

function handleUseTemplate(tpl: any) {
  ElMessage.info(`请在案件 AI 审查页面选择案件后生成：${tpl.name || tpl.code}`)
}

async function loadData() {
  loading.value = true
  try {
    const [groupRes, tplRes] = await Promise.all([
      documentApi.groupedByCase(),
      documentApi.getTemplates(),
    ])
    caseGroups.value = groupRes
    templates.value = tplRes
    activeCases.value = groupRes.slice(0, 3).map((item: any) => item.case.id)
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.document-page {
  background: var(--color-bg-page);
}

.page-header {
  margin-bottom: 16px;
}

.case-document-list {
  min-height: 240px;
}

.case-document-list :deep(.el-table__row) {
  cursor: pointer;
}

.case-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.case-no {
  font-weight: 600;
  color: var(--color-primary);
}

.case-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 560px;
}

.template-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 12px 0;
}

.template-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
  min-height: 170px;
}

.template-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.tpl-icon {
  background: var(--color-primary-bg);
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  color: var(--color-primary);
}

.tpl-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  line-height: 1.4;
}

.tpl-meta {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 10px;
  line-height: 1.4;
  word-break: break-all;
}

.preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.preview-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.preview-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted);
}

.preview-meta {
  margin-bottom: 14px;
}

.preview-content {
  max-height: 56vh;
  overflow: auto;
  background: #fff;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: 24px 32px;
  white-space: pre-wrap;
  line-height: 2;
  font-family: 'Times New Roman', 'SimSun', serif;
  font-size: 15px;
  color: var(--color-text-primary);
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: var(--color-text-muted);
}
</style>
