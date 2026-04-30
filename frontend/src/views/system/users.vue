<template>
  <div class="system-page page-container">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <el-button type="primary" @click="showAddDialog = true"><el-icon><Plus /></el-icon>新增用户</el-button>
    </div>

    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" width="140" />
      <el-table-column prop="realName" label="姓名" width="120" />
      <el-table-column prop="role" label="角色" width="140">
        <template #default="{ row }">{{ row.role?.name }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column prop="org" label="机构" min-width="180">
        <template #default="{ row }">{{ row.org?.name || '—' }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="row.status === 'active' ? 'success' : 'info'">
            {{ row.status === 'active' ? '正常' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="lastLoginAt" label="最后登录" width="160">
        <template #default="{ row }">{{ row.lastLoginAt ? dayjs(row.lastLoginAt).format('YYYY-MM-DD HH:mm') : '—' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" size="small" text @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="loadData"
      />
    </div>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showAddDialog" :title="editingUser ? '编辑用户' : '新增用户'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="!!editingUser" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="密码" v-if="!editingUser"><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleId" placeholder="请选择角色">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="电话"><el-input v-model="form.phone" /></el-form-item>
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
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const loading = ref(false)
const users = ref<any[]>([])
const roles = ref<any[]>([])
const showAddDialog = ref(false)
const editingUser = ref<any>(null)

const pagination = reactive({ page: 1, pageSize: 20, total: 0 })
const form = reactive({ username: '', realName: '', password: '', phone: '', roleId: '' })

async function loadData() {
  loading.value = true
  try {
    const res: any = await systemApi.getUsers({ page: pagination.page, pageSize: pagination.pageSize })
    users.value = res.list
    pagination.total = res.total
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function handleEdit(row: any) {
  editingUser.value = row
  Object.assign(form, { username: row.username, realName: row.realName, password: '', phone: row.phone, roleId: row.role?.id })
  showAddDialog.value = true
}

async function handleSubmit() {
  try {
    if (editingUser.value) {
      await systemApi.updateUser(editingUser.value.id, form)
    } else {
      await systemApi.createUser(form)
    }
    ElMessage.success('保存成功')
    showAddDialog.value = false
    editingUser.value = null
    loadData()
  } catch (e) { ElMessage.error('保存失败') }
}

async function handleDelete(row: any) {
  await ElMessageBox.confirm('确定删除该用户？', '提示', { type: 'warning' })
  try {
    await systemApi.deleteUser(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) { ElMessage.error('删除失败') }
}

onMounted(async () => {
  loadData()
  try { roles.value = await systemApi.getRoles() } catch (e) { console.error(e) }
})
</script>

<style scoped>
.system-page { background: var(--color-bg-page); }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
