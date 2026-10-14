<template>
  <div class="horizontal-carousel">
    <div class="horizontal-carousel__container">
      <div
        class="horizontal-carousel__viewport"
        :style="{ width: viewportWidth + 'px' }"
        @mouseenter="isPaused = true"
        @mouseleave="isPaused = false"
      >
        <div
          ref="trackRef"
          class="horizontal-carousel__track"
          :class="{ 'horizontal-carousel__track--no-transition': noTransition }"
          :style="trackStyle"
          @transitionend="onTrackTransitionEnd"
        >
          <template
            v-for="(slide, idx) in windowSlots"
            :key="idx"
          >
            <div
              v-if="slide"
              class="horizontal-carousel__item"
              @click="handleClick(slide)"
            >
              <img
                :src="slide.src"
                :alt="`carousel-${idx}`"
                class="horizontal-carousel__image"
              >
              <div
                v-if="slide.title || slide.tag"
                class="horizontal-carousel__caption"
              >
                <span
                  v-if="slide.title"
                  class="horizontal-carousel__caption-title"
                >{{ slide.title }}</span>
                <span
                  v-if="slide.tag"
                  class="horizontal-carousel__caption-tag"
                >{{ slide.tag }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="HorizontalCarousel">
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from 'vue';

import type { CarouselSlideData } from '../../carousel-data';

interface Props {
  slides?: CarouselSlideData[];
  imgWidth?: number;
  imgHeight?: number;
  visible?: number;
  gap?: number;
  speed?: number;
}

const props = withDefaults(defineProps<Props>(), {
  slides: () => [],
  imgWidth: 281,
  imgHeight: 156,
  visible: 4,
  gap: 12,
  speed: 80,
});

const emit = defineEmits(['item-click']);

const viewportWidth = computed(() => props.visible * props.imgWidth + (props.visible - 1) * props.gap);

/** 单步距离 = 一格宽 + 间距 */
const stepWidth = computed(() => props.imgWidth + props.gap);

// ---- 窗口化(虚拟)渲染 ----
// 旧实现把整份素材复制 ≥2 份全量上树(50 张 = 100 个节点,千张直接卡死)。
// 改为只挂「可见 + 缓冲」个槽位,槽位 k 显示第 (startIndex + k) % count 帧:
// DOM 与图片请求都恒定 O(visible),素材 50/100/1000 张节点数不变;
// 滑格动画 = 轨道平移一格,transitionend 后无过渡右移窗口 + 平移归零(同一帧完成,视觉无缝)
const WINDOW_BUFFER = 3;
const slotCount = computed(() => props.visible + WINDOW_BUFFER);

/** 轮播下限:素材不足 3 帧时全部常驻可见,滚动无意义 → 平铺不滚也不克隆补位 */
const MIN_GLIDE_COUNT = 3;

/** 静止平铺模式(素材不足轮播下限) */
const isStatic = computed(() => props.slides.length < MIN_GLIDE_COUNT);

/** 窗口首帧绝对序号(单调递增,渲染时按素材数取模循环) */
const startIndex = ref(0);

/** 窗口内各槽位素材(素材空返回 [],轨道不渲染;平铺模式直接原素材,不取模克隆) */
const windowSlots = computed<(CarouselSlideData | null)[]>(() => {
  const count = props.slides.length;
  if (!count) return [];
  if (isStatic.value) return props.slides.slice();
  return Array.from({ length: slotCount.value }, (_, k) => props.slides[(startIndex.value + k) % count]);
});

/** 静止间隔(ms) */
const GLIDE_INTERVAL = 4000;
/** 单次滑动时长(ms,与 --glide-duration 同步) */
const GLIDE_DURATION = 600;

const trackCssVars = computed(() => ({
  '--img-width': props.imgWidth + 'px',
  '--img-height': props.imgHeight + 'px',
  '--gap': props.gap + 'px',
  '--glide-duration': `${GLIDE_DURATION}ms`,
}));

/** 点击帧素材上抛,由宿主(video-carousel)按 tab 决定交互 */
const handleClick = (slide: CarouselSlideData) => {
  emit('item-click', slide);
};

// ---- 间歇滑动驱动 ----
// 旧实现:80ms 定时器持续推进 transform(12fps)。轮播压在 WebGL 地图画布之上,
// 每次位移都强制浏览器对重叠区域重新合成(牵连地图纹理),空闲时 GPU 进程常驻
// ~4%、渲染进程 ~5%(CDP 实测;合成频率降为 1/5 前的 CSS 60fps 版本 GPU ~14%),
// 长驻大屏持续烘烤越用越卡。改为「静止 4s → 0.6s 滑一格」的间歇模式:
// 滑动走 CSS transition(纯合成器),静止期零合成,平均成本≈0,实测 GPU 降到 0.3%
const trackRef = ref<HTMLElement | null>(null);
const isPaused = ref(false);
/** 复位瞬间禁用 transition(窗口右移 + 平移归零须无动画) */
const noTransition = ref(false);
/** 当前平移(px,窗口内坐标:0 = 首帧贴视口左缘,滑格后 = stepWidth) */
const offset = ref(0);

const trackStyle = computed(() => ({
  ...trackCssVars.value,
  transform: `translate3d(${-offset.value}px, 0, 0)`,
}));

let glideTimer: number | null = null;

/**
 * 无过渡滑窗复位:窗口右移一格 + 平移归零。
 * Vue 更新 DOM 是异步的,必须等 nextTick 让「关 transition + 新窗口」真正写入 DOM
 * 后再 reflow,否则改动会合并成一次带 transition 的 patch,浏览器往回倒放动画
 */
async function advanceWindow(): Promise<void> {
  noTransition.value = true;
  startIndex.value += 1;
  offset.value = 0;
  await nextTick();
  // 强制 reflow,确保无过渡状态已被合成器采用,再恢复 transition
  void trackRef.value?.offsetWidth;
  noTransition.value = false;
}

/** 滑格动画结束(transitionend 比 setTimeout 掐点可靠) */
function onTrackTransitionEnd(e: TransitionEvent): void {
  if (e.propertyName !== 'transform') return;
  if (offset.value > 0) void advanceWindow();
}

async function glide(): Promise<void> {
  // 暂停(hover/keep-alive 缓存)、素材为空或不足轮播下限(平铺模式)时链条空转,
  // 恢复/tab 切换补足素材后自然接续
  if (isPaused.value || isStatic.value || !props.slides.length) {
    scheduleNext();
    return;
  }
  // 兜底:keep-alive 缓存期 transition 被取消/transitionend 丢失会让 offset 悬在
  // 滑格终点不再复位(窗口卡在一格之外),须先等复位真正落 DOM 再滑下一格,
  // 否则「复位 + 新滑格」两写合并成一次带过渡 patch,视觉跳两格
  if (offset.value > 0) await advanceWindow();
  noTransition.value = false;
  offset.value = stepWidth.value;
  scheduleNext();
}

function scheduleNext(): void {
  if (glideTimer !== null) window.clearTimeout(glideTimer);
  glideTimer = window.setTimeout(glide, GLIDE_INTERVAL + GLIDE_DURATION);
}

onMounted(() => {
  scheduleNext();
});

// 素材整批替换(tab 切换换一批图)时窗口起点归零,残留平移无过渡清掉防露空白
watch(
  () => props.slides,
  () => {
    noTransition.value = true;
    startIndex.value = 0;
    offset.value = 0;
    void nextTick(() => {
      noTransition.value = false;
    });
  },
);

// dashboard 被 keep-alive 缓存:离开路由组件不卸载,定时器继续跑毫无意义(还白烧 CPU)
// ——deactivated 暂停,activated 恢复
onDeactivated(() => {
  isPaused.value = true;
  if (glideTimer !== null) {
    window.clearTimeout(glideTimer);
    glideTimer = null;
  }
});

onActivated(() => {
  isPaused.value = false;
  // keep-alive 缓存期 DOM 被移出文档:运行中的 transition 会被浏览器取消且不发
  // transitionend,offset 可能停在滑格终点;重挂后合成层也可能残留旧状态。
  // 无过渡直写一次归零平移(绕过 Vue diff,值不变也强制重绘)让合成器立刻吃到
  // 正确状态,再恢复滑动链条
  noTransition.value = true;
  offset.value = 0;
  void nextTick(() => {
    const el = trackRef.value;
    if (el) {
      el.style.transform = 'translate3d(0, 0, 0)';
      void el.offsetWidth; // reflow,确保无过渡状态被合成器采用
    }
    noTransition.value = false;
  });
  scheduleNext();
});

onBeforeUnmount(() => {
  if (glideTimer !== null) window.clearTimeout(glideTimer);
});
</script>

<style scoped lang="scss">
.horizontal-carousel {
  height: 100%;

  &__container {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  &__viewport {
    overflow: hidden;
    box-sizing: border-box;
  }

  &__track {
    display: flex;
    align-items: center;
    // 间歇滑动:transition 只在每 3.5s 一次的滑格动画期间工作,静止期零合成;
    // will-change 层提升让滑动只走合成器,不触发重排
    will-change: transform;
    transition: transform var(--glide-duration) ease;

    &--no-transition {
      transition: none;
    }
  }

  // 卡片圆角(设计稿 rx=4):收在 item 上裁切,角标遮罩随之同圆
  &__item {
    position: relative;
    flex: 0 0 auto;
    margin-right: var(--gap);
    cursor: pointer;
    border-radius: 4px;
    overflow: hidden;
  }

  &__image {
    width: var(--img-width);
    height: var(--img-height);
    // contain 完整显示画面(监控图非 16:9 时 cover 会裁掉两侧),深色底让留白边融入卡片
    object-fit: contain;
    background: #010811;
    display: block;

    &:hover {
      cursor: pointer;
    }
  }

  // 底部信息角标(AI事件设计稿):渐变遮罩 #040C17 顶部全透→底部 .88,高按卡片等比收 44px,
  // 左下项目名、右下事件类型,白字超长省略
  &__caption {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 44px;
    box-sizing: border-box;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    padding: 0 8px 6px;
    pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(4, 12, 23, 0.88) 0%,
      rgba(4, 12, 23, 0.68) 54%,
      rgba(4, 12, 23, 0) 100%
    );
  }

  &__caption-title,
  &__caption-tag {
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    line-height: 1.2;
    color: #ffffff;
  }

  &__caption-tag {
    flex-shrink: 0;
  }
}
</style>
