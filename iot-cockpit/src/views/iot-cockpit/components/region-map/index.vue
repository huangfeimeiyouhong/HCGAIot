<!--
 * 区域分布视图(地图面板,中国/福建通用)
 * 省级设备密度着色,福建省高亮为下钻入口;左上叠加统计,底部图例与操作提示
 * 作为下钻入口时(map-name="china"):点击高亮省份跳转 /dashboard/province/:code
-->
<template>
  <div class="region-map">
    <GeoMap
      class="region-map__chart"
      :map-name="mapName"
      :map-json="mapJson"
      :regions="regions"
      :points="points"
      :zoom="zoom"
      :aspect-scale="aspectScale"
      @region-click="onRegionClick"
    />

    <div class="region-map__overlay">
      <div class="overlay-stat">
        <span class="overlay-stat__label">{{ mapName === 'china' ? '接入省份' : '覆盖地市' }}</span>
        <span class="overlay-stat__value font-digital">{{ provinces.length }}</span>
      </div>
      <div class="overlay-stat">
        <span class="overlay-stat__label">覆盖门店</span>
        <span class="overlay-stat__value font-digital">{{ totalStores }}</span>
      </div>
      <div class="overlay-stat">
        <span class="overlay-stat__label">设备总数</span>
        <span class="overlay-stat__value font-digital">{{ totalDevices }}</span>
      </div>
    </div>

    <div class="region-map__legend">
      <span class="region-map__legend-label">设备密度</span>
      <span class="region-map__legend-bar" />
      <span class="region-map__legend-text">低 → 高</span>
    </div>

    <div
      v-if="showDrillHint"
      class="region-map__hint"
    >
      <span class="region-map__hint-dot" />点击高亮省份(福建)可下钻查看地市分布
    </div>
  </div>
</template>

<script setup lang="ts" name="RegionMap">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import chinaGeoJson from '@/assets/map/china.json';
import { IOT_COLORS } from '@/constants/chart';
import GeoMap from '../geo-map/index.vue';
import type { GeoPointDatum, GeoRegionDatum } from '../geo-map/index.vue';
import type { ProvinceDeviceInfo } from '../types';

const props = withDefaults(
  defineProps<{
    provinces: ProvinceDeviceInfo[];
    /** 地图注册名 + GeoJSON(中国传 china,省份下钻传 fujian) */
    mapName?: string;
    mapJson?: unknown;
    /** 门店撒点 */
    points?: GeoPointDatum[];
    zoom?: number;
    /** 宽高比修正(中国地图宽面板用 1.0,福建竖图用 1.0) */
    aspectScale?: number;
    /** 是否显示下钻提示(仅中国地图) */
    showDrillHint?: boolean;
  }>(),
  {
    mapName: 'china',
    mapJson: () => chinaGeoJson,
    points: () => [],
    zoom: 1.02,
    aspectScale: 1.0,
    showDrillHint: true,
  }
);

const router = useRouter();

/** 福建省为当前唯一可下钻省份(接入真实数据后按 highlight 规则放开) */
const DRILLABLE_ADCODE = '35';

const regions = computed<GeoRegionDatum[]>(() =>
  props.provinces.map((p) => ({
    name: p.name,
    devices: p.devices,
    online: p.online,
    stores: p.stores,
    highlight: p.adcode === DRILLABLE_ADCODE,
  }))
);

const totalStores = computed(() => props.provinces.reduce((s, p) => s + p.stores, 0));
const totalDevices = computed(() => props.provinces.reduce((s, p) => s + p.devices, 0));

function onRegionClick(name: string): void {
  if (props.mapName !== 'china') return;
  const province = props.provinces.find((p) => p.name === name);
  if (!province || province.adcode !== DRILLABLE_ADCODE) return;
  router.push(`/dashboard/province/${province.adcode}`);
}
</script>

<style scoped lang="scss">
.region-map {
  position: relative;
  width: 100%;
  height: 100%;

  &__chart {
    position: absolute;
    inset: 0;
  }

  &__overlay {
    position: absolute;
    top: 4px;
    left: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 2;
  }

  &__legend {
    position: absolute;
    right: 12px;
    bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 2;

    &-label {
      font-size: 11px;
      color: rgba(143, 179, 217, 0.85);
    }

    &-bar {
      width: 110px;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(90deg, #0b2b4f 0%, #16507e 50%, #37d4cf 100%);
    }

    &-text {
      font-size: 11px;
      color: rgba(143, 179, 217, 0.85);
    }
  }

  &__hint {
    position: absolute;
    left: 8px;
    bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(143, 179, 217, 0.85);
    z-index: 2;

    &-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: v-bind('IOT_COLORS.GREEN');
      box-shadow: 0 0 6px v-bind('IOT_COLORS.GREEN');
    }
  }
}

.overlay-stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(4, 18, 52, 0.72);
  border: 1px solid rgba(65, 192, 255, 0.22);
  border-radius: 4px;

  &__label {
    font-size: 12px;
    color: rgba(143, 179, 217, 0.9);
  }

  &__value {
    font-size: 20px;
    color: #41c0ff;
  }
}
</style>
