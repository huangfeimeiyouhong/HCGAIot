<template>
  <div
    ref="domRef"
    class="hi-base-chart"
    :style="{ width: width, height: height }"
  />
</template>

<script setup lang="ts" name="BaseChart">
import { computed } from 'vue';

import { useEcharts, type ECOption } from '@/hooks/use-echarts';

interface Props {
  /** 图表配置选项 */
  option: ECOption;
  /** 容器宽 */
  width?: string;
  /** 容器高 */
  height?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '100%',
});

const chartOption = computed<ECOption>(() => props.option);

const { domRef } = useEcharts(chartOption);
</script>

<style scoped lang="scss">
.hi-base-chart {
  min-height: 0;
  // 容器必须显式有高度，否则 useEcharts 的 useElementSize 拿不到尺寸、图表不会 init
  width: 100%;
}
</style>