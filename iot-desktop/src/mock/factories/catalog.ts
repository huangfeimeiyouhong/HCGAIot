/**
 * M-05 产品型号（14 条）—— 设备 SN 前缀与质保期策略的来源
 */
import { DEVICE_CATEGORY_ABBR } from '@/constants/dict';

import type { Random } from '../types';
import type { DeviceCategory, ProductModel } from '@/types';

/** 型号定义：[modelCode, name, category, vendorIdx, warrantyMonths, protocol] */
const MODEL_DEFS: Array<[string, string, DeviceCategory, number, number, string]> = [
  ['CK-XA-2026', '华厨智能炒炉 XA-2026', 'COOKING', 0, 24, 'MQTT/JSON'],
  ['CK-XB-2026', '华厨双灶炒炉 XB-2026', 'COOKING', 0, 24, 'MQTT/JSON'],
  ['CK-XC-2026', '华厨蒸柜 XC-2026', 'COOKING', 0, 18, 'MQTT/JSON'],
  ['CK-XD-2026', '华厨商用消毒柜 XD-2026', 'DISINFECTION', 0, 12, 'MQTT/JSON'],
  ['CK-RF-2026', '华厨四门冷柜 RF-2026', 'REFRIGERATION', 0, 36, 'MQTT/JSON'],
  ['CK-RG-2026', '华厨工作台冷柜 RG-2026', 'REFRIGERATION', 0, 24, 'MQTT/JSON'],
  ['CK-WS-2026', '华厨洗碗机 WS-2026', 'WASHING', 0, 24, 'MQTT/JSON'],
  ['CK-WH-2026', '华厨热水器 WH-2026', 'WASHING', 0, 12, 'MQTT/JSON'],
  ['CK-EX-2026', '华厨油烟净化器 EX-2026', 'EXHAUST', 0, 12, 'MQTT/JSON'],
  ['IOT-GW-2026', '智联物联网关 GW-2026', 'COOKING', 1, 36, 'Modbus-TCP'],
  ['IOT-CG-2026', '智联温控采集器 CG-2026', 'REFRIGERATION', 1, 24, 'Modbus-TCP'],
  ['IOT-GS-2026', '智联燃气传感器 GS-2026', 'COOKING', 1, 18, 'MQTT/JSON'],
  ['IOT-AC-2026', '智联采集终端 AC-2026', 'WASHING', 1, 24, 'MQTT/JSON'],
  ['IOT-VL-2026', '智联电磁阀控制器 VL-2026', 'REFRIGERATION', 1, 12, 'Modbus-TCP'],
];

/** 厂家 id 列表（与 tenants.ts 的 TEN-0001/0002 对应） */
const VENDOR_IDS = ['TEN-0001', 'TEN-0002'];

/**
 * 生成产品型号
 * @param r 随机工具
 * @returns 14 条型号
 */
export function genProductModels(r: Random): ProductModel[] {
  return MODEL_DEFS.map(([modelCode, name, category, vendorIdx, warrantyMonths, protocol], index) => ({
    id: `PM-${r.pad(index + 1, 4)}`,
    modelCode,
    name,
    category,
    params: {
      额定功率: `${r.int(3, 30)}kW`,
      电压: '220V',
      温度范围: category === 'REFRIGERATION' ? '-25℃~8℃' : '常温~250℃',
      联网方式: protocol.startsWith('Modbus') ? '以太网/485' : 'WiFi/4G',
      额定容量: `${r.int(60, 1200)}L`,
    },
    warrantyMonths,
    protocol,
    vendorId: VENDOR_IDS[vendorIdx] ?? 'TEN-0001',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - (200 - index * 8) * 86_400_000).toISOString(),
  }));
}

/** 型号 code → 品类（SN 生成与详情页用） */
export const MODEL_CATEGORY: Record<string, DeviceCategory> = MODEL_DEFS.reduce(
  (acc, [code, , category]) => {
    acc[code] = category;
    return acc;
  },
  {} as Record<string, DeviceCategory>,
);

/** 型号 code → 质保月数 */
export const MODEL_WARRANTY: Record<string, number> = MODEL_DEFS.reduce(
  (acc, [code, , , , months]) => {
    acc[code] = months;
    return acc;
  },
  {} as Record<string, number>,
);

/** 型号 code → 所属厂家 */
export const MODEL_VENDOR: Record<string, string> = MODEL_DEFS.reduce(
  (acc, [code, , , vendorIdx]) => {
    acc[code] = VENDOR_IDS[vendorIdx] ?? 'TEN-0001';
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * 型号 code → SN 前缀
 * 规则（约定 5）：厨具 `CK-{品类缩写}-{年}-{4 位序号}` → 前缀含年份段，
 * 如 CK-XA-2026 → `CK-XA-2026`；物联网 `IOT-{类型缩写}-{年}-{4 位序号}` 同理
 */
export const MODEL_SN_PREFIX: Record<string, string> = Object.keys(MODEL_CATEGORY).reduce(
  (acc, code) => {
    // 型号本身就是三段式（CK-XA-2026 / IOT-GW-2026），直接作为 SN 前缀
    acc[code] = code;
    return acc;
  },
  {} as Record<string, string>,
);

/** 品类缩写表（导出供 SN 生成用） */
export const CATEGORY_ABBR = DEVICE_CATEGORY_ABBR;