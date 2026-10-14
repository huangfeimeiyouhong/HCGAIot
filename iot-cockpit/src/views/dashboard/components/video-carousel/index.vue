/**
 * 视频轮播面板
 * header = 「重点项目」「AI事件」双 tab 互切(重点项目沿用 PanelTitle 皮肤,选中线随激活 tab)
 *          + 右侧 LinkTag(文案随 tab:重点项目→查看监控 / AI事件→查看事件),
 * body = 玻璃体(青色渐变描边/背景模糊/右缘渐隐)内嵌 horizontal-carousel 轨道(组件已收敛为纯无壳形态);
 * 素材按 tab + 视角获取(carousel-data 收口:AI事件=视角内工单整改前图,重点项目=视角内配置的重点项目)
 */
<template>
  <div class="video-carousel">
    <div class="video-carousel__header">
      <div
        class="video-carousel__title"
        :class="{ 'video-carousel__title--active': activeTab === 'project' }"
        @click="handleTabClick('project')"
      >
        <PanelTitle title="重点项目" />
      </div>
      <button
        class="font-title video-carousel__tab"
        :class="{ 'video-carousel__tab--active': activeTab === 'ai' }"
        @click="handleTabClick('ai')"
      >
        AI事件
      </button>
      <LinkTag
        class="video-carousel__more"
        :text="moreText"
        @click="emit('more-click', activeTab)"
      />
    </div>
    <div class="video-carousel__body">
      <HorizontalCarousel
        :slides="images"
        :visible="4"
        :img-width="281"
        :img-height="156"
        :gap="12"
        @item-click="handleSlideClick"
      />
      <div
        v-if="isLoading"
        class="video-carousel__mask"
      >
        <span class="video-carousel__spinner" />
        <span>加载中...</span>
      </div>
      <div
        v-else-if="!images.length"
        class="video-carousel__mask"
      >
        <span>{{ activeTab === 'ai' ? '暂无AI事件' : '暂无重点项目素材' }}</span>
      </div>
      <div class="video-carousel__fade" />
    </div>

    <!-- AI事件帧详情弹窗(与 AI 事件台账「详情」操作同款交互) -->
    <DetailDialog ref="aiDetailDialogRef" />
  </div>
</template>

<script setup lang="ts" name="VideoCarousel">
import { computed, onDeactivated, onMounted, ref, watch } from 'vue';

import { useRouter } from 'vue-router';

import { getCarouselImages } from '../../carousel-data';
import HorizontalCarousel from '../horizontal-carousel/index.vue';
import LinkTag from '../link-tag/index.vue';

import type { CarouselScope, CarouselSlideData, CarouselTab } from '../../carousel-data';

import PanelTitle from '@/components/panel-title/index.vue';
import { usePolling } from '@/hooks/use-polling';
import DetailDialog from '../event-detail-dialog/index.vue';

interface Props {
  /** 省码,不传 = 全国 */
  city?: string;
  /** 网格 orgId */
  gridOrgId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  city: '',
  gridOrgId: '',
});

/** 当前素材 tab(缺省重点项目) */
const activeTab = ref<CarouselTab>('project');

/** 右侧 link-tag 文案随 tab 切换:重点项目→查看监控,AI事件→查看事件 */
const moreText = computed(() => (activeTab.value === 'project' ? '查看监控' : '查看事件'));

/** 素材视角(全国/省/网格,网格级优先;L2/L3 页传入) */
const scope = computed<CarouselScope>(() => ({
  city: props.city || undefined,
  gridOrgId: props.gridOrgId || undefined,
}));

/** 轮播素材(tab + 视角对应接口返回) */
const images = ref<CarouselSlideData[]>([]);

/** 拉取中(body 中央转圈遮罩,防「点了没反应」) */
const isLoading = ref(false);

/** 接口请求序号:快速互切 tab / 变视角时丢弃过期响应 */
let requestSeq = 0;

async function loadImages(tab: CarouselTab): Promise<void> {
  const seq = ++requestSeq;
  images.value = [];
  isLoading.value = true;
  try {
    const list = await getCarouselImages(tab, scope.value);
    if (seq !== requestSeq) return;
    images.value = list;
  } finally {
    if (seq === requestSeq) isLoading.value = false;
  }
}

function handleTabClick(tab: CarouselTab): void {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  void loadImages(tab);
}

// 视角变化(如 L3 同页切网格 query)重拉当前 tab 素材
watch(scope, () => {
  void loadImages(activeTab.value);
});

onMounted(() => {
  void loadImages(activeTab.value);
});

/** AI事件素材指纹(工单 id + 状态序列):轮询无变化不替换素材,防轮播无谓回跳第 1 帧 */
const slidesFingerprintOf = (list: CarouselSlideData[]): string =>
  list.map(slide => `${slide.record?.id ?? slide.src}:${slide.record?.status ?? ''}`).join('|');

/**
 * AI事件素材静默刷新(轮询):不清素材不显 loading,失败保持旧素材;
 * 指纹有变化才整体替换(horizontal-carousel 随之回跳第 1 帧,新事件尽快上屏)
 */
async function refreshAiSlides(): Promise<void> {
  const seq = ++requestSeq;
  try {
    const list = await getCarouselImages('ai', scope.value);
    if (seq !== requestSeq) return;
    if (slidesFingerprintOf(list) !== slidesFingerprintOf(images.value)) {
      images.value = list;
    }
  } catch {
    // 静默刷新失败保持旧素材,不打断轮播(错误提示由请求层统一弹出)
  }
}

// AI事件 tab 60s 轮询实时刷新(重点项目配置低频变化,不轮询;
// keep-alive 离场停表/回场补刷续表由 usePolling 管)
usePolling(() => {
  if (activeTab.value === 'ai') void refreshAiSlides();
}, 1000 * 60);

const emit = defineEmits(['more-click']);

const router = useRouter();

/** AI事件详情弹窗(共享 Dialog 挂 body,不受面板缩放容器限制) */
const aiDetailDialogRef = ref<InstanceType<typeof DetailDialog>>();

/** 点击帧:AI事件打开台账同款详情弹窗;重点项目帧跳视频轮播页单项目模式(带宗地 orgId + 节点真实 type 预定向) */
const handleSlideClick = (slide: CarouselSlideData) => {
  if (activeTab.value === 'ai' && slide.record) {
    aiDetailDialogRef.value?.open(slide.record);
    return;
  }
  if (!slide.orgId) return;
  router.push({ path: '/video-carousel/index', query: { orgId: slide.orgId, type: slide.orgType } });
};

// keep-alive 缓存期 body 弹层会随缓存残留,离场关闭(与台账页行为一致)
onDeactivated(() => {
  aiDetailDialogRef.value?.close();
});
</script>

<style lang="scss" scoped>
.video-carousel {
  position: relative;
  width: 980px;
  height: 220px;

  &__header {
    position: relative;
    height: 40px;
    display: flex;
    align-items: stretch;
    gap: 16px;
  }

  // 重点项目 tab:沿用面板标题组件皮肤(h1.png 装饰条与其他面板同源)。
  // fit-content 把流宽收在标题文字处,AI事件 标签才能以 gap 16px 紧随其后;
  // 装饰条图(969×96,显示约 484px 宽)绝对定位溢出容器,须放开标题自带的 overflow hidden
  &__title {
    position: relative;
    width: fit-content;
    flex: 0 0 auto;
    cursor: pointer;

    :deep(.panel-title) {
      overflow: visible;
    }

    // 激活态选中线:跳过装饰条左饰区(46px)贴标题文字,与 AI事件 线同款同高
    &--active::after {
      content: '';
      position: absolute;
      left: 46px;
      right: 0;
      bottom: 8px;
      height: 2px;
      border-radius: 1px;
      background: linear-gradient(90deg, #27edf6 0%, #0994ee 100%);
    }
  }

  // AI事件标签:与标题同款标题字体 24px 纯白
  &__tab {
    position: relative;
    height: 100%;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 24px;
    color: #ffffff;
    user-select: none;
    top: -2px;

    // 选中线随标签文字宽度,仅激活时显示(与重点项目 tab 互斥)
    &--active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 8px;
      height: 2px;
      border-radius: 1px;
      background: linear-gradient(90deg, #27edf6 0%, #0994ee 100%);
    }
  }

  &__more {
    position: absolute;
    top: 8px;
    right: 5px;
    z-index: 1;
  }

  // 玻璃体:青色渐变描边(左亮右隐)+ 背景模糊 + 微蓝渐变底
  &__body {
    position: relative;
    height: 180px;
    box-sizing: border-box;
    padding: 12px 0 12px 12px;
    overflow: hidden;
    border-radius: 0 0 6px 4px;
    background:
      linear-gradient(to top, rgba(13, 116, 255, 0.1) 0%, rgba(13, 116, 255, 0) 55%),
      linear-gradient(135deg, rgba(13, 116, 255, 0.05) 0%, rgba(13, 116, 255, 0) 55%);
    backdrop-filter: blur(10px);

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(
        90deg,
        #6de4fd 0%,
        rgba(109, 228, 253, 0.15) 45%,
        rgba(109, 228, 253, 0) 85%
      );
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
    }
  }

  // 拉取中/空素材遮罩:居中提示,不拦截鼠标(轮播 hover 暂停照常)
  &__mask {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    color: rgba(232, 247, 255, 0.65);
    pointer-events: none;
  }

  // 转圈:仅拉取期间存在(v-if 挂载),非常驻动画,不触碰同屏 canvas 的合成红线
  &__spinner {
    width: 22px;
    height: 22px;
    box-sizing: border-box;
    border: 2px solid rgba(109, 228, 253, 0.25);
    border-top-color: #6de4fd;
    border-radius: 50%;
    animation: video-carousel-spin 0.8s linear infinite;
  }

  // 右缘渐隐:轮播轨道向右淡出融入面板底色
  &__fade {
    position: absolute;
    top: 12px;
    bottom: 12px;
    right: 0;
    width: 100px;
    pointer-events: none;
    background: linear-gradient(90deg, rgba(0, 13, 42, 0) 0%, #000d2a 76%, #000d2a 100%);
  }
}

@keyframes video-carousel-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
