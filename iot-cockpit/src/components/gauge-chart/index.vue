/** * 本文件是用于环形指标仪表盘组件的实现 */
<template>
  <div
    class="gauge-chart"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <div
      ref="domRef"
      class="gauge-chart-inner"
    />
    <div
      class="gauge-center"
      :class="{ 'gauge-center--small': small }"
    >
      <div
        v-if="label"
        class="gauge-label"
      >
        {{ label }}
      </div>
      <div class="gauge-value-row">
        <span class="gauge-value font-digital">{{ value }}</span>
        <span
          v-if="unit"
          class="gauge-unit"
        >{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="GaugeChart">
import { computed } from 'vue';

import * as echarts from 'echarts/core';

import { BASE_COLOR } from '@/constants/chart';
import { useEcharts, type ECOption } from '@/hooks/use-echarts';

interface Props {
  label?: string;
  value: number;
  unit?: string;
  max?: number;
  size?: number;
  type?: 'warning' | 'normal';
  lineWidth?: number;
  /** 自定义进度颜色，优先级高于 type */
  color?: string;
  /** 小尺寸模式：缩小中心文字 */
  small?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  unit: '',
  max: 100,
  size: 220,
  type: 'normal',
  lineWidth: 18,
  color: '',
  small: false,
});

const getProgressRatio = () => {
  const safeMax = props.max > 0 ? props.max : 1;
  return Math.max(0, Math.min(props.value / safeMax, 1));
};

const getColor = () =>
  props.color
    ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: props.color },
      { offset: 1, color: props.color },
    ])
    : props.type === 'warning'
      ? new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: BASE_COLOR.ORANGE },
        { offset: 1, color: BASE_COLOR.ORANGE },
      ])
      : new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: BASE_COLOR.CYAN },
        { offset: 1, color: BASE_COLOR.CYAN },
      ]);

const option = computed<ECOption>(() => {
  const color = getColor();
  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge',
        radius: '100%',
        center: ['50%', '50%'],
        progress: {
          show: true, overlap: false, roundCap: true, clip: false, itemStyle: { color }
        },
        pointer: { show: false },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: props.lineWidth,
            color: [[getProgressRatio(), color], [1, 'rgba(255,255,255,0.08)']],
          },
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: { show: false },
        data: [{ value: props.value, name: props.label }],
      },
    ],
  };
});

const { domRef } = useEcharts(option);
</script>

<style lang="scss" scoped>
.gauge-chart {
  position: relative;
  flex-shrink: 0;
}

.gauge-chart-inner {
  width: 100%;
  height: 100%;
}

.gauge-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #ffffff;
}

.gauge-label {
  font-size: 18px;
  margin-top: 0;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  white-space: nowrap;
}

.gauge-value-row {
  display: flex;
  align-items: baseline;
}

.gauge-value {
  font-size: 54px;
  line-height: 1;
  font-weight: 800;
  color: #ffffff;
}

.gauge-unit {
  font-size: 18px;
  margin-left: 4px;
  color: #ffffff;
}

.gauge-center--small {
  .gauge-label {
    font-size: 13px;
  }

  .gauge-value {
    font-size: 30px;
  }

  .gauge-unit {
    font-size: 12px;
    margin-left: 2px;
  }
}

.gauge-sub {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.gauge-sub-label {
  flex-shrink: 0;
}

.gauge-sub-value {
  flex-shrink: 0;
  margin-left: 4px;
  font-weight: 600;
}
</style>
