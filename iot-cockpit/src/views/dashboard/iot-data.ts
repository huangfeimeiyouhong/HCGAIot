/**
 * 智慧物联面板 mock 数据(安防设备/消防设备/AI 隐患分类)。
 * 字段口径与真实接口对齐,数值按视角规模缩放(全国=基线,省≈0.14,网格≈0.06,含小幅稳定抖动);
 * 接入真实接口时删除本文件,把 security-iot 里的三个 fetch 换回真实请求即可。
 */

/** 设备在线统计(安防摄像头口径) */
export interface DeviceOnlineStatData {
  /** 设备总数 */
  totalAmount: number;
  /** 在线率(0~1 小数) */
  onlineRate: number;
  /** 离线率(0~1 小数) */
  offlineRate: number;
}

/** 消防设备分组概览 */
export interface FireGroupOverviewData {
  name: string;
  /** 设备数量(字符串两位小数口径,与真实回包一致) */
  equipNum: string;
  /** 在线率(字符串,如 '98.50') */
  onlineRate: string;
  /** 故障率(字符串) */
  faultRate: string;
}

/** AI 隐患分类节点 */
export interface WorkOrderCategoryNode {
  code: string;
  name: string;
  total: number;
  children?: WorkOrderCategoryNode[];
}

/** AI 隐患分类统计 */
export interface WorkOrderCategoryStatData {
  /** AI 识别隐患总数 */
  totalAmount: number;
  /** 工单完结率(0~1 小数) */
  finishRate: number;
  categoryList: WorkOrderCategoryNode[];
}

/** 视角规模系数(全国 = 1;省 ≈ 0.14;网格 ≈ 0.06) */
function ratioOf(orgIds: string[]): number {
  if (!orgIds.length) return 1;
  if (orgIds.length <= 2) return 0.06;
  return 0.14;
}

/** 稳定抖动种子(同一范围每次一致,模拟轮询微波动 ±2%) */
let tick = 0;
const jitter = (base: number) => {
  tick += 1;
  const wave = Math.sin(tick / 3) * 0.02;
  return Math.max(0, Math.round(base * (1 + wave)));
};

/** 模拟异步返回 */
function resolveIn<T>(data: T, delay = 200): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(data), delay);
  });
}

/** 安防设备在线统计 mock(与真实回包同形:{ data } 包装) */
export function getMockDeviceOnlineInfo(orgIds: string[]): Promise<{ data: DeviceOnlineStatData }> {
  const total = jitter(862 * ratioOf(orgIds));
  const onlineRate = 0.96 + Math.sin(tick / 5) * 0.01;
  return resolveIn({
    data: {
      totalAmount: total,
      onlineRate: Math.round(onlineRate * 10000) / 10000,
      offlineRate: Math.round((1 - onlineRate) * 10000) / 10000,
    },
  });
}

/** 消防设备分组概览 mock */
export function getMockFireGroupOverview(): Promise<{ data: FireGroupOverviewData[] }> {
  return resolveIn({
    data: [
      {
        name: '消防',
        equipNum: String(jitter(1286)),
        onlineRate: '98.60',
        faultRate: '1.20',
      },
    ],
  });
}

/** AI 隐患分类统计 mock */
export function getMockWorkOrderCategoryStat(orgIds: string[]): Promise<{ data: WorkOrderCategoryStatData }> {
  const r = ratioOf(orgIds);
  const scale = (n: number) => Math.max(1, jitter(n * r));
  const categoryList: WorkOrderCategoryNode[] = [
    {
      code: 'fire',
      name: '消防隐患',
      total: scale(46),
      children: [
        { code: 'fire-channel', name: '通道占用', total: scale(21) },
        { code: 'fire-equip', name: '器材异常', total: scale(15) },
        { code: 'fire-smoke', name: '烟雾告警', total: scale(10) },
      ],
    },
    {
      code: 'security',
      name: '安防隐患',
      total: scale(32),
      children: [
        { code: 'sec-intrude', name: '区域入侵', total: scale(18) },
        { code: 'sec-gather', name: '人员聚集', total: scale(14) },
      ],
    },
    { code: 'env', name: '环境隐患', total: scale(18) }
  ];
  const totalAmount = categoryList.reduce((sum, node) => sum + node.total, 0);
  return resolveIn({
    data: {
      totalAmount,
      finishRate: 0.87 + Math.sin(tick / 4) * 0.02,
      categoryList,
    },
  });
}
