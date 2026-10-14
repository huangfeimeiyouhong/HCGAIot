<!--
  顶栏 —— 56px 白底
  左：折叠按钮 + 面包屑；右：数据范围徽标 + 铃铛未读 + 角色下拉 + 头像
-->
<template>
  <header class="hi-topbar">
    <div class="hi-topbar__left">
      <button
        type="button"
        class="hi-topbar__collapse"
        title="折叠 / 展开菜单"
        @click="appStore.setCollapseStatus(!appStore.collapsed)"
      >
        <el-icon>
          <Fold v-if="!appStore.collapsed" />
          <Expand v-else />
        </el-icon>
      </button>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item
          v-for="crumb in breadcrumbs"
          :key="crumb.label"
          :to="crumb.to"
        >
          {{ crumb.label }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="hi-topbar__right">
      <!-- 数据范围徽标常驻，让租户隔离可见（PRD 3.5） -->
      <ScopeBadge />

      <el-badge
        :value="unread"
        :hidden="unread === 0"
        class="hi-topbar__bell"
      >
        <button
          type="button"
          class="hi-topbar__icon-btn"
          title="通知中心"
          @click="goNotifications"
        >
          <el-icon><Bell /></el-icon>
        </button>
      </el-badge>

      <el-dropdown
        trigger="click"
        @command="onCommand"
      >
        <span class="hi-topbar__user">
          <span class="hi-topbar__avatar">{{ avatarText }}</span>
          <span class="hi-topbar__user-meta">
            <span class="hi-topbar__user-name">{{ authStore.userInfo?.displayName ?? '未登录' }}</span>
            <span class="hi-topbar__user-role">{{ roleLabel }}</span>
          </span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="entry in entries"
              :key="entry.role"
              :command="entry.role"
            >
              <el-icon><component :is="entry.icon" /></el-icon>
              {{ entry.label }}
            </el-dropdown-item>
            <el-dropdown-item
              divided
              command="logout"
            >
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts" name="TopBar">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import ScopeBadge from '@/components/data/ScopeBadge.vue';
import { landingOf, logoutAndBack } from '@/router/guard';
import { useAppStore } from '@/store/app';
import { useAuthStore } from '@/store/auth';

import { commonApi } from '@/api/common';

import type { Role } from '@/types';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const authStore = useAuthStore();

/** 未读站内信数 */
const unread = ref(0);

/** 头像文字（取展示名末两字） */
const avatarText = computed(() => {
  const name = authStore.userInfo?.displayName ?? '';
  return name.length >= 2 ? name.slice(-2) : name || '—';
});

/** 角色中文名 */
const roleLabel = computed(() => {
  const map: Record<Role, string> = { PLATFORM: '平台运营', VENDOR: '厂家端', CUSTOMER: '客户端' };
  return authStore.role ? map[authStore.role] : '';
});

/** 入口切换项 */
const entries: Array<{ role: Role; label: string; icon: string }> = [
  { role: 'PLATFORM', label: '切到平台运营', icon: 'Odometer' },
  { role: 'VENDOR', label: '切到厂家端', icon: 'Cpu' },
  { role: 'CUSTOMER', label: '切到客户端', icon: 'OfficeBuilding' },
];

/** 面包屑（从 route meta.parent 推导） */
const breadcrumbs = computed(() => {
  const list: Array<{ label: string; to?: string }> = [];
  const meta = route.meta;
  if (meta.parent) {
    const parentRoute = router.getRoutes().find((r) => r.path === meta.parent);
    list.push({ label: parentRoute?.meta?.title ?? '列表', to: meta.parent });
  }
  list.push({ label: appStore.pageTitle || meta.title || '首页' });
  return list;
});

/** 通知中心路径 */
const notificationsPath = computed(() => {
  const map: Record<Role, string> = {
    PLATFORM: '/platform/notifications',
    VENDOR: '/vendor/notifications',
    CUSTOMER: '/customer/notifications',
  };
  return authStore.role ? map[authStore.role] : '/';
});

/** 拉未读数 */
const loadUnread = async (): Promise<void> => {
  if (!authStore.isLoggedIn) return;
  unread.value = await commonApi.getUnreadCount();
};

/** 跳转通知中心 */
const goNotifications = (): void => {
  void router.push(notificationsPath.value);
};

/**
 * 顶栏角色切换（架构文档 A10.1 S4：清登录态 + 带 role 跳登录页，不静默切换）
 * @param command PLATFORM / VENDOR / CUSTOMER / logout
 */
const onCommand = async (command: string): Promise<void> => {
  if (command === 'logout') {
    await logoutAndBack(router);
    return;
  }
  const role = command as Role;
  await logoutAndBack(router);
  await router.push({ path: '/login', query: { role: role.toLowerCase(), from: landingOf(role) } });
};

onMounted(() => {
  void loadUnread();
});
</script>

<style scoped lang="scss">
.hi-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  height: var(--layout-topbar-height);
  padding: 0 16px 0 8px;
  background: var(--color-bg-container);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  &__collapse {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-body);
    font-size: 18px;
    cursor: pointer;

    &:hover {
      background: var(--color-fill-light);
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  &__bell {
    display: flex;
    align-items: center;
  }

  &__icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-text-body);
    font-size: 17px;
    cursor: pointer;

    &:hover {
      background: var(--color-fill-light);
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 8px;
    border-radius: 6px;
    cursor: pointer;
    outline: none;

    &:hover {
      background: var(--color-fill-light);
    }
  }

  &__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--color-primary-bg);
    color: var(--color-primary-text);
    font-size: 12px;
    font-weight: 600;
  }

  &__user-meta {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }

  &__user-name {
    color: var(--color-text-title);
    font-size: 13px;
  }

  &__user-role {
    color: var(--color-text-secondary);
    font-size: 11px;
  }
}
</style>