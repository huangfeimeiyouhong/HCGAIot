<!--
 * 省份下钻页(中国地图点击福建省进入)
 * 左栏:省份设备概要 + 地市设备分布(横向条形)
 * 中栏:福建省地图 + 门店撒点
 * 右栏:门店在线明细列表
-->
<template>
  <div class="iot-province">
    <div class="iot-province__col iot-province__col--left">
      <PanelCard
        title="省份设备概要"
        class="panel panel--summary"
      >
        <div class="province-kpi">
          <div
            v-for="kpi in kpis"
            :key="kpi.label"
            class="province-kpi__item"
          >
            <div
              class="province-kpi__value font-digital"
              :style="{ color: kpi.color }"
            >
              {{ kpi.value }}
            </div>
            <div class="province-kpi__label">{{ kpi.label }}</div>
          </div>
        </div>
      </PanelCard>
      <PanelCard
        title="地市设备分布"
        class="panel panel--cities"
      >
        <BaseChart
          class="city-chart"
          :option="cityOption"
        />
      </PanelCard>
    </div>

    <div class="iot-province__col iot-province__col--center">
      <PanelCard
        :title="`${provinceName} · 设备分布`"
        class="panel panel--map"
      >
        <RegionMap
          :provinces="[currentProvince]"
          :map-name="'fujian'"
          :map-json="fujianGeoJson"
          :points="mapPoints"
          :zoom="1.05"
          :aspect-scale="1.0"
          :show-drill-hint="false"
        />
      </PanelCard>
    </div>

    <div class="iot-province__col iot-province__col--right">
      <PanelCard
        title="门店在线明细"
        class="panel panel--stores"
      >
        <div class="store-list">
          <div
            v-for="store in stores"
            :key="store.name"
            class="store-item"
          >
            <div class="store-item__main">
              <span class="store-item__name">{{ store.name }}</span>
              <span class="store-item__city">{{ store.city }}</span>
            </div>
            <div class="store-item__meta">
              <span class="store-item__devices">{{ store.devices }} 台设备</span>
              <span
                class="store-item__rate"
                :style="{ color: store.online / store.devices >= 0.95 ? IOT_COLORS.GREEN : IOT_COLORS.ORANGE }"
              >
                在线 {{ Math.round((store.online / store.devices) * 100) }}%
              </span>
            </div>
            <div class="store-item__bar">
              <span
                class="store-item__bar-inner"
                :style="{ width: `${(store.online / store.devices) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts" name="IotProvince">
import { computed, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import BaseChart from '@/components/base-chart/index.vue';
import PanelCard from '@/components/panel-card/index.vue';
import type { ECOption } from '@/hooks/use-echarts';
import { usePolling } from '@/hooks/use-polling';
import { iotApi } from '@/api/iot';
import { IOT_COLORS } from '@/constants/chart';
import { provinceNameOf } from '@/constants/map';
import fujianGeoJson from '@/assets/map/fujian.json';
import RegionMap from './components/region-map/index.vue';
import type { GeoPointDatum } from './components/geo-map/index.vue';
import type { ProvinceDetail, ProvinceDeviceInfo, StorePoint } from './types';
import { useAppStore } from '@/store/app';

const route = useRoute();
const appStore = useAppStore();
const adcode = computed(() => String(route.params.code ?? '35'));
const provinceName = computed(() => provinceNameOf(adcode.value) || '福建省');

const detail = ref<ProvinceDetail>({
  summary: { total: 0, online: 0, offline: 0, alarmToday: 0, onlineRate: 0 },
  cities: [],
  stores: [],
});

/** 当前省份(供 RegionMap 消费;mock 阶段仅福建有下级数据) */
const currentProvince = computed<ProvinceDeviceInfo>(() => ({
  name: provinceName.value,
  shortName: provinceName.value.replace(/省$/, ''),
  adcode: adcode.value,
  devices: detail.value.summary.total,
  online: detail.value.summary.online,
  stores: detail.value.stores.length,
}));

/** 地图撒点(门店) */
const mapPoints = computed<GeoPointDatum[]>(() =>
  detail.value.stores.map((s) => ({
    name: s.name,
    value: [s.lng, s.lat, s.devices] as [number, number, number],
    devices: s.devices,
    online: s.online,
  }))
);

/** 门店列表按设备数降序 */
const stores = computed<StorePoint[]>(() =>
  [...detail.value.stores].sort((a, b) => b.devices - a.devices)
);

const kpis = computed(() => [
  {
    label: '设备总数',
    value: detail.value.summary.total,
    color: IOT_COLORS.TEXT,
  },
  {
    label: '在线设备',
    value: detail.value.summary.online,
    color: IOT_COLORS.GREEN,
  },
  {
    label: '覆盖门店',
    value: detail.value.stores.length,
    color: IOT_COLORS.PRIMARY,
  },
  {
    label: '今日告警',
    value: detail.value.summary.alarmToday,
    color: IOT_COLORS.ORANGE,
  },
]);

/** 地市设备分布(横向条形,按设备数降序) */
const cityOption = computed<ECOption>(() => {
  const cities = [...detail.value.cities].sort((a, b) => b.devices - a.devices);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(4, 18, 52, 0.92)',
      borderColor: 'rgba(65, 192, 255, 0.35)',
      textStyle: { color: IOT_COLORS.TEXT, fontSize: 12 },
      formatter: (params: { name: string; dataIndex: number }[]) => {
        const p = params[0];
        if (!p) return '';
        const city = cities[p.dataIndex];
        return `${city.name}<br/>设备:${city.devices} 台 · 在线:${city.online} 台<br/>门店:${city.stores} 家`;
      },
    },
    grid: { left: 8, right: 44, top: 8, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: cities.map((c) => c.shortName),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(230, 241, 255, 0.9)', fontSize: 12 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 10,
        showBackground: true,
        backgroundStyle: { color: 'rgba(65, 192, 255, 0.08)', borderRadius: 5 },
        itemStyle: {
          borderRadius: 5,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#16507E' },
              { offset: 1, color: '#41C0FF' },
            ],
          },
        },
        label: {
          show: true,
          position: 'right',
          color: '#8FB3D9',
          fontSize: 11,
          formatter: '{c}',
        },
        data: cities.map((c) => c.devices),
      },
    ],
  };
});

async function loadDetail(): Promise<void> {
  detail.value = await iotApi.getProvinceDetail(adcode.value);
}

function setTitle(): void {
  appStore.pageTitle = `${provinceName.value} · 设备分布`;
}
function clearTitle(): void {
  if (appStore.pageTitle.startsWith(provinceName.value)) {
    appStore.pageTitle = '';
  }
}

onMounted(() => {
  setTitle();
  loadDetail();
});
onActivated(setTitle);
onDeactivated(clearTitle);
onBeforeUnmount(clearTitle);

usePolling(loadDetail, 60 * 1000);
</script>

<style scoped lang="scss">
.iot-province {
  display: flex;
  gap: 20px;
  width: 100%;
  height: 100%;

  &__col {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
    height: 100%;

    &--left {
      width: 580px;
      flex-shrink: 0;
    }

    &--center {
      flex: 1;
    }

    &--right {
      width: 480px;
      flex-shrink: 0;
    }
  }

  .panel {
    min-height: 0;

    &--summary {
      height: 300px;
      flex-shrink: 0;
    }

    &--cities {
      flex: 1;
    }

    &--map {
      height: 100%;
    }

    &--stores {
      height: 100%;
    }
  }
}

.province-kpi {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 10px;
  width: 100%;
  height: 100%;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: rgba(65, 192, 255, 0.07);
    border: 1px solid rgba(65, 192, 255, 0.18);
    border-radius: 6px;
  }

  &__value {
    font-size: 34px;
    line-height: 1;
  }

  &__label {
    font-size: 13px;
    color: #8fb3d9;
  }
}

.city-chart {
  width: 100%;
  height: 100%;
}

.store-list {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;

  .store-item {
    box-sizing: border-box;
    padding: 10px 10px 12px;
    margin-bottom: 10px;
    background: rgba(65, 192, 255, 0.05);
    border: 1px solid rgba(65, 192, 255, 0.12);
    border-radius: 6px;

    &__main {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }

    &__name {
      font-size: 14px;
      color: #e6f1ff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__city {
      flex-shrink: 0;
      font-size: 11px;
      color: #41c0ff;
      padding: 1px 6px;
      border-radius: 3px;
      background: rgba(65, 192, 255, 0.12);
    }

    &__meta {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 12px;
      color: #8fb3d9;
    }

    &__rate {
      font-family: 'DIN Alternate', 'Bahnschrift', sans-serif;
    }

    &__bar {
      margin-top: 6px;
      height: 4px;
      border-radius: 2px;
      background: rgba(143, 179, 217, 0.15);
      overflow: hidden;

      &-inner {
        display: block;
        height: 100%;
        border-radius: 2px;
        background: linear-gradient(90deg, #16507e, #07c160);
        transition: width 0.6s;
      }
    }
  }
}
</style>
