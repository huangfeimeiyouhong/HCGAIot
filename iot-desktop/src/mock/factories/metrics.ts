/**
 * M-14 设备监控数据 —— 每设备 48~168 点（按 30 分钟粒度覆盖最近 1~3 天）
 */
import { METRIC_LABEL, METRIC_UNIT } from '@/constants/dict';

import type { Random } from '../types';
import type { DeviceMetricPoint, Device } from '@/types';

/** 各指标的合理区间与基线 */
const METRIC_PROFILE: Record<string, { base: number; swing: number; min: number; max: number }> = {
  temperature: { base: 62, swing: 22, min: 20, max: 260 },
  gasConcentration: { base: 0.02, swing: 0.03, min: 0, max: 0.3 },
  voltage: { base: 220, swing: 12, min: 170, max: 260 },
  current: { base: 14, swing: 8, min: 0, max: 40 },
  waterLevel: { base: 55, swing: 30, min: 0, max: 100 },
  fanSpeed: { base: 1400, swing: 400, min: 0, max: 2200 },
  reportRate: { base: 98, swing: 3, min: 80, max: 100 },
};

/** 设备品类 → 关注指标 */
const CATEGORY_METRICS: Record<string, string[]> = {
  COOKING: ['temperature', 'voltage', 'current', 'gasConcentration'],
  REFRIGERATION: ['temperature', 'voltage', 'current', 'reportRate'],
  WASHING: ['waterLevel', 'temperature', 'current'],
  EXHAUST: ['fanSpeed', 'voltage', 'current'],
  DISINFECTION: ['temperature', 'voltage', 'reportRate'],
};

/**
 * 生成设备监控数据
 *
 * ⚠️ 数据量控制：86 设备 × (48~168 点 / 设备) ≈ 8600 点（验收要求 ∈ [4000, 14000]）
 *    「点」是指标序列的点数，各指标从同一份时间轴上取值，
 *    因此设备只生成 48~168 个时间刻度，每个刻度写 2 个指标（总量仍落在区间内）
 *
 * @param r 随机工具
 * @param devices 设备列表
 * @returns 点位数组
 */
export function genDeviceMetrics(r: Random, devices: Device[]): DeviceMetricPoint[] {
  const points: DeviceMetricPoint[] = [];
  const stepMs = 30 * 60 * 1000;
  const now = Date.now();

  devices.forEach((device) => {
    const metrics = CATEGORY_METRICS[device.category] ?? CATEGORY_METRICS.COOKING!;
    // 每台设备取 1 个代表指标（趋势图只看主指标），时间刻度 48~168 个
    // 总量 ≈ 86 × 108 ≈ 9300 点，落在验收区间 [4000, 14000]
    const picked = [metrics[0]!];
    const count = r.int(48, 168);

    picked.forEach((metricKey) => {
      const profile = METRIC_PROFILE[metricKey] ?? METRIC_PROFILE.temperature!;
      let value = profile.base;
      for (let i = 0; i < count; i += 1) {
        // 缓慢漂移 + 小抖动，保证曲线像真实工况而非白噪声
        value += r.float(-profile.swing * 0.12, profile.swing * 0.12, 3);
        value = Math.min(profile.max, Math.max(profile.min, value));
        points.push({
          deviceSn: device.sn,
          metricKey,
          value: Number(value.toFixed(2)),
          time: new Date(now - (count - 1 - i) * stepMs).toISOString(),
        });
      }
    });
  });

  return points;
}

/** 指标中文名（图表 axisLabel 用） */
export function metricLabel(metricKey: string): string {
  return METRIC_LABEL[metricKey] ?? metricKey;
}

/** 指标单位 */
export function metricUnit(metricKey: string): string {
  return METRIC_UNIT[metricKey] ?? '';
}