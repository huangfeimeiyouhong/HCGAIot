/**
 * 安全环保/应急态势面板 mock 数据
 * 全国值取自设计稿;省/网格按系数缩放(北京/河北精修)。
 * 公司/项目名录与真实组织架构同源(org-data.ts 派生,现存北京/河北两家)
 */
import { getCompanyByCityCode, getProvinceCompanies } from '@/views/dashboard/grid-data';
import { projectData } from '@/views/dashboard/project-data';

/** 驾驶舱视角 */
export type SituationView = 'security' | 'emergency';

/** 数据范围:不传 = 全国;city = 省码;gridOrgId = 网格 orgId */
export interface SituScope {
  city?: string;
  gridOrgId?: string;
}

/** 指标卡通用结构 */
export interface SituStat {
  label: string;
  value: number | string;
  unit: string;
}

/** 饼图/环形图扇区 */
export interface SituPieItem {
  name: string;
  value: number;
}

/** 饼图合计(与图例数值恒自洽,勿手填常量——设计稿中心数与分项和多处对不上) */
function sumPie(pie: SituPieItem[]): number {
  return pie.reduce((acc, cur) => acc + cur.value, 0);
}

/** 未精修 scope 兜底系数(真实架构下不可达,直连 URL 防御) */
const DEFAULT_SCOPE_RATIO = 0.08;

/** 精修省 base 缩放系数(真实组织现存北京/河北两家) */
const PROVINCE_MOCK: Record<string, number> = {
  beijing: 0.14,
  hebei: 0.08,
};

/** scope 键(city 或 city·gridOrgId),驱动散列稳定 */
function scopeKey(scope: SituScope): string {
  return scope.gridOrgId ? `${scope.city ?? ''}·${scope.gridOrgId}` : (scope.city ?? '');
}

/** scope 的缩放系数 */
function scopeRatio(scope: SituScope): number {
  return PROVINCE_MOCK[scope.city ?? ''] ?? DEFAULT_SCOPE_RATIO;
}

/** 字符串散列种子(同串每次一致) */
function charSeed(text: string): number {
  return [...text].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

/** scope 的散列种子(同 scope 每次一致) */
function scopeSeed(scope: SituScope): number {
  return charSeed(scopeKey(scope));
}

/** 数值按系数缩放取整(≥1) */
function scaleNum(value: number, ratio: number): number {
  return Math.max(1, Math.round(value * ratio));
}

/** scope 是否省级(非全国非网格) */
function isProvince(scope: SituScope): boolean {
  return Boolean(scope.city) && !scope.gridOrgId;
}

/** 排行类列表取前 N 家公司(全国),省级取全省属名单 mock 前 N */
function companyNames(scope: SituScope, count: number): string[] {
  if (isProvince(scope)) {
    const name = getCompanyByCityCode(scope.city ?? '')?.name ?? '本公司';
    return Array.from({ length: count }, (_, i) => `${name.replace('公司', '')}片区${i + 1}`);
  }
  return getProvinceCompanies().slice(0, count).map((c) => c.name);
}

export interface AssetInfoData {
  stats: SituStat[];
}

export function getAssetInfoData(scope: SituScope): AssetInfoData {
  if (!scope.city) {
    return {
      stats: [
        {
          label: '安全接入资产数量', value: 1800, unit: '条'
        },
        {
          label: '土地面积', value: 5.44, unit: '万亩'
        },
        {
          label: '房屋面积', value: 8.1, unit: '万方'
        },
      ],
    };
  }
  const r = scopeRatio(scope);
  const seed = scopeSeed(scope);
  return {
    stats: [
      {
        label: '安全接入资产数量', value: scaleNum(1800, r), unit: '条'
      },
      {
        label: '土地面积', value: Math.round(5.44 * r * 100) / 100, unit: '万亩'
      },
      {
        label: '房屋面积', value: Math.round(8.1 * r * 10 + seed % 3) / 10, unit: '万方'
      },
    ],
  };
}

export interface HazardItem {
  /** 项目名 */
  name: string;
  device: string;
  location: string;
  time: string;
  status: string;
}

export interface HazardCompanyGroup {
  /** 公司名(不带计数) */
  company: string;
  items: HazardItem[];
}

export interface HazardCategory {
  /** tab 值 */
  value: string;
  /** tab 文案(不带计数) */
  label: string;
  /** 按公司分组的隐患列表 */
  groups: HazardCompanyGroup[];
}

export interface HazardData {
  stats: SituStat[];
  majorStats: SituStat[];
  categories: HazardCategory[];
}

export function getHazardData(scope: SituScope): HazardData {
  if (!scope.city) {
    return {
      stats: [
        {
          label: '隐患总数', value: 7, unit: '个'
        },
        {
          label: '已整改数量', value: 3, unit: '个'
        },
        {
          label: '待整改数量', value: 4, unit: '个'
        },
        {
          label: '逾期数量', value: 1, unit: '个'
        },
      ],
      majorStats: [
        {
          label: '重大隐患', value: 3, unit: '个'
        },
        {
          label: '已整改数量', value: 1, unit: '个'
        },
        {
          label: '待整改数量', value: 2, unit: '个'
        },
        {
          label: '逾期数量', value: 0, unit: '个'
        },
      ],
      categories: [
        {
          value: 'fire',
          label: '安全生产',
          groups: [
            {
              company: '北京公司',
              items: [
                {
                  name: '中关村壹号', device: '点型感烟火灾探测器', location: '建材区1层南面走道', time: '2026-08-11 14:31:27', status: '待处理'
                },
                {
                  name: '望京科技园', device: '点型感烟火灾探测器', location: '建材区2层北面走道', time: '2026-08-11 16:02:10', status: '待处理'
                },
              ],
            },
            {
              company: '河北公司',
              items: [
                {
                  name: '丽泽商务中心', device: '点型感烟火灾探测器', location: '仓储区2层北面走道', time: '2026-08-12 09:05:41', status: '待处理'
                },
              ],
            },
          ],
        },
        {
          value: 'major',
          label: '重大隐患',
          groups: [
            {
              company: '北京公司',
              items: [
                {
                  name: '中关村壹号', device: '消防通道堵塞', location: '东区消防通道', time: '2026-08-10 18:22:03', status: '待处理'
                },
              ],
            },
            {
              company: '河北公司',
              items: [
                {
                  name: '裕华产业园', device: '配电室温感异常', location: 'B1 配电室', time: '2026-08-09 11:40:15', status: '待处理'
                },
              ],
            },
          ],
        },
        {
          value: 'disaster',
          label: '资产管护',
          groups: [
            {
              company: '北京公司',
              items: [
                {
                  name: '大兴物流园', device: '积水浸泡预警', location: '地下车库入口', time: '2026-08-08 07:55:30', status: '待处理'
                },
              ],
            },
          ],
        },
      ],
    };
  }
  const r = scopeRatio(scope);
  const companyName = getCompanyByCityCode(scope.city)?.name ?? '本公司';
  return {
    stats: [
      {
        label: '隐患总数', value: scaleNum(7, r), unit: '个'
      },
      {
        label: '已整改数量', value: scaleNum(3, r), unit: '个'
      },
      {
        label: '待整改数量', value: scaleNum(4, r), unit: '个'
      },
      {
        label: '逾期数量', value: 1, unit: '个'
      },
    ],
    majorStats: [
      {
        label: '重大隐患', value: 1, unit: '个'
      },
      {
        label: '已整改数量', value: 1, unit: '个'
      },
      {
        label: '待整改数量', value: 0, unit: '个'
      },
      {
        label: '逾期数量', value: 0, unit: '个'
      },
    ],
    categories: [
      {
        value: 'fire',
        label: '安全生产',
        groups: [
          {
            company: companyName,
            items: [
              {
                name: '中关村壹号', device: '点型感烟火灾探测器', location: '建材区1层南面走道', time: '2026-08-11 14:31:27', status: '待处理'
              },
            ],
          },
        ],
      },
      {
        value: 'major',
        label: '重大隐患',
        groups: [
          {
            company: companyName,
            items: [
              {
                name: '裕华产业园', device: '消防通道堵塞', location: '东区消防通道', time: '2026-08-10 18:22:03', status: '待处理'
              },
            ],
          },
        ],
      },
      {
        value: 'disaster',
        label: '资产管护',
        groups: [
          {
            company: companyName,
            items: [
              {
                name: '中关村壹号', device: '积水浸泡预警', location: '地下车库入口', time: '2026-08-08 07:55:30', status: '待处理'
              },
            ],
          },
        ],
      },
    ],
  };
}

export interface SupervisionItem {
  /** 项目名 */
  name: string;
  hazard: string;
  owner: string;
  status: string;
  overdue: string;
}

export interface SupervisionCompanyGroup {
  /** 公司名(不带计数) */
  company: string;
  items: SupervisionItem[];
}

export interface SupervisionCategory {
  /** tab 值 */
  value: string;
  /** tab 文案(不带计数) */
  label: string;
  /** 按公司分组的督办列表 */
  groups: SupervisionCompanyGroup[];
}

export interface SupervisionData {
  stats: SituStat[];
  categories: SupervisionCategory[];
}

export function getSupervisionData(scope: SituScope): SupervisionData {
  const companyName = scope.city ? (getCompanyByCityCode(scope.city)?.name ?? '本公司') : '北京公司';
  return {
    stats: [
      {
        label: '待发起', value: 7, unit: '个'
      },
      {
        label: '督办中', value: 3, unit: '个'
      },
      {
        label: '升级督办', value: 4, unit: '个'
      },
      {
        label: '今日闭环', value: 1, unit: '个'
      },
    ],
    categories: [
      {
        value: 'overdue1',
        label: '逾期1个月未完成',
        groups: [
          {
            company: companyName,
            items: [
              {
                name: '中关村壹号', hazard: '消防通道堵塞', owner: '地产公司督办', status: '待反馈', overdue: '逾期7天'
              },
            ],
          },
          ...(scope.city ? [] : [
            {
              company: '河北公司',
              items: [
                {
                  name: '丽泽商务中心', hazard: '消防通道堵塞', owner: '地产公司督办', status: '待反馈', overdue: '逾期7天'
                },
              ],
            },
          ]),
        ],
      },
      {
        value: 'overdue2',
        label: '逾期2个月未完成',
        groups: [
          {
            company: companyName,
            items: [
              {
                name: '丽泽商务中心', hazard: '疏散指示标志损坏', owner: '地产公司督办', status: '待反馈', overdue: '逾期38天'
              },
            ],
          },
        ],
      },
      {
        value: 'overdue3',
        label: '逾期3个月未完成',
        groups: [
          {
            company: companyName,
            items: [
              {
                name: '裕华产业园', hazard: '防火卷帘门故障', owner: '地产公司督办', status: '待反馈', overdue: '逾期72天'
              },
            ],
          },
        ],
      },
    ],
  };
}

export interface RankingGrade {
  level: string;
  count: number;
}

export interface RankingRow {
  rank: number;
  company: string;
  score: number;
}

export interface RankingData {
  grades: RankingGrade[];
  ranking: RankingRow[];
}

export function getRankingData(scope: SituScope): RankingData {
  const names = companyNames(scope, 5);
  const seed = scopeSeed(scope);
  const base = scope.city ? 88 : 99;
  return {
    grades: [
      { level: '优', count: 24 },
      { level: '良', count: 4 },
      { level: '中', count: 2 },
      { level: '差', count: 1 },
    ],
    ranking: names.map((company, i) => ({
      rank: i + 1,
      company,
      score: Math.max(60, base - i * 2 - (seed % 3)),
    })),
  };
}

/** 智慧物联消防 tab 尾部指标 mock(三类分设备在线率/火警处置/值班在岗无对应接口;安防 tab 设备指标与 AI 指标均已接接口,见 security-iot 组件) */
export const IOT_FIRE_TAIL_STATS: SituStat[] = [
  {
    label: '水压设备在线率', value: 98.6, unit: '%'
  },
  {
    label: '液位设备在线率', value: 97.9, unit: '%'
  },
  {
    label: '用传设备在线率', value: 96.8, unit: '%'
  },
  {
    label: '火警规范处置率', value: 95.6, unit: '%'
  },
  {
    label: '值班值守在岗率', value: 99.1, unit: '%'
  },
];

export interface EmergencyStatusRow {
  name: string;
  total: number;
  closed: number;
  handling: number;
  unresponsive: number;
}

export interface EmergencyStatusData {
  rows: EmergencyStatusRow[];
}

export function getEmergencyStatusData(scope: SituScope): EmergencyStatusData {
  const n = scope.city ? 2 : 3;
  return {
    rows: [
      {
        name: '自然灾害数量', total: n, closed: 0, handling: 0, unresponsive: 0
      },
      {
        name: '资产管护数量', total: n, closed: 0, handling: 0, unresponsive: 0
      },
      {
        name: '安全生产数量', total: n, closed: 0, handling: 0, unresponsive: 0
      },
      {
        name: '生态环保数量', total: n, closed: 0, handling: 0, unresponsive: 0
      },
    ],
  };
}

export interface WarningRow {
  content: string;
  level: string;
  time: string;
  location: string;
}

export interface WarningData {
  stats: SituStat[];
  warnings: WarningRow[];
}

const WARNING_ROWS: WarningRow[] = [
  {
    content: '台风', level: '红', time: '2026-03-29 17:00', location: '福建省福州市'
  },
  {
    content: '台风', level: '橙', time: '2026-03-30 09:00', location: '浙江省温州市'
  },
  {
    content: '暴雨', level: '黄', time: '2026-03-31 12:00', location: '广东省广州市'
  },
  {
    content: '暴雪', level: '蓝', time: '2026-04-01 08:00', location: '黑龙江省哈尔滨市'
  },
];

export function getWarningData(scope: SituScope): WarningData {
  const r = scope.city ? scopeRatio(scope) : 1;
  return {
    stats: [
      {
        label: '自然灾害预警', value: scaleNum(18, r), unit: '个'
      },
      {
        label: '已闭环', value: scaleNum(4, r), unit: '个'
      },
      {
        label: '处置中', value: scaleNum(8, r), unit: '个'
      },
      {
        label: '未响应', value: scaleNum(6, r), unit: '个'
      },
    ],
    warnings: WARNING_ROWS.slice(0, scope.city ? 2 : 4),
  };
}

export interface SuppliesTableRow {
  company: string;
  total: string;
  completion: string;
}

export interface SuppliesData {
  pie: SituPieItem[];
  pieTotal: number;
  table: SuppliesTableRow[];
}

/** 物资总数列(设计稿 6 行原值,行数超出时按等差回退) */
const SUPPLY_TOTALS = ['12.3万件', '12.2万件', '10.3万件', '9.3万件', '8.3万件', '7.3万件'];

/** 盘点完成率列(设计稿 6 行原值,行数超出时按 seed 散列回退) */
const SUPPLY_COMPLETIONS = [95, 95, 94, 94, 92, 92];

export function getSuppliesData(scope: SituScope): SuppliesData {
  // 公司名录与真实组织同源(全国 2 家/省级片区 mock)
  const names = companyNames(scope, 6);
  const seed = scopeSeed(scope);
  const pie: SituPieItem[] = [
    { name: '水泵', value: 300 },
    { name: '沙袋', value: 500 },
    { name: '应急手电筒', value: 100 },
    { name: '担架', value: 60 },
    { name: '救生衣', value: 40 },
  ];
  return {
    pie,
    pieTotal: sumPie(pie),
    table: names.map((company, i) => ({
      company,
      total: SUPPLY_TOTALS[i] ?? `${(7.3 - (i - 5) * 1).toFixed(1)}万件`,
      completion: `${SUPPLY_COMPLETIONS[i] ?? 90 + ((seed + i) % 5)}%`,
    })),
  };
}

export interface EmergencyManageRow {
  name: string;
  total: number;
  closed: number;
  unresponsive: number;
}

export interface EmergencyManageData {
  pie: SituPieItem[];
  pieTotal: number;
  rows: EmergencyManageRow[];
}

export function getEmergencyManageData(scope: SituScope): EmergencyManageData {
  const r = scope.city ? scopeRatio(scope) : 1;
  // 全国应急事件总数 15,均分 3 类;已闭环占比按类别给,未响应 = 总数 - 已闭环(任意 scope 缩放后仍自洽)
  const CLOSED_RATIO: Record<string, number> = {
    安全生产: 0.6, 生态环保: 0.4, 资产管护: 0.8
  };
  const rows: EmergencyManageRow[] = Object.entries(CLOSED_RATIO).map(([name, closedRatio]) => {
    const total = scaleNum(5, r);
    const closed = Math.round(total * closedRatio);
    return {
      name, total, closed, unresponsive: total - closed
    };
  });
  const pie = rows.map(({ name, total }) => ({ name, value: total }));
  return {
    pie,
    pieTotal: sumPie(pie),
    rows,
  };
}

export interface TeamTableRow {
  company: string;
  location: string;
  status: string;
}

export interface TeamData {
  stats: SituStat[];
  teams: TeamTableRow[];
}

export function getTeamData(scope: SituScope): TeamData {
  const names = companyNames(scope, 3);
  return {
    stats: [
      {
        label: '应急队伍', value: 18, unit: '支'
      },
      {
        label: '专职队伍', value: 9, unit: '支'
      },
      {
        label: '兼职队伍', value: 9, unit: '支'
      },
    ],
    teams: names.map((company, i) => ({
      company,
      location: ['燕郊科创园应急集结点', '中关村壹号应急集结点', '裕华产业园应急集结点'][i % 3],
      status: '可调用',
    })),
  };
}

export interface PlanRankingRow {
  rank: number;
  company: string;
  rate: string;
}

export interface PlanProjectRankingRow {
  rank: number;
  project: string;
  count: number;
}

export interface PlanData {
  pie: SituPieItem[];
  pieTotal: number;
  ranking: PlanRankingRow[];
  projectRanking: PlanProjectRankingRow[];
}

/** 演练率列(设计稿 3 行原值,行数超出时按等差回退) */
const PLAN_RATES = [90, 89, 88];

/** 项目 Tab 全国档固定名单(取后端组织架构真实项目) */
const PLAN_PROJECTS = ['京丰台区西罗园街道洋桥12号', '京海淀区信息路33号', '京东城区安德里北街21号院'];

/** 演练次数列(全国档原值,省/宗地按系数缩放) */
const PLAN_COUNTS = [12, 10, 8];

/** 排行类列表取前 N 个项目名:宗地按网格 orgId 过滤,省级取全省项目,全国用固定名单 */
function projectNames(scope: SituScope, count: number): string[] {
  if (!scope.city) return PLAN_PROJECTS.slice(0, count);
  const list = projectData.value[scope.city] ?? [];
  const filtered = scope.gridOrgId
    ? list.filter((p) => p.gridOrgId === scope.gridOrgId)
    : list;
  if (filtered.length) {
    return filtered.slice(0, count).map((p) => p.name);
  }
  // 无落库项目数据的省:按公司名生成
  const name = getCompanyByCityCode(scope.city)?.name.replace('公司', '') ?? '本公司';
  return Array.from({ length: count }, (_, i) => `${name}项目${i + 1}`);
}

export function getPlanData(scope: SituScope): PlanData {
  // 公司名录与真实组织同源(全国 2 家/省级片区 mock)
  const names = companyNames(scope, 3);
  const r = scopeRatio(scope);
  return {
    pie: [
      { name: '综合', value: 7 },
      { name: '专项', value: 7 },
      { name: '现场', value: 4 },
    ],
    pieTotal: 18,
    ranking: names.map((company, i) => ({
      rank: i + 1,
      company,
      rate: `${PLAN_RATES[i] ?? Math.max(60, 88 - i)}%`,
    })),
    projectRanking: projectNames(scope, 3).map((project, i) => ({
      rank: i + 1,
      project,
      count: scope.city ? scaleNum(PLAN_COUNTS[i] ?? 6, r) : (PLAN_COUNTS[i] ?? 6),
    })),
  };
}
