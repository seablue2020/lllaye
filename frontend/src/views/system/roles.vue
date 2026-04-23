<template>
  <div class="system-page page-container">
    <div class="page-header">
      <h2 class="page-title">角色权限</h2>
      <el-button type="primary" @click="showAddDialog = true"><el-icon><Plus /></el-icon>新增角色</el-button>
    </div>

    <el-table :data="roles" v-loading="loading" stripe>
      <el-table-column prop="name" label="角色名称" width="140" />
      <el-table-column prop="code" label="角色编码" width="140" />
      <el-table-column prop="description" label="描述" min-width="200" />
      <el-table-column label="用户数" width="80" align="center">
        <template #default="{ row }">{{ row._count?.users || 0 }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === 'active' ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click="handleEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showAddDialog" :title="editingRole ? '编辑角色' : '新增角色'" width="600px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="角色名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="角色编码"><el-input v-model="form.code" :disabled="!!editingRole" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="权限配置">
          <div style="columns: 2; gap: 8px">
            <el-checkbox v-for="perm in permissionList" :key="perm" :value="perm">{{ perm }}</el-checkbox>
          </div>
        </el-form-item>
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
const roles = ref<any[]>([])
const showAddDialog = ref(false)
const editingRole = ref<any>(null)
const permissionList = ['clue:*', 'case:*', 'document:*', 'review:*', 'batch:*', 'audit:read']
const form = reactive({ name: '', code: '', description: '', permissions: [] as string[] })

async function loadData() {
  loading.value = true
  try { roles.value = await systemApi.getRoles() }
  catch (e) { console.error(e) }
  finally { loading.value = false }
}

function handleEdit(row: any) {
  editingRole.value = row
  Object.assign(form, { name: row.name, code: row.code, description: row.description, permissions: row.permissions || [] })
  showAddDialog.value = true
}

async function handleSubmit() {
  try {
    if (editingRole.value) await systemApi.updateRole(editingRole.value.id, form)
    else await systemApi.createRole(form)
    ElMessage.success('保存成功')
    showAddDialog.value = false
    editingRole.value = null
    loadData()
  } catch (e) { ElMessage.error('保存失败') }
}

onMounted(() => { loadData() })
</script>

<style scoped>
.system-page { background: var(--color-bg-page); }
</style>
