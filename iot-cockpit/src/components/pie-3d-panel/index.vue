<template>
  <div class="pie-3d-panel">
    <!-- 左侧 3D 饼图(发光底座 + 环形饼图 + 顶部标签) -->
    <div
      class="pie-3d-panel__chart"
      :style="{ width: chartWidth, height: chartHeight }"
    >
      <img
        v-if="showBase"
        class="pie-3d-panel__base"
        :src="baseImg"
        alt=""
      >
      <Pie3dChart
        ref="chartRef"
        class="pie-3d-panel__ring"
        :data="data"
        :colors="colors"
        :inner-ratio="innerRatio"
        :thickness="thickness"
        :tilt="tilt"
        :gap="gap"
        :total="total"
        :center-value="centerValue"
        @hover-change="handleChartHover"
      >
        <template #center="scope">
          <slot
            name="center"
            v-bind="scope"
          />
        </template>
      </Pie3dChart>
      <div class="pie-3d-panel__label">
        <slot name="label" />
      </div>
    </div>

    <!-- 右侧内容区:默认图例列表,可通过插槽整体替换 -->
    <div class="pie-3d-panel__content">
      <slot
        :items="legendItems"
        :active-index="activeIndex"
        :set-active="setActive"
      >
        <ul class="pie-3d-panel__legend">
          <li
            v-for="(item, index) in legendItems"
            :key="item.name"
            class="pie-3d-panel__legend-item"
            :class="{ 'is-active': activeIndex === index }"
            @mouseenter="setActive(index)"
            @mouseleave="setActive(null)"
          >
            <slot
              name="item"
              :item="item"
              :index="index"
              :active="activeIndex === index"
            >
              <span
                class="pie-3d-panel__legend-color"
                :style="{
                  backgroundColor: item.color,
                  boxShadow: `2.55px 2.55px 5.1px 0px ${item.color}80`,
                }"
              />
              <span class="pie-3d-panel__legend-name">{{ item.name }}</span>
              <span
                v-if="showPercent"
                class="pie-3d-panel__legend-percent"
              >
                <span class="pie-3d-panel__legend-num">{{ item.percent.toFixed(2) }}</span>
                <span class="pie-3d-panel__legend-sign">%</span>
              </span>
              <span
                v-if="showValue"
                class="pie-3d-panel__legend-unit"
              >
                <span :style="{ color: item.color }">{{ item.value }}</span>{{ unit }}
              </span>
            </slot>
          </li>
        </ul>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts" name="Pie3dPanel">
import { computed, ref } from 'vue';

import type { Pie3dDataItem } from '@/components/pie-3d-chart/torus';

import baseImg from '@/assets/images/components/chat/ic-footer.png';
import Pie3dChart from '@/components/pie-3d-chart/index.vue';
import { accurateSum, allocatePercents } from '@/utils/decimal';

export interface Pie3dLegendItem extends Pie3dDataItem {
  color: string;
  /** 占比(0 ~ 100,两位小数,合计恒为 100) */
  percent: number;
}

interface Props {
  /** 数据,格式:[{ name: '名称', value: 数值 }] */
  data?: Pie3dDataItem[];
  /** 系列色板 */
  colors?: string[];
  /** 左侧饼图区域宽度 */
  chartWidth?: string;
  /** 左侧饼图区域高度(与 viewBox 等比 104:59 时环形不变形) */
  chartHeight?: string;
  /** 内径 / 外径(0 ~ 1) */
  innerRatio?: number;
  /** 厚度 / 外径(0 ~ 1) */
  thickness?: number;
  /** 俯仰角(度) */
  tilt?: number;
  /** 相邻扇形间隙(度),0 为无缝贴合 */
  gap?: number;
  /** 总量基数,超过数据和时余量留空成缺口;缺省数据和布满全圆 */
  total?: number;
  /** 是否显示饼图下方发光底座 */
  showBase?: boolean;
  /** 饼图中心数值(标签用 label 插槽、数值内容用 center 插槽实现) */
  centerValue?: number | string;
  /** 图例是否显示百分比 */
  showPercent?: boolean;
  /** 图例是否显示原始数值 */
  showValue?: boolean;
  /** 原始数值单位 */
  unit?: string;
  /** 是否开启图例与饼图的悬停联动 */
  hoverable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  colors: () => ['#0194F6', '#00E8F0', '#867EFF', '#53DD80', '#FFCF37', '#FF7723'],
  chartWidth: '104px',
  chartHeight: '51px',
  innerRatio: 0.72,
  thickness: 0.29,
  tilt: 18.7,
  gap: 0,
  total: undefined,
  showBase: true,
  centerValue: undefined,
  showPercent: true,
  showValue: true,
  unit: '',
  hoverable: true,
});

const chartRef = ref<InstanceType<typeof Pie3dChart>>();

const total = computed(() => accurateSum(props.data.map(item => item.value)));

const legendItems = computed<Pie3dLegendItem[]>(() => {
  const percents = allocatePercents(props.data.map(item => item.value));
  return props.data.map((item, index) => ({
    ...item,
    color: props.colors[index % props.colors.length],
    percent: percents[index],
  }));
});

const activeIndex = ref<number | null>(null);

/** 设置当前高亮项并联动饼图(供插槽内容复用) */
function setActive(index: number | null) {
  activeIndex.value = index;
  if (props.hoverable) {
    chartRef.value?.setHovered(index);
  }
}

function handleChartHover(index: number | null) {
  activeIndex.value = index;
}
</script>

<style lang="scss" scoped>
.pie-3d-panel {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
}

.pie-3d-panel__chart {
  position: relative;
  flex-shrink: 0;
  align-self: center;
}

.pie-3d-panel__base {
  position: absolute;
  left: 50%;
  top: 88%;
  width: 131%;
  /* ic-footer 内发光椭圆中心位于图高 63.4% 处,上移后椭圆中心对齐锚点(饼图前缘下方) */
  transform: translate(-50%, -63.4%);
  pointer-events: none;
}

.pie-3d-panel__ring {
  position: relative;
  z-index: 1;
}

.pie-3d-panel__label {
  position: absolute;
  left: 0;
  top: -22px;
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: rgb(255 255 255 / 80%);
  line-height: 1.3;
  pointer-events: none;
}

.pie-3d-panel__content {
  flex: 1;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.pie-3d-panel__legend {
  display: flex;
  flex-direction: column;
  // 垂直居中交由外层 __content 的 justify-content: center(短列表 ul 高=内容高,居中效果相同);
  // 此处再 center 会让超高列表上下对称溢出,顶端条目落在滚动原点之上永远滚不到
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
  overflow-y: auto;
}

.pie-3d-panel__legend-item {
  display: flex;
  align-items: center;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &.is-active {
    background-color: rgb(255 255 255 / 8%);
  }
}

.pie-3d-panel__legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.pie-3d-panel__legend-name {
  margin-left: 6px;
  font-size: 12px;
  color: #fff;
  flex: 1.2;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pie-3d-panel__legend-percent {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
}

.pie-3d-panel__legend-num {
  font-size: 14px;
  font-weight: 600;
  font-family: 'DIN', sans-serif;
  color: #fff;
  line-height: 1;
}

.pie-3d-panel__legend-sign {
  font-size: 10px;
  color: rgb(255 255 255 / 80%);
}

.pie-3d-panel__legend-unit {
  flex: 0.8;
  font-size: 10px;
  color: rgb(255 255 255 / 80%);
  text-align: right;
  min-width: 0;

  span {
    font-family: 'DIN', sans-serif;
    font-size: 14px;
    font-weight: 600;
    margin-right: 2px;
  }
}
</style>
