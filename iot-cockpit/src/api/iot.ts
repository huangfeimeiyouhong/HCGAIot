/**
 * IoT 设备管理 · API 层
 *
 * 当前为 mock 实现(演示数据)。接入真实平台时:
 *   1. 安装 axios,在 vite.config.ts 打开 /api 代理;
 *   2. 将下方各方法体替换为真实请求(如 GET /api/iot/device-summary);
 *   3. 返回数据结构保持不变,上层面板组件零改动。
 *
 * 轮询策略统一由页面层 usePolling 驱动(60s 静默刷新),此层只负责取数。
 */
import type {
  AlarmItem,
  AlarmLevelStat,
  DeviceSummary,
  EnvMetric,
  PlatformShareItem,
  ProvinceDetail,
  ProvinceDeviceInfo,
  TrendPoint,
} from '@/views/iot-cockpit/types';
import {
  genAlarmLevels,
  genAlarmList,
  genDeviceSummary,
  genEnvMetrics,
  genPlatformShare,
  genProvinceDetail,
  genProvinces,
  genTrend,
} from '@/views/iot-cockpit/data';

/** mock 模拟网络延迟(ms) */
const MOCK_LATENCY = 200;

function delay<T>(data: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), MOCK_LATENCY);
  });
}

export const iotApi = {
  /** 设备状态总览(总数/在线/离线/今日告警) */
  getDeviceSummary(): Promise<DeviceSummary> {
    return delay(genDeviceSummary());
  },
  /** 各平台线设备占比 */
  getPlatformShare(): Promise<PlatformShareItem[]> {
    return delay(genPlatformShare());
  },
  /** 环境实时指标 */
  getEnvMetrics(): Promise<EnvMetric[]> {
    return delay(genEnvMetrics());
  },
  /** 24h 在线率与告警趋势 */
  getTrend(): Promise<TrendPoint[]> {
    return delay(genTrend());
  },
  /** 告警等级统计 */
  getAlarmLevels(): Promise<AlarmLevelStat[]> {
    return delay(genAlarmLevels());
  },
  /** 告警列表(按时间倒序) */
  getAlarmList(): Promise<AlarmItem[]> {
    return delay(genAlarmList());
  },
  /** 省级设备分布(中国地图) */
  getProvinces(): Promise<ProvinceDeviceInfo[]> {
    return delay(genProvinces());
  },
  /** 省份下钻明细(地市 + 门店) */
  getProvinceDetail(adcode: string): Promise<ProvinceDetail> {
    return delay(genProvinceDetail(adcode));
  },
};
