<!--
  侧边导航 —— 220px 深色 / 可折叠 64px
  菜单源 constants/menu.ts（唯一真源），按 role + vendorType + 入驻状态过滤
-->
<template>
  <aside
    class="hi-sidenav"
    :class="{ 'hi-sidenav--collapsed': collapsed }"
  >
    <div class="hi-sidenav__logo">
      <img
        class="hi-sidenav__logo-img"
        src="@/assets/images/logo.svg"
        alt="后厨管家"
      >
      <span
        v-if="!collapsed"
        class="hi-sidenav__logo-text"
      >AIoT 双边服务平台</span>
    </div>

    <el-scrollbar class="hi-sidenav__scroll">
      <el-menu
        :default-active="activePath"
        :collapse="collapsed"
        :collapse-transition="false"
        unique-opened
        router
        background-color="transparent"
        text-color="var(--color-sidebar-text)"
        active-text-color="var(--color-sidebar-active)"
      >
        <el-menu-item
          v-for="item in menus"
          :key="item.path"
          :index="item.path"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>

    <div class="hi-sidenav__footer">
      <button
        type="button"
        class="hi-sidenav__back"
        @click="onBack"
      >
        <el-icon><SwitchButton /></el-icon>
        <span v-if="!collapsed">返回入口切换</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts" name="SideNav">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { visibleMenus } from '@/constants/menu';
import { logoutAndBack } from '@/router/guard';
import { useAuthStore } from '@/store/auth';

interface Props {
  collapsed: boolean;
}

defineProps<Props>();

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

/** 当前高亮项：详情页高亮其父级菜单 */
const activePath = computed(() => {
  const meta = route.meta;
  if (meta.parent) return String(meta.parent);
  return route.path;
});

/** 菜单（按角色 / 厂家类型 / 入驻状态过滤） */
const menus = computed(() =>
  visibleMenus({
    role: authStore.role ?? 'PLATFORM',
    vendorType: authStore.vendorType,
    isBoundVendor: authStore.isBoundVendor,
    isTrialVendor: authStore.isTrialVendor,
  }),
);

/** 返回入口选择（登出 + 清缓存） */
const onBack = async (): Promise<void> => {
  await logoutAndBack(router);
};
</script>

<style scoped lang="scss">
.hi-sidenav {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: var(--layout-sidebar-width);
  height: 100%;
  background: var(--color-sidebar-bg);
  transition: width 0.2s ease;

  &--collapsed {
    width: var(--layout-sidebar-width-folded);
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    height: var(--layout-topbar-height);
    padding: 0 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
  }

  &__logo-img {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  &__logo-text {
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }

  &__scroll {
    flex: 1;
    min-height: 0;
  }

  &__footer {
    padding: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__back {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 36px;
    padding: 0 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--color-sidebar-text);
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #FFFFFF;
    }
  }

  // Element Plus 菜单在深色侧栏内的浅色适配
  :deep(.el-menu) {
    border-right: none;
    padding: 8px;
  }

  :deep(.el-menu-item) {
    height: 42px;
    line-height: 42px;
    margin-bottom: 2px;
    border-radius: 6px;

    &:hover {
      background: rgba(255, 255, 255, 0.06) !important;
    }

    &.is-active {
      background: rgba(65, 192, 255, 0.14);
      font-weight: 500;
    }
  }

  :deep(.el-menu--collapse) {
    width: auto;

    .el-menu-item {
      padding: 0 14px !important;
    }
  }
}
</style>