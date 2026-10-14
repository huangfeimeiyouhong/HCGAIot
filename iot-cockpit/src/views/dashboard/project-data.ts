/**
 * 宗地/项目数据(authOrgTree 实时派生):名称/层级/orgId/坐标(organization_extend)一律真实,
 * 未录坐标不撒点、补录自动恢复。SFC 模板内自动解包,script 内须 .value。
 */
import { computed } from 'vue';

import { childNodesOf, orgTree, provinceCodeOfCompany } from '@/store/org';

/** 宗地数据(真实组织架构派生) */
export interface ProjectItem {
  /** 宗地 orgId(= /project/:cityId/:projectId 的 projectId,勿 Number()) */
  id: string;
  name: string;
  /** 经度(organization_extend 未录时 undefined,不撒点) */
  lng?: number;
  lat?: number;
  /** 所在省/市名(后端 prov 字段) */
  cityName: string;
  /** 所属网格 orgId(组织过滤用) */
  gridOrgId: string;
  /** 所属省域公司名(详情页管理单位用) */
  companyName: string;
}

/** 双字段均非 null/undefined 才视为有效坐标 */
export const isValidCoords = (lng?: number | null, lat?: number | null): boolean =>
  lng !== undefined && lng !== null && lat !== undefined && lat !== null;

/**
 * 宗地清单(省码 → 宗地列表,真实组织架构派生):
 * 可定位省码的公司入列(provinceCodeOfCompany:adCode 优先/公司名兜底;与路由 :city 一致,
 * 无网格公司为空数组——L1 可点、L2 无撒点),树未就位/接口失败时为空对象(空态不崩);
 * 宗地顺序 = 后端网格树序。
 */
export const projectData = computed<Record<string, ProjectItem[]>>(() => {
  const result: Record<string, ProjectItem[]> = {};
  orgTree.value.forEach((company) => {
    const cityCode = provinceCodeOfCompany(company);
    if (!cityCode) return;
    result[cityCode] = childNodesOf(company, '4').flatMap((grid) =>
      childNodesOf(grid, '6').map((parcel) => ({
        id: parcel.orgId,
        name: parcel.name,
        lng: parcel.longitude ?? undefined,
        lat: parcel.latitude ?? undefined,
        cityName: parcel.prov ?? '',
        gridOrgId: grid.orgId,
        companyName: company.name,
      })),
    );
  });
  return result;
});
