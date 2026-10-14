<!--
 * 通用地理地图组件(echarts geo + GeoJSON,零地图厂商依赖)
 * 用法示例(在页面脚本中):
 *   import chinaGeoJson from '@/assets/map/china.json';
 *   <GeoMap map-name="china" :map-json="chinaGeoJson" :regions="regionData" @region-click="onClick" />
 * 说明:regions 数据项 name 须与 GeoJSON properties.name 完全一致;
 *       highlight 项用品牌绿高亮(可点击下钻的入口)。
-->
<template>
  <div class="geo-map">
    <div
      ref="domRef"
      class="geo-map__chart"
    />
  </div>
</template>

<script setup lang="ts" name="GeoMap">
import { computed, onMounted } from 'vue';
import * as echarts from 'echarts/core';

import { useEcharts, type ECOption } from '@/hooks/use-echarts';
import { IOT_COLORS } from '@/constants/chart';

export interface GeoRegionDatum {
  /** 与 GeoJSON properties.name 对齐(如 福建省 / 福州市) */
  name: string;
  devices: number;
  online: number;
  stores?: number;
  /** 是否高亮(下钻入口) */
  highlight?: boolean;
}

export interface GeoPointDatum {
  name: string;
  /** [lng, lat] */
  value: [number, number, number];
  devices: number;
  online: number;
}

interface Props {
  mapName: string;
  mapJson: unknown;
  regions: GeoRegionDatum[];
  /** 门店撒点(可选) */
  points?: GeoPointDatum[];
  /** 地图可视中心(百分比) */
  center?: [string, string];
  /** 地图缩放 */
  zoom?: number;
  /** 宽高比修正:值越大地图越高(默认 echarts 0.75,宽面板建议 1.0 附近) */
  aspectScale?: number;
  /** 是否显示无数据区域名 */
  showEmptyLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  points: () => [],
  center: () => ['50%', '52%'],
  zoom: 1.1,
  aspectScale: 0.75,
  showEmptyLabel: false,
});

const emit = defineEmits<{
  (e: 'region-click', name: string): void;
}>();

/** GeoJSON 幂等注册 */
onMounted(() => {
  if (!echarts.getMap(props.mapName)) {
    echarts.registerMap(
      props.mapName,
      props.mapJson as Parameters<typeof echarts.registerMap>[1]
    );
  }
});

const maxDevices = computed(() =>
  Math.max(1, ...props.regions.map((r) => r.devices))
);

/** 按设备数在 MAP_EMPTY → MAP_HIGH 之间取色 */
function regionColor(devices: number): string {
  if (devices <= 0) return IOT_COLORS.MAP_EMPTY;
  const ratio = Math.min(devices / maxDevices.value, 1);
  // 手动三段插值:EMPTY(11,43,79) → LOW(22,80,126) → HIGH(55,212,207)
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
  const stops = [
    [11, 43, 79],
    [22, 80, 126],
    [55, 212, 207],
  ];
  const seg = ratio < 0.5 ? 0 : 1;
  const t = ratio < 0.5 ? ratio / 0.5 : (ratio - 0.5) / 0.5;
  const [r1, g1, b1] = stops[seg];
  const [r2, g2, b2] = stops[seg + 1];
  return `rgb(${lerp(r1, r2, t)}, ${lerp(g1, g2, t)}, ${lerp(b1, b2, t)})`;
}

/** 有数据区域名 → 数据项(供 tooltip 查询) */
const regionByName = computed(() => {
  const m: Record<string, GeoRegionDatum> = {};
  props.regions.forEach((r) => {
    m[r.name] = r;
  });
  return m;
});

const option = computed<ECOption>(() => {
  const regions = props.regions.map((r) => ({
    name: r.name,
    itemStyle: {
      areaColor: r.highlight ? 'rgba(7, 193, 96, 0.38)' : regionColor(r.devices),
      borderColor: r.highlight ? IOT_COLORS.GREEN : 'rgba(127, 148, 238, 0.55)',
      borderWidth: r.highlight ? 2 : 1,
    },
    label: {
      show: r.devices > 0 || props.showEmptyLabel,
      color: '#E6F1FF',
      fontSize: 12,
    },
  }));

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(4, 18, 52, 0.92)',
      borderColor: 'rgba(65, 192, 255, 0.35)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: IOT_COLORS.TEXT, fontSize: 12 },
      formatter: (params: { name?: string; seriesType?: string }) => {
        const name = params.name ?? '';
        if (params.seriesType === 'effectScatter') return '';
        const r = regionByName.value[name];
        if (!r) return `${name}<br style="line-height:18px"/><span style="color:#8FB3D9">暂无设备接入</span>`;
        return [
          `<span style="color:#41C0FF">${r.name}</span>`,
          `设备总数:${r.devices} · 在线:${r.online}`,
          r.stores !== undefined ? `覆盖门店:${r.stores}` : '',
        ]
          .filter(Boolean)
          .join('<br style="line-height:18px"/>');
      },
    },
    geo: {
      map: props.mapName,
      roam: true,
      scaleLimit: { min: 0.8, max: 4 },
      layoutCenter: props.center,
      layoutSize: '100%',
      zoom: props.zoom,
      aspectScale: props.aspectScale,
      label: { show: false },
      itemStyle: {
        areaColor: IOT_COLORS.MAP_EMPTY,
        borderColor: 'rgba(127, 148, 238, 0.55)',
        borderWidth: 1,
      },
      emphasis: {
        label: { show: true, color: '#FFFFFF', fontSize: 13 },
        itemStyle: {
          areaColor: 'rgba(65, 192, 255, 0.45)',
          borderColor: IOT_COLORS.PRIMARY,
          borderWidth: 2,
        },
      },
      regions,
      select: { disabled: true },
    },
    series: props.points.length
      ? [
          {
            type: 'effectScatter',
            coordinateSystem: 'geo',
            silent: true,
            zlevel: 2,
            rippleEffect: { brushType: 'stroke', scale: 3, period: 4 },
            symbolSize: 6,
            itemStyle: {
              color: IOT_COLORS.GREEN,
              shadowBlur: 8,
              shadowColor: IOT_COLORS.GREEN,
            },
            data: props.points,
          },
        ]
      : [],
  };
});

const { domRef } = useEcharts(option, (chartInstance) => {
  // 调试钩子:自动化测试/控制台可通过 __geoChart 做 convertToPixel 等操作
  (window as unknown as { __geoChart?: unknown }).__geoChart = chartInstance;
  chartInstance.on('click', (params: { componentType?: string; name?: string }) => {
    if (params.componentType !== 'geo' || !params.name) return;
    emit('region-click', params.name);
  });
});
</script>

<style scoped lang="scss">
.geo-map {
  width: 100%;
  height: 100%;

  &__chart {
    width: 100%;
    height: 100%;
  }
}
</style>
