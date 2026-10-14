/**
 * 网格与省域公司数据(authOrgTree 实时派生):districts 取网格节点 gridRegions 的 regionName,
 * center 取宗地坐标均值;严格真实口径(gridRegions 空/宗地无坐标 → L2 不描边/L3 回退省中心,补录自动恢复)。
 * SFC 模板内自动解包,script 内须 .value。
 */
import { computed } from 'vue';

import { isValidCoords, projectData } from './project-data';

import type { ProjectItem } from './project-data';

import { GRID_COLORS, provinceCodeOf, toShortName } from '@/constants/map';
import { childNodesOf, orgTree, provinceCodeOfCompany } from '@/store/org';

/** 面板数据视角:'country' 全国 | 省码(前 2 位,公司节点 adCode 派生) */
export type DashboardScope = 'country' | string;

/** 网格配置(L2 渲染用):省码 → 网格列表 */
export interface GridConfig {
  /** 网格 orgId */
  orgId: string;
  /** 网格名(真实组织架构网格层,仅展示;路由 query grid 与 projectData 过滤均走 orgId) */
  name: string;
  /** 覆盖行政区全名(gridRegions regionName,如 '丰台区');空 → L2 不描边不挂标签 */
  districts: string[];
  /** 色板索引(GRID_COLORS 循环),按公司内网格树序分配 */
  colorIndex: number;
  /** 网格锚点(宗地坐标均值);无坐标宗地为 undefined(L3 回退省中心) */
  center?: { lng: number; lat: number };
  /** L3 网格视角初始缩放(缺省 GRID_VIEW_ZOOM) */
  zoom?: number;
}

/** 网格缩放覆盖:海淀/丰台宗地邻近压字,放大到 12;键 = 网格 orgId */
const ZOOM_BY_GRID_ORG_ID: Record<string, number> = {
  '2092557141152862208': 12,
  '2092557035075145728': 12,
};

/** 行政区名归一(去尾部行政区后缀):'石家庄市'→'石家庄'、'丰台区'→'丰台';比对边界名/网格 districts 用 */
export const districtShortOf = (name: string): string =>
  name.replace(/(壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市|区|县)$/, '');

/**
 * 网格配置(省码 → 网格列表);仅有网格节点的公司入列——可定位省码但无网格的公司不入
 * (空数组 truthy 会让 L2 误走网格分支、市标签不挂),L2 走 mountCityLabels 普通省分支。
 * 同省多家公司后者覆盖前者(实际一省一公司)。
 */
export const GRID_CONFIG = computed<Record<string, GridConfig[]>>(() => {
  const result: Record<string, GridConfig[]> = {};
  orgTree.value.forEach((company) => {
    const cityCode = provinceCodeOfCompany(company);
    const grids = childNodesOf(company, '4');
    if (!cityCode || !grids.length) return;
    result[cityCode] = grids.map((grid, index) => {
      const coordinated = childNodesOf(grid, '6').filter((parcel) =>
        isValidCoords(parcel.longitude, parcel.latitude));
      const zoom = ZOOM_BY_GRID_ORG_ID[grid.orgId];
      return {
        orgId: grid.orgId,
        name: grid.name,
        districts: (grid.gridRegions ?? []).map((item) => item.regionName),
        colorIndex: index % GRID_COLORS.length,
        ...(coordinated.length
          ? {
            center: {
              lng: coordinated.reduce((sum, p) => sum + (p.longitude ?? 0), 0) / coordinated.length,
              lat: coordinated.reduce((sum, p) => sum + (p.latitude ?? 0), 0) / coordinated.length,
            },
          }
          : {}),
        ...(zoom ? { zoom } : {}),
      };
    });
  });
  return result;
});

/** 行政区名(全名或短名)→ 所属网格(含色板),找不到返回 null */
export function findGridByDistrict(cityCode: string, districtName: string): GridConfig | null {
  const grids = GRID_CONFIG.value[cityCode];
  if (!grids) return null;
  // 边界数据的区名带后缀('海淀区'/'石家庄市'),toShortName 只剥省/市/自治区不剥「区」,
  // 配置侧 districts 也是全名('丰台区'/'石家庄市')——两侧都经 districtShortOf 归一后前缀匹配,兼容已短名
  const short = districtShortOf(toShortName(districtName));
  return (
    grids.find((g) =>
      g.districts.some((d) => {
        const districtShort = districtShortOf(d);
        return short === districtShort || short.startsWith(districtShort);
      })) || null
  );
}

/** 网格资产数(标签数字用;gridOrgId = 网格 orgId) */
export function getGridAssetCount(cityCode: string, gridOrgId: string): number {
  return getGridProjects(cityCode, gridOrgId).length;
}

/** 网格资产清单(与 L3 撒点同口径):按网格 orgId 匹配;无网格省点市标签传市名,按 cityName 兜底 */
export function getGridProjects(cityCode: string, gridOrgId: string): ProjectItem[] {
  const list = projectData.value[cityCode] || [];
  return list.filter((p) => p.gridOrgId === gridOrgId || p.cityName === gridOrgId);
}

/** 省域公司(真实组织架构同源派生) */
export interface ProvinceCompany {
  /** 省码(前 2 位;路由 /dashboard/:city 参数值,公司节点 adCode 派生) */
  cityCode: string;
  /** 公司 orgId(组织判定/接口入参用) */
  orgId: string;
  /** 公司名(仅展示) */
  name: string;
}

/** 省域公司清单(authOrgTree 同源;cityCode = provinceCodeOfCompany 推导,均未命中为空串) */
export const getProvinceCompanies = (): ProvinceCompany[] =>
  orgTree.value.map((company) => ({
    cityCode: provinceCodeOfCompany(company),
    orgId: company.orgId,
    name: company.name,
  }));

/** 省码(任意位数行政码均可)→ 公司(实时组织架构同源索引;无 adCode 的公司查不到) */
export const getCompanyByCityCode = (cityCode?: string): ProvinceCompany | undefined =>
  getProvinceCompanies().find((c) => c.cityCode === provinceCodeOf(cityCode));
