<template>
  <div class="map-grid">
    <div
      ref="domRef"
      class="map-grid__chart"
    />
  </div>
</template>

<script setup lang="ts" name="MapGrid">
import { computed } from 'vue';

import { registerChinaMap } from '../map-china/geo';
import { MAP_THEME } from '../map-china/theme';

import { PROVINCE_CENTER_MAP, provinceNameOf, toShortName } from '@/constants/map';
import { useEcharts, type ECOption } from '@/hooks/use-echarts';
import { projectData } from '@/views/dashboard/project-data';

/**
 * 网格视角地图(echarts geo 版):聚焦单省 + 项目撒点。
 * 模板零厂商依赖的示例实现——真实项目此处可替换为厂商地图 SDK(百度/高德)获得更精细的
 * 区划边界与网格描边,面板与路由零改动。
 */
interface Props {
  /** 省码(前 2 位,如 '11' = 北京) */
  city?: string;
}

const props = withDefaults(defineProps<Props>(), {
  city: '',
});

const emit = defineEmits(['project-click']);

registerChinaMap();

const provinceFull = computed(() => provinceNameOf(props.city));
const provinceShort = computed(() => toShortName(provinceFull.value));
const center = computed(() => PROVINCE_CENTER_MAP[provinceShort.value]);

/** 视角内项目撒点(mock 组织树带坐标的宗地) */
const scatterData = computed(() =>
  (projectData.value[props.city] ?? [])
    .filter((p) => p.lng !== undefined && p.lat !== undefined)
    .map((p) => ({
      name: p.name,
      value: [p.lng, p.lat],
      projectId: p.id,
    })),
);

const option = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  geo: [
    {
      map: 'china',
      roam: true,
      scaleLimit: { min: 1, max: 12 },
      // 聚焦省份:中心锚点 + 放大;无锚点(未收录省)回落全国视野
      ...(center.value
        ? { center: [center.value.lng, center.value.lat], zoom: 4.5 }
        : { layoutCenter: ['50%', '55%'], layoutSize: '100%', zoom: 1.1 }),
      label: { show: false },
      itemStyle: {
        borderColor: MAP_THEME.provinceBorder,
        borderWidth: MAP_THEME.provinceBorderWidth,
        areaColor: 'transparent',
      },
      emphasis: {
        label: { show: false },
        itemStyle: { areaColor: 'transparent' },
      },
      regions: provinceFull.value
        ? [{
          name: provinceFull.value,
          itemStyle: {
            areaColor: 'rgba(65, 192, 255, 0.08)',
            borderColor: MAP_THEME.hover,
            borderWidth: 1.5,
          },
        }]
        : [],
      select: { disabled: true },
    },
  ],
  series: [
    {
      // 项目撒点:涟漪扩散点,hover 显项目名
      type: 'effectScatter',
      coordinateSystem: 'geo',
      data: scatterData.value,
      symbolSize: 10,
      rippleEffect: { brushType: 'stroke', scale: 3 },
      label: {
        show: true,
        position: 'right',
        formatter: '{b}',
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.6)',
        textShadowBlur: 4,
      },
      itemStyle: {
        color: '#41C0FF',
        shadowColor: 'rgba(65, 192, 255, 0.8)',
        shadowBlur: 8,
      },
      emphasis: {
        label: { color: '#5DEBFF', fontSize: 13, fontWeight: 600 },
        itemStyle: { color: '#5DEBFF' },
      },
      zlevel: 2,
    },
  ],
}));

const { domRef } = useEcharts(option, (chartInstance) => {
  // 点项目撒点 → 抛出项目 id(模板示例:父级接 dispatch/详情;真实项目跳项目详情页)
  chartInstance.on('click', (params: { seriesType?: string; data?: { projectId?: string } }) => {
    if (params.seriesType !== 'effectScatter') return;
    const projectId = params.data?.projectId;
    if (projectId) emit('project-click', projectId);
  });
});
</script>

<style scoped lang="scss">
.map-grid {
  width: 100%;
  height: 100%;

  &__chart {
    width: 100%;
    height: 100%;
  }
}
</style>
