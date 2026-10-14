/**
 * M-20 履约统计（4 厂家 × 4 季度）+ M-21 使用情况（86 设备）
 */
import { SLA_DEFAULT } from '@/constants/sla';

import type { Random } from '../types';
import type { ActivityLevel, Device, UsageStat, VendorSlaStat, WorkOrder } from '@/types';

/** 4 个季度（2025Q4 ~ 2026Q3） */
export const QUARTERS: string[] = ['2025Q4', '2026Q1', '2026Q2', '2026Q3'];

/** 厂家 id 列表 */
const VENDOR_IDS = ['TEN-0001', 'TEN-0002', 'TEN-0003', 'TEN-0004'];

/**
 * 生成履约统计
 * @param r 随机工具
 * @returns 16 条（4 厂家 × 4 季度）
 */
export function genVendorSlaStats(r: Random): VendorSlaStat[] {
  const list: VendorSlaStat[] = [];
  VENDOR_IDS.forEach((vendorId, vIdx) => {
    QUARTERS.forEach((quarter) => {
      // 厂家越靠后表现越弱，制造可对比的排名差异
      const base = 98 - vIdx * 3;
      list.push({
        vendorId,
        quarter,
        onTimeAcceptRate: Number(Math.min(100, r.float(base - 4, base + 1, 1)).toFixed(1)),
        onTimeHandleRate: Number(Math.min(100, r.float(base - 6, base, 1)).toFixed(1)),
        passRate: Number(Math.min(100, r.float(base - 8, base - 1, 1)).toFixed(1)),
        avgResponseHours: Number(r.float(0.5, 4 + vIdx * 0.6, 1).toFixed(1)),
        avgConfirmHours: Number(r.float(4, 30 + vIdx * 4, 1).toFixed(1)),
        breachCount: r.int(vIdx, vIdx * 6 + 4),
      });
    });
  });
  return list;
}

/**
 * 生成设备使用情况
 * @param r 随机工具
 * @param devices 设备列表
 * @param orders 工单列表（用于 alarmFreq 与 mtbf 派生）
 * @returns 86 条使用统计
 */
export function genUsageStats(r: Random, devices: Device[], orders: WorkOrder[]): UsageStat[] {
  // 设备 → 工单数（算 MTBF 用）
  const orderCount = new Map<string, number>();
  orders.forEach((o) => orderCount.set(o.deviceSn, (orderCount.get(o.deviceSn) ?? 0) + 1));

  return devices.map((device) => {
    const count = orderCount.get(device.sn) ?? 0;
    const onlineRate = r.float(55, 99.9, 1);
    const runtimePerDay = r.float(2, 22, 1);
    const startStopFreq = r.int(1, 60);
    const alarmFreq = r.float(0, 8, 1);
    // MTBF = 观察期小时数 / 故障次数，无故障给一个大值
    const mtbf = count === 0 ? Number(r.float(1200, 4000, 0).toFixed(0)) : Number(r.float(120, 1800, 0).toFixed(0));

    let activityLevel: ActivityLevel = 'NORMAL';
    if (onlineRate < 62) activityLevel = 'ZOMBIE';
    else if (runtimePerDay > 14 && startStopFreq > 30) activityLevel = 'HIGH';
    else if (runtimePerDay < 5 && startStopFreq < 10) activityLevel = 'LOW';

    return {
      deviceSn: device.sn,
      onlineRate,
      runtimePerDay,
      startStopFreq,
      alarmFreq,
      mtbf,
      activityLevel,
    };
  });
}

/** SLA 基准（导出给履约画像页做口径说明） */
export const SLA_BASELINE = SLA_DEFAULT.NORMAL;