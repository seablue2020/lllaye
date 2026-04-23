<template>
  <div class="system-page page-container">
    <div class="page-header">
      <h2 class="page-title">字典配置</h2>
      <el-button type="primary" @click="showAddDialog = true"><el-icon><Plus /></el-icon>新增字典</el-button>
    </div>

    <el-table :data="dictionaries" v-loading="loading" stripe>
      <el-table-column prop="type" label="字典类型" width="150" />
      <el-table-column prop="code" label="字典编码" width="150" />
      <el-table-column prop="label" label="字典标签" width="150" />
      <el-table-column prop="value" label="字典值" min-width="150" />
      <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
      <el-table-column prop="remark" label="备注" min-width="150" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click="handleEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showAddDialog" :title="editingDict ? '编辑字典' : '新增字典'" width="500px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="字典类型"><el-input v-model="form.type" :disabled="!!editingDict" /></el-form-item>
        <el-form-item label="字典编码"><el-input v-model="form.code" :disabled="!!editingDict" /></el-form-item>
        <el-form-item label="字典标签"><el-input v-model="form.label" /></el-form-item>
        <el-form-item label="字典值"><el-input v-model="form.value" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { systemApi } from '@/api'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const loading = ref(false)
const dictionaries = ref<any[]>([])
const showAddDialog = ref(false)
const editingDict = ref<any>(null)
const form = reactive({ type: '', code: '', label: '', value: '', sortOrder: 0, remark: '' })

async function loadData() {
  loading.value = true
  try { dictionaries.value = await systemApi.getDictionaries() }
  catch (e) { console.error(e) }
  finally { loading.value = false }
}

function handleEdit(row: any) {
  editingDict.value = row
  Object.assign(form, row)
  showAddDialog.value = true
}

async function handleSubmit() {
  try {
    if (editingDict.value) await systemApi.updateDictionary(editingDict.value.id, form)
    else await systemApi.createDictionary(form)
    ElMessage.success('保存成功')
    showAddDialog.value = false
    editingDict.value = null
    loadData()
  } catch (e) { ElMessage.error('保存失败') }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.system-page { background: var(--color-bg-page); }
</style>
