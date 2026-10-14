/** * 本文件是用于液体填充图表组件的实现 */
<template>
  <div
    class="liquid-chart-container"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <div
      ref="domRef"
      class="liquid-chart"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />
    <div
      class="liquid-chart-content"
      :class="{ 'liquid-chart-content--small': small }"
    >
      <span
        v-if="title"
        class="liquid-chart-content-title"
      >{{ title }}</span>
      <span class="liquid-chart-content-value">
        <span class="liquid-chart-content-value-number font-digital">{{ value.toFixed(1) }}</span>
        <span class="liquid-chart-content-value-unit">%</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts" name="LiquidChart">
import { computed } from 'vue';

import { BASE_COLOR } from '@/constants/chart';
import { useEcharts, type ECOption } from '@/hooks/use-echarts';

interface Props {
  title?: string;
  /** 数值（0-100） */
  value: number;
  size?: number;
  /** 小尺寸模式：缩小中心文字 */
  small?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  size: 200,
  small: false,
});

const option = computed<ECOption>(() => ({
  series: [
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: 'liquidFill' as any,
      data: [props.value / 100],
      // 关闭波浪常驻动画：liquidfill 的波动画是 60fps 无限 Canvas 重绘，
      // 大屏长时间打开会持续占用 CPU
      waveAnimation: false,
      radius: '95%',
      color: [BASE_COLOR.CYAN],
      backgroundStyle: {
        borderWidth: 4, borderColor: BASE_COLOR.CYAN, color: '#10234d'
      },
      label: { show: false },
      outline: { show: false },
    },
  ],
}));

const { domRef } = useEcharts(option);
</script>

<style lang="scss" scoped>
.liquid-chart-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.liquid-chart-content {
  width: 100%;
  height: 100%;
  color: #ffffff;
  color: #ffffff;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  &-title {
    font-size: 18px;
    line-height: 1;
    margin-bottom: 12px;
  }

  &-value {
    display: inline-flex;
    align-items: flex-end;
    justify-content: center;

    &-number {
      font-size: 40px;
      line-height: 1;
    }

    &-unit {
      font-size: 14px;
      margin-left: 2px;
    }
  }

  &--small {
    .liquid-chart-content-title {
      font-size: 12px;
      margin-bottom: 4px;
      white-space: nowrap;
    }

    .liquid-chart-content-value-number {
      font-size: 24px;
    }

    .liquid-chart-content-value-unit {
      font-size: 11px;
    }
  }
}
</style>
