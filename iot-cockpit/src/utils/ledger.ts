/**
 * 台账入口跳转参数:org = 视角组织 orgId(网格级优先,回退公司级),与台账级联选中值同口径;
 * 全国视角无参。
 */
import type { LocationQueryRaw } from 'vue-router';

import { getCompanyByCityCode } from '@/views/dashboard/grid-data';

/** city = 省码(反查公司 orgId),gridOrgId = 网格 orgId(优先) */
export const buildLedgerQuery = (city?: string, gridOrgId?: string): LocationQueryRaw => {
  const org = gridOrgId || (city ? getCompanyByCityCode(city)?.orgId ?? '' : '');
  return org ? { org } : {};
};
