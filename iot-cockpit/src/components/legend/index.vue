<template>
  <div
    class="legend-item"
    :class="{ 'legend-item--horizontal': direction === 'horizontal' }"
  >
    <span class="legend-item-label">
      <span
        class="legend-item-label-dot"
        :style="{ background: legend.color }"
      />
      <span class="legend-item-label-text">{{ legend.name }}</span>
    </span>
    <span
      v-if="showValue"
      class="legend-item-content"
    >
      <span class="legend-item-content-value font-digital">{{ legend.value }}</span>
      <span
        v-if="unit"
        class="legend-item-content-unit"
      >{{ unit }}</span>
    </span>
  </div>
</template>

<script setup lang="ts" name="LegendItem">
export interface LegendData {
  name: string;
  value: string | number;
  color: string;
}

interface Props {
  legend: LegendData;
  unit?: string;
  direction?: 'vertical' | 'horizontal';
  showValue?: boolean;
}

withDefaults(defineProps<Props>(), {
  unit: '',
  direction: 'vertical',
  showValue: true,
});
</script>

<style lang="scss" scoped>
.legend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  white-space: nowrap;
  color: #fff;
  &-label {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  &-label-dot {
    width: 10px;
    height: 10px;
    margin-right: 6px;
  }
  &-label-text {
    font-size: 16px;
    line-height: 1;
  }
  &-content-value {
    font-size: 40px;
    line-height: 1;
  }
  &-content-unit {
    font-size: 14px;
    line-height: 1;
    margin-left: 4px;
  }
  &--horizontal {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    .legend-item-label {
      margin-bottom: 0;
      margin-right: 8px;
    }
  }
}
</style>
