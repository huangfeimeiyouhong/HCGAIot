/** IoT 设备全景监控大屏 · 全局类型定义(API 层与面板组件共用) */

/** 告警等级 */
export type AlarmLevel = 'urgent' | 'important' | 'normal';

/** 设备状态总览 */
export interface DeviceSummary {
  /** 设备总数 */
  total: number;
  /** 在线数 */
  online: number;
  /** 离线数 */
  offline: number;
  /** 今日告警数 */
  alarmToday: number;
  /** 在线率(%) */
  onlineRate: number;
}

/** 各平台线设备占比(环形图) */
export interface PlatformShareItem {
  name: string;
  value: number;
}

/** 环境实时指标(仪表盘) */
export interface EnvMetric {
  key: string;
  label: string;
  value: number;
  unit: string;
  /** 仪表量程上限 */
  max: number;
  status: 'normal' | 'warning';
  /** 阈值说明文案 */
  threshold: string;
}

/** 24h 趋势点 */
export interface TrendPoint {
  /** HH:00 */
  time: string;
  /** 在线率(%) */
  onlineRate: number;
  /** 告警数 */
  alarms: number;
}

/** 告警等级统计 */
export interface AlarmLevelStat {
  level: AlarmLevel;
  label: string;
  count: number;
}

/** 告警条目 */
export interface AlarmItem {
  id: string;
  level: AlarmLevel;
  /** 设备名称 */
  device: string;
  /** 来源平台线 */
  platform: string;
  /** 所在门店 */
  location: string;
  /** HH:mm:ss */
  time: string;
  /** 告警内容 */
  content: string;
}

/** 省级设备分布(中国地图) */
export interface ProvinceDeviceInfo {
  /** 省全名,与 GeoJSON properties.name 对齐(如 福建省) */
  name: string;
  /** 省短名(如 福建) */
  shortName: string;
  /** 省码前两位(如 35) */
  adcode: string;
  devices: number;
  online: number;
  stores: number;
}

/** 地市设备分布(省份下钻) */
export interface CityDeviceInfo {
  /** 市全名,与省级 GeoJSON properties.name 对齐(如 福州市) */
  name: string;
  shortName: string;
  devices: number;
  online: number;
  stores: number;
  /** 地市中心坐标 [lng, lat] */
  center: [number, number];
}

/** 门店点位(地图撒点) */
export interface StorePoint {
  name: string;
  lng: number;
  lat: number;
  devices: number;
  online: number;
  city: string;
}

/** 省份下钻汇总数据 */
export interface ProvinceDetail {
  summary: DeviceSummary;
  cities: CityDeviceInfo[];
  stores: StorePoint[];
}
