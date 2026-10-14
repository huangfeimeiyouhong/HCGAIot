/**
 * M-06 设备（86 台）+ M-07 部件（60 个，仅物联网厂家）
 * 故事线设备 CK-XA-2026-0001 / CK-XA-2026-0007 为硬编码，不可被随机覆盖
 */
import { addDays } from '@/utils/date';

import { MODEL_SN_PREFIX, MODEL_WARRANTY } from './catalog';

import type { Random } from '../types';
import type { Binding, Component, Device } from '@/types';

/** 位置模板（按品类） */
const LOCATION_TEMPLATES: Record<string, string[]> = {
  COOKING: ['一号灶档', '二号灶档', '三号灶档', '四号灶档', '面点间', '备餐区'],
  REFRIGERATION: ['冷藏库', '冷冻库', '备餐间', '留样间', '走道冷柜'],
  WASHING: ['洗消间', '餐具间', '后场'],
  EXHAUST: ['主烟道', '西侧排烟', '东侧排烟', '烧烤间'],
  DISINFECTION: ['餐具消毒间', '保洁间', '后场'],
};

/** 城市前缀（位置前缀） */
const CITY_PREFIX = ['福州', '厦门', '泉州', '莆田', '漳州'];

/**
 * 按型号质保策略计算质保期至
 * @param manufactureDate 出厂日期
 * @param modelCode 型号编码
 * @returns 质保期至（ISO 串）
 */
export function calcWarrantyUntil(manufactureDate: string, modelCode: string): string {
  const months = MODEL_WARRANTY[modelCode] ?? 12;
  const d = new Date(manufactureDate);
  if (Number.isNaN(d.getTime())) return manufactureDate;
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

/**
 * 生成设备
 * @param r 随机工具
 * @param modelCodes 可用型号编码列表
 * @returns 86 台设备
 */
export function genDevices(r: Random, modelCodes: string[]): Device[] {
  const devices: Device[] = [];

  for (let i = 1; i <= 86; i += 1) {
    const modelCode = modelCodes[(i - 1) % modelCodes.length]!;
    const prefix = MODEL_SN_PREFIX[modelCode] ?? 'CK-XA';
    const manufactureDate = addDays(new Date().toISOString(), -r.int(30, 900));
    const locations = LOCATION_TEMPLATES[modelCode.startsWith('CK-R') ? 'REFRIGERATION' : 'COOKING']!;
    devices.push({
      sn: `${prefix}-${r.pad(i, 4)}`,
      name: `${modelCode} 设备`,
      modelCode,
      category: 'COOKING',
      manufactureDate,
      warrantyUntil: calcWarrantyUntil(manufactureDate, modelCode),
      ownerCustomerId: null, // 由绑定工厂回填（OWNERSHIP 生效绑定派生）
      status: r.weighted<Device['status']>([
        { value: 'ONLINE', weight: 72 },
        { value: 'OFFLINE', weight: 12 },
        { value: 'ABNORMAL', weight: 8 },
        { value: 'REPAIRING', weight: 5 },
        { value: 'INACTIVE', weight: 3 },
      ]),
      vendorIds: [],
      location: `${r.pick(CITY_PREFIX)}${r.pick(locations)}`,
      alarmCount: 0,
      lastReportAt: addDays(new Date().toISOString(), -r.int(0, 5)),
    });
  }

  // 用型号的真实品类覆盖（工厂内不便 import catalog 的全部表，直接按前缀推断）
  devices.forEach((d) => {
    d.category = categoryOfModel(d.modelCode);
  });

  return devices;
}

/**
 * 由型号编码推断设备品类
 * @param modelCode 型号编码
 * @returns 品类
 */
function categoryOfModel(modelCode: string): Device['category'] {
  const two = modelCode.split('-')[1] ?? '';
  const map: Record<string, Device['category']> = {
    XA: 'COOKING', XB: 'COOKING', XC: 'COOKING',
    RF: 'REFRIGERATION', RG: 'REFRIGERATION',
    WS: 'WASHING', WH: 'WASHING',
    EX: 'EXHAUST',
    XD: 'DISINFECTION',
    GW: 'COOKING', CG: 'REFRIGERATION', GS: 'COOKING', AC: 'WASHING', VL: 'REFRIGERATION',
  };
  return map[two] ?? 'COOKING';
}

/**
 * 生成部件（仅物联网厂家 TEN-0002）
 * @param r 随机工具
 * @param iotDeviceSns 物联网设备 SN 列表
 * @returns 60 个部件
 */
export function genComponents(r: Random, iotDeviceSns: string[]): Component[] {
  const types: Component['type'][] = ['TEMP_SENSOR', 'GAS_SENSOR', 'GATEWAY', 'ACQUISITION', 'VALVE'];
  const components: Component[] = [];
  const pool = iotDeviceSns.length ? iotDeviceSns : ['IOT-CG-2026-0001'];

  for (let i = 1; i <= 60; i += 1) {
    const deviceSn = pool[(i - 1) % pool.length]!;
    const type = types[(i - 1) % types.length]!;
    components.push({
      id: `CMP-${r.pad(i, 4)}`,
      componentSn: `${type.slice(0, 3)}-${r.pad(r.int(1, 9999), 5)}`,
      type,
      firmwareVersion: `v${r.int(1, 4)}.${r.int(0, 9)}.${r.int(0, 20)}`,
      metricSet:
        type === 'TEMP_SENSOR'
          ? ['temperature']
          : type === 'GAS_SENSOR'
            ? ['gasConcentration']
            : type === 'VALVE'
              ? ['waterLevel']
              : ['temperature', 'voltage', 'current'],
      deviceSn,
      vendorId: 'TEN-0002',
      batch: `B${r.pad(r.int(1, 40), 3)}`,
      dataMissingRate: r.float(0, 8, 2),
    });
  }

  return components;
}

/** 部件 SN 生成的类型缩写 */
export const COMPONENT_ABBR: Record<string, string> = {
  TEMP_SENSOR: 'TEM',
  GAS_SENSOR: 'GAS',
  GATEWAY: 'GTW',
  ACQUISITION: 'ACQ',
  VALVE: 'VLV',
};

/** 供 stories.ts 复用的派生导出 */
export type { Binding };