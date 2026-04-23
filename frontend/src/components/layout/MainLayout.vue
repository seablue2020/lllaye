<template>
  <div class="main-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <div class="logo">
          <el-icon :size="28"><Stamp /></el-icon>
          <span v-if="!isCollapsed" class="logo-text">欠薪支持起诉<br/>智能办案平台</span>
        </div>
        <el-button
          class="collapse-btn"
          text
          @click="isCollapsed = !isCollapsed"
        >
          <el-icon :size="18">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </el-button>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        :collapse-transition="false"
        background-color="#1a1a2e"
        text-color="#a0a0b0"
        active-text-color="#ffffff"
        class="sidebar-menu"
      >
        <el-menu-item index="/dashboard" @click="router.push('/dashboard')">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>办案总览</template>
        </el-menu-item>

        <el-menu-item index="/clue" @click="router.push('/clue')">
          <el-icon><Search /></el-icon>
          <template #title>线索管理</template>
        </el-menu-item>

        <el-menu-item index="/review" @click="router.push('/review')">
          <el-icon><Monitor /></el-icon>
          <template #title>AI辅助审查</template>
        </el-menu-item>

        <el-menu-item index="/document" @click="router.push('/document')">
          <el-icon><Document /></el-icon>
          <template #title>文书管理</template>
        </el-menu-item>

        <el-menu-item index="/batch" @click="router.push('/batch')">
          <el-icon><Grid /></el-icon>
          <template #title>批量办案</template>
        </el-menu-item>

        <el-menu-item index="/statistics" @click="router.push('/statistics')">
          <el-icon><TrendCharts /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>

        <el-sub-menu index="/system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/users" @click="router.push('/system/users')">用户管理</el-menu-item>
          <el-menu-item index="/system/roles" @click="router.push('/system/roles')">角色权限</el-menu-item>
          <el-menu-item index="/system/dictionaries" @click="router.push('/system/dictionaries')">字典配置</el-menu-item>
          <el-menu-item index="/system/audit-logs" @click="router.push('/system/audit-logs')">审计日志</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </aside>

    <!-- 右侧主内容区 -->
    <div class="main-content">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta?.parent">
              {{ getMenuLabel(currentRoute.meta.parent as string) }}
            </el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentRoute.meta?.title">
              {{ currentRoute.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="topbar-right">
          <el-badge :value="pendingTasks" :hidden="pendingTasks === 0" :max="99">
            <el-button text @click="router.push('/dashboard')">
              <el-icon :size="18"><Bell /></el-icon>
            </el-button>
          </el-badge>

          <el-button text @click="showNotice = true">
            <el-icon :size="18"><ChatLineSquare /></el-icon>
          </el-button>

          <div class="user-info">
            <el-dropdown @command="handleUserCommand">
              <span class="user-dropdown">
                <el-avatar :size="32" style="background: var(--color-primary)">
                  {{ userStore.userName?.[0] || 'U' }}
                </el-avatar>
                <div class="user-detail">
                  <span class="user-name">{{ userStore.userName }}</span>
                  <span class="user-role">{{ userStore.role }}</span>
                </div>
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="password">修改密码</el-dropdown-item>
                  <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="page-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 公告弹窗 -->
    <el-dialog v-model="showNotice" title="系统公告" width="500px">
      <div class="notice-content">
        <p>欢迎使用欠薪支持起诉智能办案平台（检察端）</p>
        <p>系统版本：v1.0.0</p>
        <p>如有问题请联系系统管理员。</p>
      </div>
      <template #footer>
        <el-button @click="showNotice = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDashboardStore } from '@/stores/dashboard'
import { ElMessageBox, ElMessage } from 'element-plus'
import {
  DataAnalysis,
  Search,
  Monitor,
  Document,
  Grid,
  TrendCharts,
  Setting,
  Bell,
  ChatLineSquare,
  Fold,
  Expand,
  ArrowDown,
  Stamp,
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const dashboardStore = useDashboardStore()

const isCollapsed = ref(false)
const showNotice = ref(false)
const pendingTasks = ref(0)

const activeMenu = computed(() => route.path)
const currentRoute = computed(() => route)

const menuLabels: Record<string, string> = {
  Clue: '线索管理',
  Review: 'AI辅助审查',
  Document: '文书管理',
  Batch: '批量办案',
  Statistics: '数据统计',
  Users: '用户管理',
  Roles: '角色权限',
  Dictionaries: '字典配置',
  AuditLogs: '审计日志',
}

function getMenuLabel(key: string) {
  return menuLabels[key] || key
}

function handleUserCommand(command: string) {
  switch (command) {
    case 'logout':
      ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        userStore.logout()
        router.push('/login')
        ElMessage.success('已退出登录')
      })
      break
    case 'profile':
      ElMessage.info('个人中心功能开发中')
      break
    case 'password':
      ElMessage.info('修改密码功能开发中')
      break
  }
}

onMounted(() => {
  dashboardStore.fetchTasks()
  setTimeout(() => {
    pendingTasks.value = dashboardStore.tasks.filter((t) => t.status === 'pending').length
  }, 1000)
})
</script>

<style scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  background: var(--color-bg-sidebar);
  display: flex;
  flex-direction: column;
  transition: width 0.3s, min-width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
  min-width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  height: var(--topbar-height);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  overflow: hidden;
}

.logo-text {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.collapse-btn {
  color: #a0a0b0;
  flex-shrink: 0;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;
  overflow-x: hidden;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
}

:deep(.el-menu-item.is-active) {
  background: var(--color-bg-sidebar-active) !important;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: var(--color-bg-sidebar-hover) !important;
}

/* 主内容区 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部栏 */
.topbar {
  height: var(--topbar-height);
  min-height: var(--topbar-height);
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.topbar-left {
  display: flex;
  align-items: center;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  margin-left: 8px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: background 0.2s;
}

.user-dropdown:hover {
  background: var(--color-bg-page);
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.2;
}

.user-role {
  font-size: 11px;
  color: var(--color-text-muted);
  line-height: 1.2;
}

/* 内容区 */
.page-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--color-bg-page);
}

.notice-content {
  line-height: 1.8;
  color: var(--color-text-secondary);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
