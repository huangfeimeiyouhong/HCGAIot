<template>
  <div class="pie-3d-chart">
    <!-- 3D 环形饼图(SVG 平行投影:切面 → 内壁 → 顶面 → 外壁) -->
    <svg
      class="pie-3d-chart__svg"
      :viewBox="`0 0 ${geo.viewBoxW} ${geo.viewBoxH}`"
      aria-hidden="true"
    >
      <g
        v-for="seg in geo.segments"
        :key="seg.index"
        class="pie-3d-chart__seg"
        :class="{ 'is-hover': hoveredIndex === seg.index }"
        @mouseenter="handleSegEnter(seg.index)"
        @mouseleave="handleSegLeave"
      >
        <path
          v-if="seg.paths.cutStart"
          :d="seg.paths.cutStart"
          :fill="seg.cutColor"
        />
        <path
          v-if="seg.paths.cutEnd"
          :d="seg.paths.cutEnd"
          :fill="seg.cutColor"
        />
        <path
          v-if="seg.paths.inner"
          :d="seg.paths.inner"
          :fill="seg.innerColor"
        />
        <path
          class="pie-3d-chart__top"
          :d="seg.paths.top"
          :fill="seg.color"
        />
        <path
          v-if="seg.paths.outer"
          :d="seg.paths.outer"
          :fill="seg.wallColor"
        />
      </g>
    </svg>

    <!-- 中心数值(定位在环孔中心,标签等额外内容由父组件通过插槽实现) -->
    <div
      class="pie-3d-chart__center"
      :style="centerStyle"
    >
      <slot
        name="center"
        :total="total"
      >
        <div class="pie-3d-chart__center-value">
          {{ centerValue ?? total }}
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts" name="Pie3dChart">
import { computed, onBeforeUnmount, ref } from 'vue';

import { buildTorusGeometry, type Pie3dDataItem } from './torus';

interface Props {
  /** 数据,格式:[{ name: '名称', value: 数值 }] */
  data?: Pie3dDataItem[];
  /** 系列色板 */
  colors?: string[];
  /** 内径 / 外径(0 ~ 1),越大中心孔越大 */
  innerRatio?: number;
  /** 厚度 / 外径(0 ~ 1),饼壁高度占比 */
  thickness?: number;
  /** 俯仰角(度),决定椭圆压扁程度,sin(tilt)·R = 椭圆短轴半径 */
  tilt?: number;
  /** 相邻扇形间隙(度),0 为无缝贴合 */
  gap?: number;
  /** 悬停抬升高度(viewBox 单位,悬停扇区顶面上移、壁面加长) */
  hoverLift?: number;
  /** 总量基数,超过数据和时余量留空成缺口;缺省数据和布满全圆 */
  total?: number;
  /** 中心数值(缺省显示合计值,可被 center 插槽覆盖) */
  centerValue?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  colors: () => ['#0194F6', '#00E8F0', '#867EFF', '#53DD80', '#FFCF37', '#FF7723'],
  innerRatio: 0.72,
  thickness: 0.29,
  tilt: 18.7,
  gap: 0,
  hoverLift: 6,
  total: undefined,
  centerValue: undefined,
});

/** 扇形悬停变化,index 为 null 表示移出 */
const emit = defineEmits(['hover-change']);

const total = computed(() => props.data.reduce((acc, cur) => acc + cur.value, 0));

const hoveredIndex = ref<number | null>(null);

/** 悬停抬升补间值(路径几何无法走 CSS transition,用 rAF 逐帧重建几何) */
const liftValue = ref(0);
/** 抬升动画时长(ms) */
const LIFT_DURATION = 250;
let liftRafId = 0;

function animateLift(target: number) {
  cancelAnimationFrame(liftRafId);
  const from = liftValue.value;
  if (from === target) return;
  const start = performance.now();
  const step = (now: number) => {
    const p = Math.min(1, (now - start) / LIFT_DURATION);
    liftValue.value = from + (target - from) * (1 - (1 - p) ** 3);
    if (p < 1) liftRafId = requestAnimationFrame(step);
  };
  liftRafId = requestAnimationFrame(step);
}

onBeforeUnmount(() => cancelAnimationFrame(liftRafId));

const geo = computed(() =>
  buildTorusGeometry(props.data, {
    colors: props.colors,
    innerRatio: props.innerRatio,
    thickness: props.thickness,
    tilt: props.tilt,
    gap: props.gap,
    hoverIndex: hoveredIndex.value,
    hoverLift: liftValue.value,
    total: props.total,
  })
);

const centerStyle = computed(() => ({
  left: `${(geo.value.cx / geo.value.viewBoxW) * 100}%`,
  top: `${(geo.value.cy / geo.value.viewBoxH) * 100}%`,
}));

function handleSegEnter(index: number) {
  if (hoveredIndex.value === index) return;
  hoveredIndex.value = index;
  animateLift(props.hoverLift);
  emit('hover-change', index);
}

function handleSegLeave() {
  if (hoveredIndex.value === null) return;
  hoveredIndex.value = null;
  animateLift(0);
  emit('hover-change', null);
}

/** 外部(如右侧图例)控制扇形悬停 */
function setHovered(index: number | null) {
  if (hoveredIndex.value === index) return;
  hoveredIndex.value = index;
  animateLift(index === null ? 0 : props.hoverLift);
}

defineExpose({ setHovered });
</script>

<style lang="scss" scoped>
.pie-3d-chart {
  position: relative;
  width: 100%;
  height: 100%;
}

.pie-3d-chart__svg {
  display: block;
  width: 100%;
  height: 100%;
  /* 悬停抬升的顶面会超出 viewBox 顶部,放开设溢出可见 */
  overflow: visible;
}

.pie-3d-chart__seg {
  cursor: pointer;

  &.is-hover {
    filter: brightness(1.12);
  }
}

.pie-3d-chart__top {
  /* 段间白色发丝分隔线,对齐设计稿 stroke-opacity 0.4 */
  stroke: rgb(255 255 255 / 40%);
  stroke-width: 0.6;
}

.pie-3d-chart__center {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgb(0 0 0 / 60%);
}

.pie-3d-chart__center-value {
  font-size: 20px;
  font-weight: 600;
  font-family: 'DIN', sans-serif;
  color: #fff;
  line-height: 1.2;
}
</style>
