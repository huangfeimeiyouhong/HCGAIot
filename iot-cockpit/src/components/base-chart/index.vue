<template>
  <div
    ref="domRef"
    style="width: 100%; height: 100%"
  />
</template>

<script setup lang="ts" name="BaseChart">
import { computed, watch } from 'vue';

import { useEcharts, type ECOption } from '@/hooks/use-echarts';

interface Props {
  /** 图表配置选项 */
  option: ECOption;
  /** 是否自动高亮饼图最大值扇形 */
  autoHighlight?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  autoHighlight: false,
});

const chartOption = computed<ECOption>(() => props.option);

const renderFun = props.autoHighlight
  ? (chartInstance: Parameters<Parameters<typeof useEcharts>[1]>[0]) => {
    watch(
      () => props.option,
      (option) => {
        const series = (option as { series?: Array<{ type?: string; data?: Array<{ name?: string; value?: number }> }> }).series ?? [];
        series.forEach((s) => {
          if (s.type !== 'pie' || !s.data?.length) return;
          let maxIndex = 0;
          let maxValue = s.data[0].value ?? 0;
          s.data.forEach((item, i) => {
            if ((item.value ?? 0) > maxValue) {
              maxValue = item.value ?? 0;
              maxIndex = i;
            }
          });
          const maxItem = s.data[maxIndex];
          const delay = maxIndex * 50 + 500;
          setTimeout(() => {
            try {
              chartInstance?.dispatchAction({ type: 'highlight', name: maxItem.name });
            } catch {
              /* 动画未完成时忽略 */
            }
          }, delay);
        });
      },
      { immediate: true, deep: true }
    );
  }
  : undefined;

const { domRef } = useEcharts(chartOption, renderFun);
</script>

<style lang="scss" scoped></style>
