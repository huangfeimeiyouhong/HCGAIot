/**
 * M-01 租户（24 条 = 4 厂家 + 20 客户）+ M-02 账号（60 条）
 * ⚠️ 客户行业分布按 8 学校食堂 / 5 酒店 / 4 团餐 / 3 经销商构造（Q-A6 待 Phil 提供真实名单）
 */
import { addDays } from '@/utils/date';

import type { Random } from '../types';
import type { AccountRole, CustomerIndustry, Tenant, TenantAccount } from '@/types';

/** 厂家租户定义（固定 4 家，id 与 demoAccounts.ts 一致） */
const VENDOR_DEFS: Array<{ id: string; name: string; shortName: string; vendorType: 'COOKWARE' | 'IOT'; auditStatus: Tenant['auditStatus'] }> = [
  { id: 'TEN-0001', name: '福州华厨设备制造有限公司', shortName: '福州华厨', vendorType: 'COOKWARE', auditStatus: 'ACTIVE' },
  { id: 'TEN-0002', name: '厦门智联感知科技有限公司', shortName: '厦门智联', vendorType: 'IOT', auditStatus: 'ACTIVE' },
  { id: 'TEN-0003', name: '泉州闽南灶具股份有限公司', shortName: '闽南灶具', vendorType: 'COOKWARE', auditStatus: 'TRIAL' },
  { id: 'TEN-0004', name: '泉州蓝芯物联网科技有限公司', shortName: '蓝芯物联', vendorType: 'IOT', auditStatus: 'DRAFT' },
];

/** 客户租户定义（前缀 + 行业），20 条 */
const CUSTOMER_DEFS: Array<{ prefix: string; name: string; shortName: string; industry: CustomerIndustry }> = [
  { prefix: '福州第一中学', name: '福州市第一中学食堂', shortName: '福州一中', industry: 'SCHOOL' },
  { prefix: '福州第二中学', name: '福州市第二中学食堂', shortName: '福州二中', industry: 'SCHOOL' },
  { prefix: '福州实验小学', name: '福州市实验小学食堂', shortName: '福州实验小学', industry: 'SCHOOL' },
  { prefix: '福州第八中学', name: '福州市第八中学食堂', shortName: '福州八中', industry: 'SCHOOL' },
  { prefix: '泉州第一中学', name: '泉州市第一中学食堂', shortName: '泉州一中', industry: 'SCHOOL' },
  { prefix: '厦门第六中学', name: '厦门市第六中学食堂', shortName: '厦门六中', industry: 'SCHOOL' },
  { prefix: '莆田第五中学', name: '莆田市第五中学食堂', shortName: '莆田五中', industry: 'SCHOOL' },
  { prefix: '漳州实验中学', name: '漳州市实验中学食堂', shortName: '漳州实验中学', industry: 'SCHOOL' },
  { prefix: '厦门海景', name: '厦门海景国际酒店餐饮部', shortName: '厦门海景酒店', industry: 'HOTEL' },
  { prefix: '福州西湖', name: '福州西湖大酒店餐饮部', shortName: '福州西湖酒店', industry: 'HOTEL' },
  { prefix: '泉州晋江', name: '泉州晋江国际大酒店餐饮部', shortName: '晋江国际酒店', industry: 'HOTEL' },
  { prefix: '莆田戴斯', name: '莆田戴斯大酒店餐饮部', shortName: '莆田戴斯', industry: 'HOTEL' },
  { prefix: '漳州香江', name: '漳州香江酒店餐饮部', shortName: '漳州香江', industry: 'HOTEL' },
  { prefix: '福州金膳', name: '福州金膳团餐企业管理有限公司', shortName: '福州金膳团餐', industry: 'GROUP_MEAL' },
  { prefix: '厦门味优', name: '厦门味优团餐服务有限公司', shortName: '厦门味优团餐', industry: 'GROUP_MEAL' },
  { prefix: '泉州丰味', name: '泉州丰味团餐管理有限公司', shortName: '泉州丰味团餐', industry: 'GROUP_MEAL' },
  { prefix: '漳州香满', name: '漳州香满园团餐有限公司', shortName: '漳州香满团餐', industry: 'GROUP_MEAL' },
  { prefix: '福州闽厨', name: '福州闽厨设备经销商', shortName: '福州闽厨', industry: 'DEALER' },
  { prefix: '厦门厨通', name: '厦门厨通设备有限公司', shortName: '厦门厨通', industry: 'DEALER' },
  { prefix: '泉州厨配', name: '泉州厨配供应链有限公司', shortName: '泉州厨配', industry: 'DEALER' },
];

/**
 * 生成租户
 * @param r 随机工具
 * @returns 24 条租户（4 厂家 + 20 客户）
 */
export function genTenants(r: Random): Tenant[] {
  const tenants: Tenant[] = [];

  // ── 4 家厂家 ──
  VENDOR_DEFS.forEach((def, index) => {
    const createdAt = addDays(new Date().toISOString(), -(300 - index * 45));
    tenants.push({
      id: def.id,
      name: def.name,
      shortName: def.shortName,
      type: 'VENDOR',
      vendorType: def.vendorType,
      auditStatus: def.auditStatus,
      status: def.auditStatus === 'ACTIVE' || def.auditStatus === 'TRIAL' ? 'ACTIVE' : 'PENDING',
      contact: `联系人${String.fromCharCode(65 + index)}`,
      contactPhone: `139${r.pad(r.int(10000000, 99999999), 8)}`,
      // 服务范围：厂家可见的客户子集，绑定申报时会做范围校验
      serviceScope: [],
      createdAt,
      validFrom: createdAt,
      validTo: addDays(createdAt, 1095),
      contractNo: `HT-2026-${r.pad(index + 1, 3)}`,
      settlementAccount: `6222${r.pad(r.int(100000000, 999999999), 12)}`,
    });
  });

  // ── 20 家客户 ──
  CUSTOMER_DEFS.forEach((def, index) => {
    const seq = index + 5;
    const createdAt = addDays(new Date().toISOString(), -r.int(60, 500));
    tenants.push({
      id: `TEN-${r.pad(seq, 4)}`,
      name: def.name,
      shortName: def.shortName,
      type: 'CUSTOMER',
      industry: def.industry,
      auditStatus: 'ACTIVE',
      status: 'ACTIVE',
      contact: `${def.shortName}负责人`,
      contactPhone: `138${r.pad(r.int(10000000, 99999999), 8)}`,
      serviceScope: [],
      vendorCount: r.int(1, 3),
      createdAt,
      validFrom: createdAt,
      validTo: addDays(createdAt, 1095),
      contractNo: `HT-2026-${r.pad(seq, 3)}`,
      settlementAccount: `6217${r.pad(r.int(100000000, 999999999), 12)}`,
    });
  });

  // ── 厂家服务范围：覆盖约 6~10 个客户（未覆盖的客户用于演示「不在服务范围」拦截）──
  const customerIds = tenants.filter((t) => t.type === 'CUSTOMER').map((t) => t.id);
  VENDOR_DEFS.forEach((def, index) => {
    const target = tenants.find((t) => t.id === def.id)!;
    const size = [8, 7, 6, 5][index] ?? 6;
    target.serviceScope = r.shuffle(customerIds).slice(0, size);
  });

  return tenants;
}

/** 账号角色池（按租户类型） */
function accountRolesFor(type: Tenant['type']): AccountRole[] {
  return type === 'VENDOR'
    ? ['VENDOR_ADMIN', 'VENDOR_ENGINEER', 'VENDOR_VIEWER']
    : ['CUSTOMER_ADMIN', 'CUSTOMER_OPERATOR', 'CUSTOMER_VIEWER'];
}

/**
 * 生成租户账号（60 条）
 * @param r 随机工具
 * @param tenants 租户列表（提供 tenantId 候选）
 * @returns 60 条账号
 */
export function genTenantAccounts(r: Random, tenants: Tenant[]): TenantAccount[] {
  const accounts: TenantAccount[] = [];
  const total = 60;
  const activeTenants = tenants.filter((t) => t.status === 'ACTIVE' || t.auditStatus === 'ACTIVE');

  for (let i = 1; i <= total; i += 1) {
    const tenant = r.pick(activeTenants.length ? activeTenants : tenants);
    const roles = accountRolesFor(tenant.type);
    const role = i <= roles.length ? roles[i - 1]! : r.pick(roles);
    const createdAt = addDays(new Date().toISOString(), -r.int(30, 400));
    accounts.push({
      id: `ACC-${r.pad(i, 4)}`,
      tenantId: tenant.id,
      name: `${tenant.shortName}${['管理员', '工程师', '操作员', '观察员'][r.int(0, 3)]}`,
      account: `user${r.pad(i, 4)}`,
      role,
      // 约 1/6 待审批、1/10 禁用，其余启用
      status: r.bool(0.16) ? 'PENDING_APPROVE' : r.bool(0.08) ? 'DISABLED' : 'ACTIVE',
      phone: `137${r.pad(r.int(10000000, 99999999), 8)}`,
      lastLoginAt: addDays(new Date().toISOString(), -r.int(0, 30)),
      createdAt,
    });
  }

  return accounts;
}