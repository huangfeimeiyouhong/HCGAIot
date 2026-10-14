/**
 * Mock 数据生成器(演示数据)
 * 每次调用带轻微随机抖动,模拟 60s 轮询后的数据变化;
 * 基础量保持稳定,保证大屏数字不会无规律乱跳。
 * 接入真实平台后,此文件可整体废弃,由 api/iot.ts 直接请求后端。
 */
import type {
  AlarmItem,
  AlarmLevel,
  AlarmLevelStat,
  CityDeviceInfo,
  DeviceSummary,
  EnvMetric,
  PlatformShareItem,
  ProvinceDetail,
  ProvinceDeviceInfo,
  StorePoint,
  TrendPoint,
} from './types';

const randInt = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
const randFloat = (min: number, max: number, digits = 1) =>
  Number((min + Math.random() * (max - min)).toFixed(digits));

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 五大硬件平台线(各厂商已有平台的对接对象,对应架构图 L1 层) */
export const PLATFORM_LINES = ['安全生产', '食品安全', '环境消杀', '经营分析', '视频监控'];

/** 平台线设备基数(mock) */
const PLATFORM_BASE: Record<string, number> = {
  安全生产: 168,
  食品安全: 142,
  环境消杀: 96,
  经营分析: 64,
  视频监控: 48,
};

/** 平台线配色(与 constants/chart.ts IOT_COLORS 呼应) */
export const PLATFORM_COLORS = ['#41C0FF', '#07C160', '#FA8C16', '#B78FFF', '#37D4CF'];

/** ---------------- 设备状态总览 ---------------- */

export function genPlatformShare(): PlatformShareItem[] {
  return PLATFORM_LINES.map((name) => ({
    name,
    value: PLATFORM_BASE[name] + randInt(-3, 3),
  }));
}

export function genDeviceSummary(): DeviceSummary {
  const total = PLATFORM_LINES.reduce((s, name) => s + PLATFORM_BASE[name], 0) + randInt(-6, 6);
  const offline = randInt(5, 12);
  const online = total - offline;
  return {
    total,
    online,
    offline,
    alarmToday: randInt(6, 18),
    onlineRate: Number(((online / total) * 100).toFixed(1)),
  };
}

/** ---------------- 环境实时监测 ---------------- */

export function genEnvMetrics(): EnvMetric[] {
  const temp = randFloat(2.5, 6.5, 1);
  const humidity = randInt(55, 72);
  const lampBlack = randFloat(0.4, 1.4, 2);
  const gas = randInt(0, 8);
  return [
    {
      key: 'temp',
      label: '冷柜平均温度',
      value: temp,
      unit: '℃',
      max: 10,
      status: temp > 8 ? 'warning' : 'normal',
      threshold: '安全阈值 < 8℃',
    },
    {
      key: 'humidity',
      label: '库房相对湿度',
      value: humidity,
      unit: '%',
      max: 100,
      status: humidity > 75 ? 'warning' : 'normal',
      threshold: '安全阈值 < 75%',
    },
    {
      key: 'lampBlack',
      label: '油烟浓度',
      value: lampBlack,
      unit: 'mg/m³',
      max: 2,
      status: lampBlack > 1 ? 'warning' : 'normal',
      threshold: '排放标准 ≤ 1.0',
    },
    {
      key: 'gas',
      label: '燃气浓度',
      value: gas,
      unit: 'ppm',
      max: 100,
      status: gas > 25 ? 'warning' : 'normal',
      threshold: '报警阈值 > 25ppm',
    },
  ];
}

/** ---------------- 24h 趋势 ---------------- */

export function genTrend(): TrendPoint[] {
  const now = new Date();
  const points: TrendPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = d.getHours();
    // 午晚餐时段(11-13 / 17-19 点)告警偏多
    const mealBurst = (hour >= 11 && hour <= 13) || (hour >= 17 && hour <= 19);
    points.push({
      time: `${pad2(hour)}:00`,
      onlineRate: Number(randFloat(96.5, 99.6, 1).toFixed(1)),
      alarms: mealBurst ? randInt(1, 6) : randInt(0, 3),
    });
  }
  return points;
}

/** ---------------- 告警 ---------------- */

const LEVEL_LABEL: Record<AlarmLevel, string> = {
  urgent: '紧急',
  important: '重要',
  normal: '一般',
};

export function genAlarmLevels(): AlarmLevelStat[] {
  return [
    { level: 'urgent', label: LEVEL_LABEL.urgent, count: randInt(1, 4) },
    { level: 'important', label: LEVEL_LABEL.important, count: randInt(4, 9) },
    { level: 'normal', label: LEVEL_LABEL.normal, count: randInt(9, 16) },
  ];
}

/** 告警种子池(时间由生成时重排,保证每次刷新列表顺序自然) */
const ALARM_SEEDS: Omit<AlarmItem, 'id' | 'time'>[] = [
  {
    level: 'urgent',
    device: '燃气泄漏传感器 G-2031',
    platform: '安全生产',
    location: '厦门一中食堂',
    content: '燃气浓度 32ppm,超过 25ppm 报警阈值',
  },
  {
    level: 'urgent',
    device: '智能冰柜温度计 T-0117',
    platform: '食品安全',
    location: '福州实验小学食堂',
    content: '冷柜温度 9.8℃,超过 8℃ 安全阈值',
  },
  {
    level: 'important',
    device: '烟感探测器 S-4521',
    platform: '安全生产',
    location: '泉州机关食堂',
    content: '烟雾浓度触发烟感报警,请现场确认',
  },
  {
    level: 'important',
    device: 'AI 食安摄像头 C-0093',
    platform: '食品安全',
    location: '厦门第一医院餐厅',
    content: '检测到从业人员未佩戴工作帽',
  },
  {
    level: 'important',
    device: '智能捕鼠探测器 M-0088',
    platform: '环境消杀',
    location: '漳州二中食堂',
    content: '捕获到鼠情,请及时处置并更换诱饵',
  },
  {
    level: 'important',
    device: '油烟净化控制器 L-3302',
    platform: '环境消杀',
    location: '福州大学第一餐厅',
    content: '油烟浓度 1.32mg/m³,超过排放标准',
  },
  {
    level: 'normal',
    device: '灭蝇灯 F-1206',
    platform: '环境消杀',
    location: '宁德一中食堂',
    content: '设备离线超过 30 分钟,请检查电源',
  },
  {
    level: 'normal',
    device: '紫外消毒灯 U-0451',
    platform: '食品安全',
    location: '三明实验小学食堂',
    content: '灯管寿命即将到期,建议更换',
  },
  {
    level: 'normal',
    device: '客流识别摄像头 C-2210',
    platform: '经营分析',
    location: '龙岩一中食堂',
    content: '识别服务离线,已切换备用算法节点',
  },
  {
    level: 'normal',
    device: '温湿度传感器 H-0772',
    platform: '安全生产',
    location: '南平机关食堂',
    content: '数据上报间隔异常,已自动重连',
  },
  {
    level: 'important',
    device: '消防栓水压计 F-0918',
    platform: '安全生产',
    location: '莆田学院食堂',
    content: '水压低于 0.15MPa,请检查消防管网',
  },
  {
    level: 'normal',
    device: '视频监控摄像头 V-5507',
    platform: '视频监控',
    location: '厦门二中食堂',
    content: '存储卡剩余空间不足 10%,建议清理',
  },
];

export function genAlarmList(): AlarmItem[] {
  const now = Date.now();
  return ALARM_SEEDS.map((seed, i) => {
    const t = new Date(now - i * randInt(4, 11) * 60 * 1000 - randInt(0, 59) * 1000);
    return {
      ...seed,
      id: `AL-${1000 + i}`,
      time: `${pad2(t.getHours())}:${pad2(t.getMinutes())}:${pad2(t.getSeconds())}`,
    };
  });
}

/** ---------------- 区域分布(中国 → 福建下钻) ---------------- */

/** 省级设备分布(mock:仅福建/广东/浙江有设备,其余省份暂无接入) */
export function genProvinces(): ProvinceDeviceInfo[] {
  return [
    { name: '福建省', shortName: '福建', adcode: '35', devices: 386, online: 372, stores: 24 },
    { name: '广东省', shortName: '广东', adcode: '44', devices: 96, online: 91, stores: 6 },
    { name: '浙江省', shortName: '浙江', adcode: '33', devices: 48, online: 46, stores: 3 },
  ];
}

/** 福建省地市基数:[市全名, 中心坐标, 设备数, 门店数] */
const FUJIAN_CITY_BASE: [string, [number, number], number, number][] = [
  ['福州市', [119.306239, 26.075302], 90, 5],
  ['厦门市', [118.11022, 24.490474], 74, 5],
  ['泉州市', [118.589421, 24.908853], 62, 4],
  ['漳州市', [117.661801, 24.510897], 38, 3],
  ['莆田市', [119.007558, 25.431011], 30, 2],
  ['三明市', [117.635001, 26.265444], 24, 2],
  ['南平市', [118.178459, 26.635627], 22, 1],
  ['宁德市', [119.527082, 26.65924], 26, 1],
  ['龙岩市', [117.02978, 25.091603], 20, 1],
];

/** 门店名后缀池(与城市名组合出真实感门店) */
const STORE_SUFFIX = ['一中食堂', '实验小学食堂', '机关食堂', '第一医院餐厅', '学院第二餐厅'];

export function genProvinceDetail(adcode: string): ProvinceDetail {
  const cities: CityDeviceInfo[] = FUJIAN_CITY_BASE.map(([name, center, devices, stores]) => ({
    name,
    shortName: name.replace(/市$/, ''),
    devices: devices + randInt(-2, 2),
    online: Math.max(1, devices - randInt(0, 3)),
    stores,
    center,
  }));

  const stores: StorePoint[] = [];
  cities.forEach((city) => {
    for (let i = 0; i < city.stores; i++) {
      stores.push({
        name: `${city.shortName}${STORE_SUFFIX[i % STORE_SUFFIX.length]}`,
        lng: Number((city.center[0] + randFloat(-0.09, 0.09, 3)).toFixed(3)),
        lat: Number((city.center[1] + randFloat(-0.07, 0.07, 3)).toFixed(3)),
        devices: randInt(8, 24),
        online: randInt(7, 24),
        city: city.shortName,
      });
    }
  });

  const total = cities.reduce((s, c) => s + c.devices, 0);
  const online = cities.reduce((s, c) => s + c.online, 0);
  const summary: DeviceSummary = {
    total,
    online,
    offline: total - online,
    alarmToday: randInt(3, 12),
    onlineRate: Number(((online / total) * 100).toFixed(1)),
  };
  return { summary, cities, stores };
}
