<!--
 * 后厨管家 IoT 设备全景监控大屏 · 首页(1920×1080 三栏)
 * 左栏:P1 设备状态总览 + P2 环境实时监测
 * 中栏:P4 实时指标趋势 + P5 区域分布视图(中国地图)
 * 右栏:P6 告警信息面板
 * 数据:iotApi(mock)→ usePolling 60s 静默刷新
-->
<template>
  <div class="iot-cockpit">
    <div class="iot-cockpit__col iot-cockpit__col--left">
      <PanelCard
        title="设备状态总览"
        class="panel panel--p1"
      >
        <DeviceOverview
          :summary="summary"
          :share="share"
        />
      </PanelCard>
      <PanelCard
        title="环境实时监测"
        class="panel panel--p2"
      >
        <EnvMonitor :metrics="envMetrics" />
      </PanelCard>
    </div>

    <div class="iot-cockpit__col iot-cockpit__col--center">
      <PanelCard
        title="实时指标趋势"
        class="panel panel--p4"
      >
        <RealtimeCharts :trend="trend" />
      </PanelCard>
      <PanelCard
        title="区域分布视图"
        class="panel panel--p5"
      >
        <RegionMap :provinces="provinces" />
      </PanelCard>
    </div>

    <div class="iot-cockpit__col iot-cockpit__col--right">
      <PanelCard
        title="告警信息"
        class="panel panel--p6"
      >
        <AlarmPanel
          :level-stats="levelStats"
          :alarms="alarms"
        />
      </PanelCard>
    </div>
  </div>
</template>

<script setup lang="ts" name="IotCockpit">
import { onMounted, ref } from 'vue';

import PanelCard from '@/components/panel-card/index.vue';
import { usePolling } from '@/hooks/use-polling';
import { iotApi } from '@/api/iot';
import AlarmPanel from './components/alarm-panel/index.vue';
import DeviceOverview from './components/device-overview/index.vue';
import EnvMonitor from './components/env-monitor/index.vue';
import RealtimeCharts from './components/realtime-charts/index.vue';
import RegionMap from './components/region-map/index.vue';
import type {
  AlarmItem,
  AlarmLevelStat,
  DeviceSummary,
  EnvMetric,
  PlatformShareItem,
  ProvinceDeviceInfo,
  TrendPoint,
} from './types';

const summary = ref<DeviceSummary>({
  total: 0,
  online: 0,
  offline: 0,
  alarmToday: 0,
  onlineRate: 0,
});
const share = ref<PlatformShareItem[]>([]);
const envMetrics = ref<EnvMetric[]>([]);
const trend = ref<TrendPoint[]>([]);
const levelStats = ref<AlarmLevelStat[]>([]);
const alarms = ref<AlarmItem[]>([]);
const provinces = ref<ProvinceDeviceInfo[]>([]);

/** 全量拉数(首屏 + 60s 轮询);静默刷新:不清旧值,失败保持原值 */
async function loadAll(): Promise<void> {
  const [s, sh, env, tr, lv, al, pv] = await Promise.all([
    iotApi.getDeviceSummary(),
    iotApi.getPlatformShare(),
    iotApi.getEnvMetrics(),
    iotApi.getTrend(),
    iotApi.getAlarmLevels(),
    iotApi.getAlarmList(),
    iotApi.getProvinces(),
  ]);
  summary.value = s;
  share.value = sh;
  envMetrics.value = env;
  trend.value = tr;
  levelStats.value = lv;
  alarms.value = al;
  provinces.value = pv;
}

onMounted(loadAll);
usePolling(loadAll, 60 * 1000);
</script>

<style scoped lang="scss">
.iot-cockpit {
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
      width: 460px;
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

    &--p1 {
      height: 440px;
      flex-shrink: 0;
    }

    &--p2 {
      flex: 1;
    }

    &--p4 {
      height: 380px;
      flex-shrink: 0;
    }

    &--p5 {
      flex: 1;
    }

    &--p6 {
      height: 100%;
    }
  }
}
</style>
