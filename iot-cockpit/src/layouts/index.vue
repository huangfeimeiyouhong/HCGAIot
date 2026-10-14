<template>
  <self-adaption :full-screen="false">
    <section class="hi-layouts-wrap">
      <Loading v-show="isLoading" />

      <HeaderBar />

      <section class="hi-layouts-container">
        <!-- keep-alive 缓存列表由路由 meta.keepAlive 驱动(见下方 afterEach):新页面只需在
             路由 meta 声明 keepAlive: true 即被缓存,组件 name 须与路由 name 解析出的组件
             name 一致;业务侧可调 appStore.removeKeepAlive(name) 运行时摘除缓存 -->
        <router-view
          v-slot="{ Component }"
          :key="routerKey"
        >
          <keep-alive :include="appStore.keepAliveComponents">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </section>
    </section>
  </self-adaption>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { RouterView } from 'vue-router';

import HeaderBar from './components/header/header-bar.vue';

import Loading from '@/components/loading/index.vue';
import selfAdaption from '@/components/self-adaption';
import { useAppStore } from '@/store/app';

const appStore = useAppStore();
const isLoading = ref(false);
const routerKey = computed(() => appStore.currentDate);
watch(
  () => appStore.loading,
  (val) => {
    isLoading.value = val;
  },
  {
    immediate: true,
  }
);
</script>

<style lang="scss" scoped>
.hi-layouts-wrap {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #0a1a3e 0%, #061230 100%);

  .hi-layouts-container {
    box-sizing: border-box;
    position: relative;
    padding: 0 30px 30px;
    height: calc(100% - 100px);
  }
}
</style>
