<!--
 * P4 实时指标图表
 * 左:设备在线率趋势(24h 折线 + 渐变面积)
 * 右:今日告警趋势(24h 柱状)
-->
<template>
  <div class="realtime-charts">
    <div class="chart-block">
      <div class="chart-block__head">
        <span class="chart-block__title">设备在线率趋势</span>
        <span class="chart-block__badge">当前 {{ latest.onlineRate }}%</span>
      </div>
      <BaseChart
        class="chart-block__chart"
        :option="rateOption"
      />
    </div>
    <div class="chart-block">
      <div class="chart-block__head">
        <span class="chart-block__title">今日告警趋势</span>
        <span class="chart-block__badge chart-block__badge--warn">累计 {{ totalAlarms }} 条</span>
      </div>
      <BaseChart
        class="chart-block__chart"
        :option="alarmOption"
      />
    </div>
  </div>
</template>

<script setup lang="ts" name="RealtimeCharts">
import { computed } from 'vue';

import BaseChart from '@/components/base-chart/index.vue';
import type { ECOption } from '@/hooks/use-echarts';
import { IOT_COLORS } from '@/constants/chart';
import type { TrendPoint } from '@/views/iot-cockpit/types';

const props = defineProps<{
  trend: TrendPoint[];
}>();

const latest = computed(() => props.trend[props.trend.length - 1] ?? { time: '', onlineRate: 0, alarms: 0 });
const totalAlarms = computed(() => props.trend.reduce((s, p) => s + p.alarms, 0));

const axisCommon = {
  axisLine: { lineStyle: { color: 'rgba(143, 179, 217, 0.35)' } },
  axisTick: { show: false },
  axisLabel: { color: 'rgba(143, 179, 217, 0.85)', fontSize: 10 },
  splitLine: { lineStyle: { color: 'rgba(143, 179, 217, 0.12)' } },
};

const tooltipCommon = {
  trigger: 'axis' as const,
  backgroundColor: 'rgba(4, 18, 52, 0.92)',
  borderColor: 'rgba(65, 192, 255, 0.35)',
  textStyle: { color: IOT_COLORS.TEXT, fontSize: 12 },
};

const rateOption = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    ...tooltipCommon,
    valueFormatter: (v: number) => `${v}%`,
  },
  grid: { left: 40, right: 12, top: 16, bottom: 22 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.trend.map((p) => p.time),
    ...axisCommon,
    axisLabel: { ...axisCommon.axisLabel, interval: 3 },
  },
  yAxis: {
    type: 'value',
    min: 94,
    max: 100,
    ...axisCommon,
    axisLabel: { ...axisCommon.axisLabel, formatter: '{value}%' },
  },
  series: [
    {
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: IOT_COLORS.PRIMARY },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(65, 192, 255, 0.35)' },
            { offset: 1, color: 'rgba(65, 192, 255, 0.02)' },
          ],
        },
      },
      data: props.trend.map((p) => p.onlineRate),
    },
  ],
}));

const alarmOption = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    ...tooltipCommon,
    valueFormatter: (v: number) => `${v} 条`,
  },
  grid: { left: 36, right: 12, top: 16, bottom: 22 },
  xAxis: {
    type: 'category',
    data: props.trend.map((p) => p.time),
    ...axisCommon,
    axisLabel: { ...axisCommon.axisLabel, interval: 3 },
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    ...axisCommon,
  },
  series: [
    {
      type: 'bar',
      barMaxWidth: 8,
      itemStyle: {
        borderRadius: [2, 2, 0, 0],
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#37D4CF' },
            { offset: 1, color: 'rgba(55, 212, 207, 0.15)' },
          ],
        },
      },
      data: props.trend.map((p) => p.alarms),
    },
  ],
}));
</script>

<style scoped lang="scss">
.realtime-charts {
  display: flex;
  gap: 12px;
  width: 100%;
  height: 100%;
}

.chart-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 26px;
    flex-shrink: 0;
  }

  &__title {
    font-size: 15px;
    color: #e6f1ff;
    font-weight: 600;

    &::before {
      content: '';
      display: inline-block;
      width: 3px;
      height: 12px;
      margin-right: 6px;
      vertical-align: -1px;
      background: #41c0ff;
      border-radius: 2px;
    }
  }

  &__badge {
    font-size: 11px;
    color: #41c0ff;
    padding: 2px 8px;
    border: 1px solid rgba(65, 192, 255, 0.4);
    border-radius: 10px;
    background: rgba(65, 192, 255, 0.1);
    white-space: nowrap;

    &--warn {
      color: #37d4cf;
      border-color: rgba(55, 212, 207, 0.4);
      background: rgba(55, 212, 207, 0.1);
    }
  }

  &__chart {
    flex: 1;
    min-height: 0;
  }
}
</style>
