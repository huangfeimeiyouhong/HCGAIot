/**
 * 大屏 Header(三区:左 / 中 / 右)
 * - 两种变体(路由 meta.header 驱动,默认 main):
 *   main   —— 居中 logo + 大标题(header.png 光效底板),驾驶舱页使用
 *   detail —— 左侧 logo + 标题(header-detail-bg.svg 斜切底板),台账/轮播等子页使用
 * - 标题优先级:appStore.pageTitle > route.meta.title > title prop
 * - 右侧固定操作:返回上一级 | 返回首页(首页不显示)+ 全屏;额外操作走 #extra 插槽
 * - 背景图与 logo 均在 assets/images/headers/ 下,换品牌视觉直接换图即可
 */
<template>
  <section
    class="header-bar"
    :class="`header-bar--${variant}`"
  >
    <section class="header-bar__content">
      <!-- 整行导航背景图 -->
      <div class="header-bar__bg">
        <img
          :src="bgSrc"
          alt=""
          class="header-bar__bg-img"
        >
      </div>

      <!-- 左区:main 变体实时时钟 / detail 变体 logo + 标题 -->
      <div class="header-bar__left">
        <div
          v-if="variant === 'main'"
          class="header-bar__clock"
        >
          <span class="header-bar__clock-tag">IoT 设备监控大屏</span>
          <span class="header-bar__clock-date">{{ dateText }}</span>
          <span class="header-bar__clock-time font-digital">{{ timeText }}</span>
        </div>
        <div
          v-else-if="variant === 'detail'"
          class="header-bar__title-left font-title"
        >
          <img
            :src="logoUrl"
            alt=""
            class="header-bar__logo"
          ><span class="header-bar__title-text">{{ displayTitle }}</span>
        </div>
      </div>

      <!-- 中区:main 变体的居中 logo + 大标题 -->
      <div class="header-bar__center">
        <div
          v-if="variant === 'main'"
          class="header-bar__title font-title"
        >
          <img
            :src="logoUrl"
            alt=""
            class="header-bar__logo"
          ><span class="header-bar__title-text">{{ displayTitle }}</span>
        </div>
      </div>

      <!-- 右区:返回上一级 | 返回首页 | 全屏 -->
      <div class="header-bar__right">
        <slot name="extra" />
        <div
          v-if="showBackActions"
          class="header-bar__actions"
        >
          <span
            class="header-bar__action"
            @click="handleBack"
          >返回上一级</span>
          <span class="header-bar__action-sep" />
          <span
            class="header-bar__action"
            @click="handleHome"
          >返回首页</span>
          <span class="header-bar__action-sep" />
        </div>
        <span
          class="header-bar__action"
          title="全屏"
          @click="toggleFullscreen"
        >全屏</span>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts" name="HeaderBar">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import headerDetailBg from '@/assets/images/headers/header-detail-bg.svg';
import headerBg from '@/assets/images/headers/header.png';
import logoUrl from '@/assets/images/headers/logo.svg';
import { useAppStore } from '@/store/app';

interface Props {
  /** 兜底标题(appStore.pageTitle 与 route.meta.title 都为空时用) */
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: '可视化驾驶舱',
});

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

const variant = computed(() => ((route.meta.header as string) === 'detail' ? 'detail' : 'main'));
const displayTitle = computed(
  () => appStore.pageTitle || (route.meta.title as string) || props.title,
);

// 首页(全国视角)已是最顶层,返回按钮无意义
const showBackActions = computed(() => route.path !== '/dashboard');

const bgSrc = computed(() => (variant.value === 'detail' ? headerDetailBg : headerBg));

// ---------------- 实时时钟(左区) ----------------
const WEEK_LABEL = ['日', '一', '二', '三', '四', '五', '六'];
const pad2 = (n: number) => String(n).padStart(2, '0');
const now = ref(new Date());
let clockTimer: number | null = null;

onMounted(() => {
  clockTimer = window.setInterval(() => {
    now.value = new Date();
  }, 1000);
});
onBeforeUnmount(() => {
  if (clockTimer !== null) {
    window.clearInterval(clockTimer);
    clockTimer = null;
  }
});

const timeText = computed(
  () => `${pad2(now.value.getHours())}:${pad2(now.value.getMinutes())}:${pad2(now.value.getSeconds())}`
);
const dateText = computed(
  () =>
    `${now.value.getFullYear()}-${pad2(now.value.getMonth() + 1)}-${pad2(now.value.getDate())} 星期${
      WEEK_LABEL[now.value.getDay()]
    }`
);

const handleBack = () => {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push('/');
  }
};
const handleHome = () => router.push('/');

const toggleFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
};
</script>

<style lang="scss" scoped>
.header-bar {
  box-sizing: border-box;
  // 仪表盘地图层向上出血到导航下方,提层级保证导航内容与交互浮于地图之上
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100px;
  overflow: visible; // 允许背景图超出可见

  // main 变体:标题底板背景图下移,露出更多光效
  &--main {
    .header-bar__bg {
      top: 16px;
    }
  }

  // 三段 flex 骨架:左区 | 中区 | 右区
  &__content {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    height: 100%;
    padding: 0 30px; // 与页面容器 padding 对齐
  }

  // 整行背景图
  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;

    .header-bar__bg-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__left,
  &__center,
  &__right {
    position: relative; // 位于背景图之上
    display: flex;
    align-items: center;
    min-width: 0;
  }

  // 左右等宽,中区绝对居中
  &__left {
    flex: 1;
    justify-content: flex-start;
  }

  &__center {
    flex-shrink: 0;
    justify-content: center;
  }

  &__right {
    flex: 1;
    justify-content: flex-end;
    gap: 12px;
  }

  // main 变体居中大标题
  &__title {
    display: flex;
    align-items: center;
    font-size: 40px;
    line-height: 57px;
    white-space: nowrap;
  }

  // detail 变体左侧 logo + 标题
  &__title-left {
    display: flex;
    align-items: center;
    font-size: 40px;
    white-space: nowrap;
  }

  // 标题字效:顶部 #F4F8FF → 底部 #5883FF 渐变,外投黑色阴影
  &__title-text {
    background: linear-gradient(180deg, #f4f8ff 41%, #5883ff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 5px 4px rgba(0, 0, 0, 0.5));
  }

  &__logo {
    width: 62px;
    height: 52px;
    object-fit: contain;
    margin-right: 10px;
  }

  // main 变体左侧实时时钟(数据屏标识 + 日期 + 时钟)
  &__clock {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 14px;
    height: 44px;
    padding: 0 16px;
    background: linear-gradient(90deg, rgba(4, 28, 61, 0.96) 0%, rgba(4, 79, 133, 0.82) 100%);
    border: 1px solid rgba(20, 184, 255, 0.9);
    border-radius: 4px;
    box-shadow:
      0 0 12px rgba(10, 173, 255, 0.36),
      inset 0 1px 2px rgba(89, 224, 255, 0.22);

    &-tag {
      font-size: 14px;
      color: rgba(191, 233, 255, 0.9);
      white-space: nowrap;
    }

    &-date {
      font-size: 14px;
      color: rgba(191, 233, 255, 0.75);
      white-space: nowrap;
    }

    &-time {
      font-size: 24px;
      color: #fff;
      white-space: nowrap;
      text-shadow: 0 0 8px rgba(65, 192, 255, 0.6);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
  }

  &__action {
    padding: 0 10px;
    font-size: 20px;
    line-height: 20px;
    color: #fff;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;

    &:hover {
      opacity: 0.8;
    }
  }

  &__action-sep {
    width: 1px;
    height: 12px;
    background: rgba(255, 255, 255, 0.3);
  }
}
</style>
