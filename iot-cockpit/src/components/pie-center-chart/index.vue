<template>
  <div
    class="pie-chart"
    :style="{ height: props.chartHeight }"
  >
    <div
      class="chart-title"
      :style="{ left: `calc(${props.width} / 2)`, top: `calc(${props.height} / 2 - 35px)`}"
    >
      <div :style="{ fontWeight: 800 }">
        <div style="margin-top: 50px">
          <div>{{ props.sumTitle }}</div>
          <div>{{ sum.toFixed(1) }}<span class="font-mini font-dark">{{ props.sumUnit }}</span></div>
        </div>
      </div>
    </div>
    <div
      ref="domRef"
      class="pie-chart"
      :style="{ width: props.width, height: props.height }"
    />
  </div>
</template>

<script setup lang="ts" name="PieCenterChart">
import { computed } from 'vue';

import { useEcharts, type ECOption } from '@/hooks/use-echarts';

interface PieDataItem {
  name: string;
  value: number;
  unit?: string;
}

interface Props {
  data: PieDataItem[];
  chartHeight?: string;
  color?: string[];
  sumUnit?: string;
  sumTitle?: string;
  width?: string;
  height?: string;
  legendFontSize?: number;
  legendData?: string[] | string[][];
  legendGroupWidth?: string[];
  legendTop?: string;
}

const props = withDefaults(defineProps<Props>(), {
  chartHeight: '30vh',
  color: () => [],
  sumUnit: '亿',
  sumTitle: '总面积',
  width: '20vw',
  height: '30vh',
  legendFontSize: 12,
  legendData: () => [],
  legendGroupWidth: () => [],
  legendTop: 'bottom',
});

const sum = computed(() => props.data.reduce((pre, cur) => pre + cur.value, 0));

const option = computed<ECOption>(() => {
  const legend: Record<string, unknown>[] = [];
  const first = Array.isArray(props.legendData[0]) ? (props.legendData as string[][]) : null;

  if (!first && props.legendData.length === 1) {
    legend.push({
      top: props.legendTop,
      left: 'left',
      itemWidth: 5,
      itemHeight: 5,
      formatter: (params: string) => {
        const d = props.data.find((item) => item.name === params);
        return d ? `${d.name}: ${((d.value / sum.value) * 100).toFixed(0)}%` : params;
      },
      textStyle: { fontSize: props.legendFontSize || 12, color: '#fff', lineHeight: 30 },
      data: props.legendData,
    });
  } else if (first) {
    for (let i = 0; i < props.legendGroupWidth.length; i++) {
      legend.push({
        top: props.legendTop,
        left: props.legendGroupWidth[i],
        orient: 'vertical',
        itemWidth: 5,
        itemHeight: 5,
        formatter: (params: string) => {
          const d = props.data.find((item) => item.name === params);
          return d ? `${d.name}: ${((d.value / sum.value) * 100).toFixed(0)}%` : params;
        },
        textStyle: { fontSize: props.legendFontSize || 12, color: '#fff', lineHeight: 30 },
        data: first[i],
      });
    }
  }

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number; percent: number }) => {
        const d = props.data.find((item) => item.name === params.name);
        return `${params.name}: ${params.value}${d?.unit ?? ''} (${params.percent}%)`;
      },
    },
    legend,
    color: props.color,
    animation: false,
    series: [
      {
        name: '任务状态',
        type: 'pie',
        radius: '70%',
        center: ['50%', '40%'],
        label: { show: false, position: 'center' },
        emphasis: {
          label: {
            color: '#000',
            show: false,
            fontSize: 18,
            lineHeight: 30,
            formatter: (params: { name: string; percent: number }) => `${params.name}\n${params.percent.toFixed(0)}%`,
          },
        },
        labelLine: { show: false },
        data: props.data,
      },
    ],
  };
});

const { domRef } = useEcharts(option);
</script>

<style scoped>
.pie-chart {
  width: 18vw;
  height: 30vh;
  position: relative;
}
.chart-title {
  position: absolute;
  left: 50%;
  margin-top: -75px;
  margin-left: -75px;
  background: rgba(255, 255, 255, 0.8);
  width: 150px;
  height: 150px;
  display: flex;
  justify-items: center;
  flex-direction: column;
  text-align: center;
  border-radius: 100%;
  z-index: 1;
}
</style>
