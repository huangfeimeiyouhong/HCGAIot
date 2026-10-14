/**
 * M-10 告警（140 条）+ M-17 告警规则（18 条）+ M-22 客户阈值（24 条）
 */
import { addDays } from '@/utils/date';

import { ALARM_METRIC_MAP, ALARM_TYPE_OPTIONS } from '@/constants/dict';

import type { Random } from '../types';
import type { Alarm, AlarmLevel, AlarmRule, AlarmSource, AlarmStatus, CustomerThreshold, Device, Tenant } from '@/types';

/** 规则定义：[name, category, metric, condition, threshold, level] */
const RULE_DEFS: Array<[string, AlarmRule['category'], string, AlarmRule['condition'], number, AlarmLevel]> = [
  ['烹饪设备超温告警', 'COOKING', 'temperature', 'GT', 240, 'URGENT'],
  ['制冷设备超温告警', 'REFRIGERATION', 'temperature', 'GT', 8, 'URGENT'],
  ['制冷设备温度过低', 'REFRIGERATION', 'temperature', 'LT', -18, 'IMPORTANT'],
  ['燃气泄漏告警', 'ALL', 'gasConcentration', 'GTE', 0.1, 'URGENT'],
  ['电压过低告警', 'ALL', 'voltage', 'LT', 190, 'IMPORTANT'],
  ['电压过高告警', 'ALL', 'voltage', 'GT', 250, 'IMPORTANT'],
  ['电流过载告警', 'ALL', 'current', 'GT', 30, 'IMPORTANT'],
  ['水位异常告警', 'WASHING', 'waterLevel', 'GT', 90, 'NORMAL'],
  ['风机转速异常', 'EXHAUST', 'fanSpeed', 'LT', 600, 'IMPORTANT'],
  ['数据上报率低', 'ALL', 'reportRate', 'LT', 90, 'NORMAL'],
  ['消毒柜温度不足', 'DISINFECTION', 'temperature', 'LT', 80, 'IMPORTANT'],
  ['设备离线告警', 'ALL', 'online', 'EQ', 0, 'NORMAL'],
  ['制冷设备高温预警', 'REFRIGERATION', 'temperature', 'GTE', 6, 'IMPORTANT'],
  ['燃气浓度预警', 'ALL', 'gasConcentration', 'GTE', 0.05, 'IMPORTANT'],
  ['电压波动告警', 'ALL', 'voltage', 'GT', 235, 'NORMAL'],
  ['电流波动告警', 'ALL', 'current', 'GT', 22, 'NORMAL'],
  ['水位低水位告警', 'WASHING', 'waterLevel', 'LT', 15, 'NORMAL'],
  ['风机超速告警', 'EXHAUST', 'fanSpeed', 'GT', 1800, 'NORMAL'],
];

/**
 * 生成告警
 * @param r 随机工具
 * @param devices 设备列表
 * @param vendorOf 设备 → 责任厂家映射
 * @returns 140 条告警
 */
export function genAlarms(
  r: Random,
  devices: Device[],
  vendorOf: (d: Device) => string,
): Alarm[] {
  const alarms: Alarm[] = [];
  const boundDevices = devices.filter((d) => d.ownerCustomerId);

  for (let i = 1; i <= 140; i += 1) {
    const device = boundDevices.length ? r.pick(boundDevices) : devices[i % devices.length]!;
    const type = r.pick(ALARM_TYPE_OPTIONS).value;
    const metricInfo = ALARM_METRIC_MAP[type] ?? ALARM_METRIC_MAP['超温']!;
    const threshold = Number((metricInfo.base * r.float(0.9, 1.15, 2)).toFixed(2));
    const actual = Number((threshold * r.float(1.02, 1.5, 2)).toFixed(2));
    const triggerTime = addDays(new Date().toISOString(), -r.int(0, 60));

    alarms.push({
      id: `ALM-2026-${r.pad(i, 4)}`,
      deviceSn: device.sn,
      customerId: device.ownerCustomerId ?? `TEN-${r.pad(5, 4)}`,
      vendorId: vendorOf(device),
      level: r.weighted<AlarmLevel>([
        { value: 'URGENT', weight: 18 },
        { value: 'IMPORTANT', weight: 32 },
        { value: 'NORMAL', weight: 50 },
      ]),
      type,
      source: r.weighted<AlarmSource>([
        { value: 'VENDOR_RULE', weight: 50 },
        { value: 'PLATFORM_RULE', weight: 38 },
        { value: 'CUSTOMER_RULE', weight: 12 },
      ]),
      ruleId: `RULE-${r.pad(r.int(1, 18), 4)}`,
      threshold,
      actualValue: actual,
      unit: metricInfo.unit,
      duration: r.int(30, 7200),
      triggerTime,
      status: r.weighted<AlarmStatus>([
        { value: 'UNCONFIRMED', weight: 22 },
        { value: 'CONFIRMED', weight: 16 },
        { value: 'PROCESSING', weight: 24 },
        { value: 'RECOVERED', weight: 38 },
      ]),
      componentSn: r.bool(0.45) ? `TEMP-${r.pad(r.int(1, 9999), 5)}` : undefined,
      byCustomerThreshold: r.bool(0.1),
    });
  }

  // 回填设备累计告警数
  const counter = new Map<string, number>();
  alarms.forEach((a) => counter.set(a.deviceSn, (counter.get(a.deviceSn) ?? 0) + 1));
  devices.forEach((d) => {
    d.alarmCount = counter.get(d.sn) ?? 0;
  });

  return alarms;
}

/**
 * 生成告警规则
 * @param r 随机工具
 * @returns 18 条规则
 */
export function genAlarmRules(r: Random): AlarmRule[] {
  return RULE_DEFS.map(([name, category, metric, condition, threshold, level], index) => ({
    id: `RULE-${r.pad(index + 1, 4)}`,
    name,
    category,
    metric,
    condition,
    threshold,
    level,
    notifyTargets: r.bool(0.5) ? ['厂家管理员', '客户管理员'] : ['平台运营'],
    enabled: r.bool(0.85),
    updatedAt: addDays(new Date().toISOString(), -r.int(1, 90)),
  }));
}

/**
 * 生成客户自定义阈值
 * @param r 随机工具
 * @param devices 设备列表
 * @param tenants 客户租户列表
 * @returns 24 条阈值
 */
export function genCustomerThresholds(r: Random, devices: Device[], tenants: Tenant[]): CustomerThreshold[] {
  const customers = tenants.filter((t) => t.type === 'CUSTOMER');
  const list: CustomerThreshold[] = [];
  const metrics = ['temperature', 'gasConcentration', 'voltage', 'current'];

  for (let i = 1; i <= 24; i += 1) {
    const device = devices[(i - 1) % devices.length]!;
    const tenant = customers[i % customers.length]!;
    const metric = metrics[i % metrics.length]!;
    list.push({
      id: `THR-${r.pad(i, 4)}`,
      tenantId: tenant.id,
      deviceSn: device.sn,
      metricKey: metric,
      threshold: metric === 'temperature' ? r.int(2, 12) : metric === 'gasConcentration' ? 0.05 : metric === 'voltage' ? r.int(190, 250) : r.int(15, 30),
      level: r.weighted<AlarmLevel>([
        { value: 'URGENT', weight: 25 },
        { value: 'IMPORTANT', weight: 40 },
        { value: 'NORMAL', weight: 35 },
      ]),
      enabled: r.bool(0.8),
    });
  }

  return list;
}