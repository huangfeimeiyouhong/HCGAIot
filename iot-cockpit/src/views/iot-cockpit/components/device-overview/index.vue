<!--
 * P1 设备状态总览
 * 上部:4 项核心指标(总数/在线/离线/今日告警)
 * 下部:五大平台线设备占比环形图(中心总数叠加)
-->
<template>
  <div class="device-overview">
    <div class="kpi-row">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="kpi-chip"
      >
        <div class="kpi-chip__label">{{ kpi.label }}</div>
        <div
          class="kpi-chip__value font-digital"
          :style="{ color: kpi.color }"
        >
          {{ kpi.value }}
        </div>
        <div class="kpi-chip__sub">{{ kpi.sub }}</div>
      </div>
    </div>

    <div class="donut-wrap">
      <div class="donut-center">
        <div class="donut-center__value font-digital">{{ summary.total }}</div>
        <div class="donut-center__label">设备总数</div>
      </div>
      <BaseChart
        class="donut-chart"
        :option="donutOption"
      />
    </div>
  </div>
</template>

<script setup lang="ts" name="DeviceOverview">
import { computed } from 'vue';

import BaseChart from '@/components/base-chart/index.vue';
import type { ECOption } from '@/hooks/use-echarts';
import { IOT_COLORS } from '@/constants/chart';
import { PLATFORM_COLORS } from '@/views/iot-cockpit/data';
import type { DeviceSummary, PlatformShareItem } from '@/views/iot-cockpit/types';

const props = defineProps<{
  summary: DeviceSummary;
  share: PlatformShareItem[];
}>();

const kpis = computed(() => [
  {
    label: '设备总数',
    value: props.summary.total,
    sub: '五大平台线',
    color: IOT_COLORS.TEXT,
  },
  {
    label: '在线设备',
    value: props.summary.online,
    sub: `在线率 ${props.summary.onlineRate}%`,
    color: IOT_COLORS.GREEN,
  },
  {
    label: '离线设备',
    value: props.summary.offline,
    sub: '需运维关注',
    color: IOT_COLORS.GRAY,
  },
  {
    label: '今日告警',
    value: props.summary.alarmToday,
    sub: '较昨日 +2',
    color: IOT_COLORS.ORANGE,
  },
]);

const donutOption = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(4, 18, 52, 0.92)',
    borderColor: 'rgba(65, 192, 255, 0.35)',
    textStyle: { color: IOT_COLORS.TEXT, fontSize: 12 },
    formatter: (p: { name: string; value: number; percent: number }) =>
      `${p.name}: ${p.value} 台 (${p.percent}%)`,
  },
  legend: {
    orient: 'vertical',
    right: 4,
    top: 'center',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 10,
    textStyle: { color: IOT_COLORS.TEXT_DIM, fontSize: 12, lineHeight: 14 },
    formatter: (name: string) => {
      const item = props.share.find((s) => s.name === name);
      return item ? `${name}  ${item.value}` : name;
    },
    data: props.share.map((s) => s.name),
  },
  color: PLATFORM_COLORS,
  series: [
    {
      type: 'pie',
      radius: ['58%', '80%'],
      center: ['32%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: '#041234', borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      emphasis: {
        scale: true,
        scaleSize: 4,
        label: { show: false },
      },
      data: props.share,
    },
  ],
}));
</script>

<style scoped lang="scss">
.device-overview {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.kpi-row {
  display: flex;
  gap: 6px;
  height: 76px;
  flex-shrink: 0;

  .kpi-chip {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background: rgba(65, 192, 255, 0.07);
    border: 1px solid rgba(65, 192, 255, 0.18);
    border-radius: 6px;

    &__label {
      font-size: 12px;
      color: #8fb3d9;
      white-space: nowrap;
    }

    &__value {
      font-size: 26px;
      line-height: 1.1;
    }

    &__sub {
      font-size: 10px;
      color: rgba(143, 179, 217, 0.7);
      white-space: nowrap;
    }
  }
}

.donut-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  margin-top: 10px;

  .donut-center {
    position: absolute;
    left: 32%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: none;
    z-index: 1;

    /* 抵消 chart 容器默认定位,与饼图 center ['32%','50%'] 对齐 */
    &__value {
      font-size: 30px;
      line-height: 1;
      color: #e6f1ff;
    }

    &__label {
      margin-top: 4px;
      font-size: 12px;
      color: #8fb3d9;
    }
  }

  .donut-chart {
    width: 100%;
    height: 100%;
  }
}
</style>
