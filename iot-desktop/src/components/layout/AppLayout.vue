<!--
  布局壳 —— 三入口共用同一份，不是三份复制
  结构：SideNav + TopBar + 内容区（滚动容器在 .content，body 不滚动）
-->
<template>
  <div class="hi-layout">
    <SideNav :collapsed="appStore.collapsed" />
    <div class="hi-layout__main">
      <TopBar />
      <div class="hi-layout__content">
        <router-view v-slot="{ Component, route }">
          <keep-alive :include="appStore.keepAliveComponents" :max="appStore.keepAliveMax">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="AppLayout">
import { onMounted, onBeforeUnmount } from 'vue';

import SideNav from './SideNav.vue';
import TopBar from './TopBar.vue';

import { useAppStore } from '@/store/app';

const appStore = useAppStore();

/** 窄屏（<1280px）自动折叠侧栏（PRD 3.3 响应式） */
let media: MediaQueryList | null = null;
const onMediaChange = (e: MediaQueryListEvent | MediaQueryList): void => {
  appStore.collapsed = e.matches;
};

onMounted(() => {
  media = window.matchMedia('(max-width: 1280px)');
  appStore.collapsed = media.matches;
  media.addEventListener('change', onMediaChange);
});

onBeforeUnmount(() => {
  media?.removeEventListener('change', onMediaChange);
});
</script>

<style scoped lang="scss">
.hi-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;

  &__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    height: 100%;
  }

  &__content {
    flex: 1;
    min-height: 0;
    background: var(--color-bg-page);
    // ⚠️ 滚动容器在内容区，body 不滚动（与 iot-cockpit 相反）
    @include page-scroll;
    @include thin-scrollbar;
  }
}
</style>