/**
 * 组织数据(mock 版):静态内置组织树,派生层与真实项目同口径。
 * 层级:集团(根)→省域公司(type 3)→网格(type 4)→宗地/项目(type 6,同节点)。
 * 接入真实组织接口时:把 MOCK_ORG_LIST 换成接口回包赋值给 orgList 即可,派生层与页面零改动。
 */
import { computed } from 'vue';

import { defineStore } from 'pinia';

import { provinceCodeOf, provinceCodeOfName } from '@/constants/map';

/** 组织节点(模板所需最小字段集) */
export interface OrgNode {
  id?: string | number;
  orgId: string;
  idPath?: string;
  name: string;
  /** 组织类型(1集团 3省域公司 4网格 6宗地/项目;判等须 String() 归一) */
  type: string | number;
  channel?: string;
  /** 省级行政区划码(地区公司节点,如 '110000';前 2 位 = 省码) */
  adCode?: string;
  /** 经度(宗地节点) */
  longitude?: number | null;
  /** 纬度(宗地节点) */
  latitude?: number | null;
  /** 所在省/市名(宗地节点展示用) */
  prov?: string;
  /** 网格覆盖行政区清单(网格节点) */
  gridRegions?: { regionName: string }[];
  children?: OrgNode[];
  [key: string]: unknown;
}

/** mock 组织树:2 家省域公司(北京/河北),各 2 个网格,每网格 2~3 宗地带坐标 */
const MOCK_ORG_LIST: OrgNode[] = [
  {
    orgId: '1000000000000000001',
    name: '示例集团',
    type: '1',
    children: [
      {
        orgId: '1000000000000000101',
        name: '北京公司',
        type: '3',
        adCode: '110000',
        children: [
          {
            orgId: '1000000000000000201',
            name: '海淀网格',
            type: '4',
            gridRegions: [{ regionName: '海淀区' }, { regionName: '朝阳区' }],
            children: [
              {
                orgId: '1000000000000000301', name: '中关村壹号', type: '6',
                longitude: 116.28, latitude: 40.05, prov: '北京',
              },
              {
                orgId: '1000000000000000302', name: '望京科技园', type: '6',
                longitude: 116.47, latitude: 40.0, prov: '北京',
              },
            ],
          },
          {
            orgId: '1000000000000000202',
            name: '丰台网格',
            type: '4',
            gridRegions: [{ regionName: '丰台区' }, { regionName: '大兴区' }],
            children: [
              {
                orgId: '1000000000000000303', name: '丽泽商务中心', type: '6',
                longitude: 116.32, latitude: 39.87, prov: '北京',
              },
              {
                orgId: '1000000000000000304', name: '大兴物流园', type: '6',
                longitude: 116.42, latitude: 39.73, prov: '北京',
              },
            ],
          },
        ],
      },
      {
        orgId: '1000000000000000102',
        name: '河北公司',
        type: '3',
        adCode: '130000',
        children: [
          {
            orgId: '1000000000000000203',
            name: '石家庄网格',
            type: '4',
            gridRegions: [{ regionName: '石家庄市' }],
            children: [
              {
                orgId: '1000000000000000305', name: '裕华产业园', type: '6',
                longitude: 114.52, latitude: 38.03, prov: '河北',
              },
              {
                orgId: '1000000000000000306', name: '正定仓储中心', type: '6',
                longitude: 114.57, latitude: 38.15, prov: '河北',
              },
            ],
          },
          {
            orgId: '1000000000000000204',
            name: '廊坊网格',
            type: '4',
            gridRegions: [{ regionName: '廊坊市' }],
            children: [
              {
                orgId: '1000000000000000307', name: '燕郊科创园', type: '6',
                longitude: 116.81, latitude: 39.95, prov: '河北',
              },
            ],
          },
        ],
      },
    ],
  },
];

type State = {
  orgList: OrgNode[];
};

export const useOrgStore = defineStore('_org', {
  state: (): State => ({
    // mock:静态树直接内置;接真实接口时改为 [] 由 action 拉取回填
    orgList: MOCK_ORG_LIST,
  }),
});

/**
 * ==================== 组织派生层(与真实项目同口径) ====================
 * 组织判定一律 orgId,名称仅展示。
 */
/** 省域公司层(type 3) */
export const orgTree = computed<OrgNode[]>(() =>
  useOrgStore().orgList.flatMap((root) =>
    (root.children ?? []).filter((child) => String(child.type) === '3'),
  ),
);

/** 节点子级按 type 取('4' 网格 / '6' 宗地·项目) */
export const childNodesOf = (node: OrgNode, type: string): OrgNode[] =>
  (node.children ?? []).filter((child) => String(child.type) === type);

/** 地区公司 → 省码(前 2 位):节点 adCode 优先,无 adCode 按公司名含省名兜底;均未命中返回 '' */
export const provinceCodeOfCompany = (company: OrgNode): string =>
  provinceCodeOf(company.adCode) || provinceCodeOfName(company.name);

/** 台账叶子(宗地,宗地名=项目名);orgId 供过滤与接口入参,名称仅展示 */
export interface LedgerOrgLeaf {
  companyOrgId: string;
  /** 省域公司名 */
  company: string;
  gridOrgId: string;
  /** 网格名 */
  grid: string;
  parcelOrgId: string;
  /** 宗地名(= 项目名) */
  parcel: string;
  /** 宗地节点组织类型('6'=宗地/项目) */
  parcelType: string;
}

export const LEDGER_ORG_LEAVES = computed<LedgerOrgLeaf[]>(() =>
  orgTree.value.flatMap((company) =>
    childNodesOf(company, '4').flatMap((grid) =>
      childNodesOf(grid, '6').map((parcel) => ({
        companyOrgId: company.orgId,
        company: company.name,
        gridOrgId: grid.orgId,
        grid: grid.name,
        parcelOrgId: parcel.orgId,
        parcel: parcel.name,
        parcelType: String(parcel.type),
      })),
    ),
  ),
);

/** 级联树节点(公司 → 网格 → 宗地 三层,value 均 orgId) */
export interface LedgerOrgOption {
  label: string;
  value: string;
  children?: LedgerOrgOption[];
}

export const LEDGER_ORG_OPTIONS = computed<LedgerOrgOption[]>(() =>
  orgTree.value.map((company) => ({
    label: company.name,
    value: company.orgId,
    children: childNodesOf(company, '4').map((grid) => ({
      label: grid.name,
      value: grid.orgId,
      children: childNodesOf(grid, '6').map((parcel) => ({
        label: parcel.name,
        value: parcel.orgId,
      })),
    })),
  })),
);

/** 级联选中值 → 层级条目(orgId 索引;未选到的层级缺省) */
interface OrgScopeEntry {
  company: OrgNode;
  grid?: OrgNode;
  parcel?: OrgNode;
}

const ORG_SCOPE_INDEX = computed(() => {
  const index = new Map<string, OrgScopeEntry>();
  orgTree.value.forEach((company) => {
    index.set(company.orgId, { company });
    childNodesOf(company, '4').forEach((grid) => {
      index.set(grid.orgId, { company, grid });
      childNodesOf(grid, '6').forEach((parcel) => {
        index.set(parcel.orgId, {
          company,
          grid,
          parcel,
        });
      });
    });
  });
  return index;
});

const scopeEntryOf = (
  value: string | number | null | undefined,
): OrgScopeEntry | undefined =>
  value === null || value === undefined || value === ''
    ? undefined
    : ORG_SCOPE_INDEX.value.get(String(value));

/** 级联选中值 → 选中层节点(宗地 > 网格 > 公司) */
export const scopeNodeOf = (
  value: string | number | null | undefined,
): OrgNode | undefined => {
  const entry = scopeEntryOf(value);
  return entry ? (entry.parcel ?? entry.grid ?? entry.company) : undefined;
};

/** 台账组织过滤条件(orgId 等值;空 = 全部) */
export interface LedgerOrgFilters {
  companyOrgId: string;
  gridOrgId: string;
  parcelOrgId: string;
}

export const orgFiltersOf = (
  value: string | number | null | undefined,
): LedgerOrgFilters => {
  const entry = scopeEntryOf(value);
  return {
    companyOrgId: entry?.company.orgId ?? '',
    gridOrgId: entry?.grid?.orgId ?? '',
    parcelOrgId: entry?.parcel?.orgId ?? '',
  };
};

/**
 * 范围内全量宗地 orgId(统计类接口入参)。
 * 未传 = 全国;公司/网格 = 子树下全部宗地;宗地 = 自身。
 */
export const parcelOrgIdsOf = (value?: string | number | null): string[] => {
  const entry = scopeEntryOf(value);
  if (!entry) {
    return orgTree.value.flatMap((company) =>
      childNodesOf(company, '4').flatMap((grid) =>
        childNodesOf(grid, '6').map((parcel) => parcel.orgId),
      ),
    );
  }
  if (entry.parcel) return [entry.parcel.orgId];
  const grids = entry.grid ? [entry.grid] : childNodesOf(entry.company, '4');
  return grids.flatMap((grid) =>
    childNodesOf(grid, '6').map((parcel) => parcel.orgId),
  );
};

/** 视角组织节点 orgId:选中哪层取哪层;不传 = 集团根。未命中返回 '' */
export const scopeOrgIdOf = (value?: string | number | null): string => {
  if (value === null || value === undefined || value === '')
    return useOrgStore().orgList[0]?.orgId ?? '';
  return scopeNodeOf(value)?.orgId ?? '';
};

/** orgId → 选中层组织节点名(展示反查);未命中 '' */
export const orgNameOf = (value?: string | number | null): string =>
  scopeNodeOf(value)?.name ?? '';
