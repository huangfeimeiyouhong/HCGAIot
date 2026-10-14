<!--
 * P2 环境实时监测
 * 2×2 仪表卡片:冷柜温度 / 库房湿度 / 油烟浓度 / 燃气浓度
 * 数值超阈值时仪表变橙并显示告警态
-->
<template>
  <div class="env-monitor">
    <div
      v-for="metric in metrics"
      :key="metric.key"
      class="env-card"
      :class="{ 'env-card--warning': metric.status === 'warning' }"
    >
      <div class="env-card__head">
        <span class="env-card__name">{{ metric.label }}</span>
        <span
          class="env-card__status"
          :style="{ color: metric.status === 'warning' ? IOT_COLORS.ORANGE : IOT_COLORS.GREEN }"
        >
          {{ metric.status === 'warning' ? '超标' : '正常' }}
        </span>
      </div>
      <GaugeChart
        class="env-card__gauge"
        :value="metric.value"
        :unit="metric.unit"
        :max="metric.max"
        :size="118"
        :color="metric.status === 'warning' ? IOT_COLORS.ORANGE : IOT_COLORS.GREEN"
        small
      />
      <div class="env-card__threshold">{{ metric.threshold }}</div>
    </div>
  </div>
</template>

<script setup lang="ts" name="EnvMonitor">
import GaugeChart from '@/components/gauge-chart/index.vue';
import { IOT_COLORS } from '@/constants/chart';
import type { EnvMetric } from '@/views/iot-cockpit/types';

defineProps<{
  metrics: EnvMetric[];
}>();
</script>

<style scoped lang="scss">
.env-monitor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.env-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 10px 6px 8px;
  background: rgba(65, 192, 255, 0.06);
  border: 1px solid rgba(65, 192, 255, 0.18);
  border-radius: 6px;
  transition: border-color 0.3s;

  &--warning {
    background: rgba(250, 140, 22, 0.08);
    border-color: rgba(250, 140, 22, 0.45);
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    justify-content: center;
  }

  &__name {
    font-size: 14px;
    color: #e6f1ff;
    white-space: nowrap;
  }

  &__status {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.08);
    white-space: nowrap;
  }

  &__gauge {
    margin: 2px 0;
  }

  &__threshold {
    font-size: 11px;
    color: rgba(143, 179, 217, 0.75);
    white-space: nowrap;
  }
}
</style>
