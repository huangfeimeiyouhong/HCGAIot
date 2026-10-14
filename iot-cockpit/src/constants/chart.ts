/** 图表系列色（迁移自 dashboard-poc utils/constant.js） */
export const barColors = [
  'rgba(255, 204, 0, 1)',
  'rgba(255, 149, 0, 1)',
  '#37D4CF',
  '#2CA850',
  '#F5007A',
  '#7A00F5',
  '#007AF5',
];

export const lineColor = 'rgba(255, 149, 0, 1)';

export const BASE_COLOR = {
  GREEN: '#2CA850',
  PURPLE: '#7A00F5',
  CYAN: '#37D4CF',
  YELLOW: '#FFCC00',
  ORANGE: '#FF9500',
  RED: '#F5007A',
} as const;

/** IoT 大屏专用色板(深色科技风) */
export const IOT_COLORS = {
  /** 主色(青蓝) */
  PRIMARY: '#41C0FF',
  /** 正常/在线(品牌绿) */
  GREEN: '#07C160',
  /** 重要告警(橙) */
  ORANGE: '#FA8C16',
  /** 紧急告警(红) */
  RED: '#FF4D4F',
  /** 离线/次要(灰) */
  GRAY: '#94A3B8',
  /** 地图无数据区域 */
  MAP_EMPTY: '#0B2B4F',
  /** 地图低密度 */
  MAP_LOW: '#16507E',
  /** 地图高密度 */
  MAP_HIGH: '#37D4CF',
  /** 文字主/次色 */
  TEXT: '#E6F1FF',
  TEXT_DIM: '#8FB3D9',
} as const;

/** 告警等级 → 色板映射 */
export const ALARM_LEVEL_COLOR: Record<'urgent' | 'important' | 'normal', string> = {
  urgent: IOT_COLORS.RED,
  important: IOT_COLORS.ORANGE,
  normal: IOT_COLORS.PRIMARY,
};
