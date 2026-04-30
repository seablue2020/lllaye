<template>
  <div class="document-page page-container">
    <div class="page-header">
      <h2 class="page-title">文书管理</h2>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="文书列表" name="list">
        <el-table :data="documents" v-loading="loading" stripe>
          <el-table-column prop="docNo" label="文书编号" width="160" />
          <el-table-column prop="title" label="文书标题" min-width="200" />
          <el-table-column prop="docType" label="文书类型" width="140">
            <template #default="{ row }">{{ getDocTypeLabel(row.docType) }}</template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="getStatusTag(row.status)">{{ getStatusLabel(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="currentLevel" label="审批层级" width="80" align="center">
            <template #default="{ row }">{{ row.currentLevel || 0 }}级</template>
          </el-table-column>
          <el-table-column prop="createdByName" label="创建人" width="100" />
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">{{ dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" text @click="handleEdit(row)">编辑</el-button>
              <el-button type="success" size="small" text @click="handlePreview(row)">预览</el-button>
              <el-button v-if="row.status === 'draft'" type="warning" size="small" text @click="handleSubmit(row)">提交</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="模板库" name="templates">
        <el-row :gutter="16">
          <el-col v-for="tpl in templates" :key="tpl.id" :span="6">
            <div class="template-card" @click="handleUseTemplate(tpl)">
              <div class="tpl-icon"><el-icon :size="32"><Document /></el-icon></div>
              <div class="tpl-name">{{ tpl.name }}</div>
              <div class="tpl-meta">{{ tpl.category }}</div>
              <el-tag size="small" type="info">{{ tpl.docType }}</el-tag>
            </div>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { documentApi } from '@/api'
import { ElMessage } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('list')
const documents = ref<any[]>([])
const templates = ref<any[]>([])

const docTypeMap: Record<string, string> = {
  support_letter: '支持起诉意见书', inquiry_record: '询问笔录', evidence_list: '证据目录',
  service_receipt: '送达回证', case_report: '案件审结报告',
}

const statusMap: Record<string, string> = {
  draft: '草稿', submitted: '审核中', approved: '已生效', rejected: '退回', archived: '已归档',
}

function getDocTypeLabel(type: string) { return docTypeMap[type] || type }
function getStatusLabel(status: string) { return statusMap[status] || status }
function getStatusTag(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'submitted') return 'primary'
  if (status === 'rejected') return 'danger'
  return 'info'
}

function handleEdit(row: any) { router.push(`/document/${row.id}`) }
function handlePreview(row: any) { router.push(`/document/${row.id}`) }

async function handleSubmit(row: any) {
  try {
    await documentApi.submit(row.id)
    ElMessage.success('已提交审核')
    loadData()
  } catch (e) {
    ElMessage.error('提交失败')
  }
}

function handleUseTemplate(tpl: any) {
  ElMessage.info(`请在案件审查页面选择案件后生成文书：${tpl.name || tpl.code}`)
}

async function loadData() {
  loading.value = true
  try {
    const [docRes, tplRes] = await Promise.all([
      documentApi.list(),
      documentApi.getTemplates(),
    ])
    documents.value = docRes
    templates.value = tplRes
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.document-page { background: var(--color-bg-page); }

.template-card {
  background: #fff;
  border-radius: var(--radius-md);
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}

.template-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.tpl-icon {
  background: var(--color-primary-bg);
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  color: var(--color-primary);
}

.tpl-name { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.tpl-meta { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; }
</style>
