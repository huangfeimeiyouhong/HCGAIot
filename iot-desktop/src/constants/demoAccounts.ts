/**
 * 演示账号清单 —— 登录页下拉的数据源（13 个账号）
 * ⚠️ 改账号需同步：mock/factories/tenants.ts 的租户 id + README.md 账号表（约定 6 / S10）
 */
import type { AccountRole, OnboardingStatus, Role, VendorType } from '@/types';

/** 演示账号定义 */
export interface DemoAccount {
  /** 登录账号 */
  account: string;
  /** 密码（mock 模式任意非空即通过，此处仅为展示） */
  password: string;
  /** 入口角色 */
  role: Role;
  /** 账号角色（细粒度权限） */
  accountRole: AccountRole;
  /** 所属租户 id */
  tenantId: string;
  /** 所属厂家 id（仅厂家端） */
  vendorId?: string | null;
  /** 厂家类型（仅厂家端） */
  vendorType?: VendorType | null;
  /** 展示名 */
  displayName: string;
  /** 入驻状态（仅厂家端，用于演示未入驻/TRIAL/ACTIVE） */
  onboardingStatus?: OnboardingStatus | null;
  /** 登录后落地页说明 */
  landing: string;
}

/**
 * 13 个演示账号
 * 租户 id 约定：厂家 TEN-0001 ~ TEN-0004；客户 TEN-0005 ~ TEN-0024
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  // ── 平台方 4 类（tenantId 为 null，全局范围）──
  {
    account: 'plat_admin',
    password: 'demo123',
    role: 'PLATFORM',
    accountRole: 'PLATFORM_ADMIN',
    tenantId: 'PLATFORM',
    vendorId: null,
    vendorType: null,
    displayName: '平台超级管理员',
    onboardingStatus: null,
    landing: '/platform/dashboard',
  },
  {
    account: 'plat_reviewer',
    password: 'demo123',
    role: 'PLATFORM',
    accountRole: 'REVIEWER',
    tenantId: 'PLATFORM',
    vendorId: null,
    vendorType: null,
    displayName: '入驻审核员·林岚',
    onboardingStatus: null,
    landing: '/platform/review/applications',
  },
  {
    account: 'plat_ops',
    password: 'demo123',
    role: 'PLATFORM',
    accountRole: 'OPS',
    tenantId: 'PLATFORM',
    vendorId: null,
    vendorType: null,
    displayName: '运营专员·陈昊',
    onboardingStatus: null,
    landing: '/platform/alarms',
  },
  {
    account: 'plat_data',
    password: 'demo123',
    role: 'PLATFORM',
    accountRole: 'DATA_OPS',
    tenantId: 'PLATFORM',
    vendorId: null,
    vendorType: null,
    displayName: '数据专员·苏晴',
    onboardingStatus: null,
    landing: '/platform/vendor-performance',
  },

  // ── 厂家端 3 类 × 2 厂家类型（TEN-0001 厨具 / TEN-0002 物联网）──
  {
    account: 'vendor_ck_admin',
    password: 'demo123',
    role: 'VENDOR',
    accountRole: 'VENDOR_ADMIN',
    tenantId: 'TEN-0001',
    vendorId: 'TEN-0001',
    vendorType: 'COOKWARE',
    displayName: '厨具厂家·福州华厨设备（管理员）',
    onboardingStatus: 'ACTIVE',
    landing: '/vendor/dashboard',
  },
  {
    account: 'vendor_ck_engineer',
    password: 'demo123',
    role: 'VENDOR',
    accountRole: 'VENDOR_ENGINEER',
    tenantId: 'TEN-0001',
    vendorId: 'TEN-0001',
    vendorType: 'COOKWARE',
    displayName: '厨具厂家·福州华厨设备（工程师）',
    onboardingStatus: 'ACTIVE',
    landing: '/vendor/work-orders',
  },
  {
    account: 'vendor_iot_admin',
    password: 'demo123',
    role: 'VENDOR',
    accountRole: 'VENDOR_ADMIN',
    tenantId: 'TEN-0002',
    vendorId: 'TEN-0002',
    vendorType: 'IOT',
    displayName: '物联网厂家·厦门智联感知（管理员）',
    onboardingStatus: 'ACTIVE',
    landing: '/vendor/dashboard',
  },
  {
    account: 'vendor_iot_engineer',
    password: 'demo123',
    role: 'VENDOR',
    accountRole: 'VENDOR_ENGINEER',
    tenantId: 'TEN-0002',
    vendorId: 'TEN-0002',
    vendorType: 'IOT',
    displayName: '物联网厂家·厦门智联感知（工程师）',
    onboardingStatus: 'ACTIVE',
    landing: '/vendor/components',
  },
  {
    account: 'vendor_trial',
    password: 'demo123',
    role: 'VENDOR',
    accountRole: 'VENDOR_ADMIN',
    tenantId: 'TEN-0003',
    vendorId: 'TEN-0003',
    vendorType: 'COOKWARE',
    displayName: '厨具厂家·泉州闽南灶具（试运营中）',
    onboardingStatus: 'TRIAL',
    landing: '/vendor/onboarding',
  },
  {
    account: 'vendor_unbound',
    password: 'demo123',
    role: 'VENDOR',
    accountRole: 'VENDOR_ADMIN',
    tenantId: 'TEN-0004',
    vendorId: 'TEN-0004',
    vendorType: 'IOT',
    displayName: '物联网厂家·泉州蓝芯物联（未入驻）',
    onboardingStatus: null,
    landing: '/vendor/onboarding',
  },

  // ── 客户端 3 类 ──
  {
    account: 'cust_school_admin',
    password: 'demo123',
    role: 'CUSTOMER',
    accountRole: 'CUSTOMER_ADMIN',
    tenantId: 'TEN-0005',
    vendorId: null,
    vendorType: null,
    displayName: '福州第一中学食堂（管理员）',
    onboardingStatus: null,
    landing: '/customer/dashboard',
  },
  {
    account: 'cust_hotel_admin',
    password: 'demo123',
    role: 'CUSTOMER',
    accountRole: 'CUSTOMER_ADMIN',
    tenantId: 'TEN-0009',
    vendorId: null,
    vendorType: null,
    displayName: '厦门海景国际酒店（管理员）',
    onboardingStatus: null,
    landing: '/customer/dashboard',
  },
  {
    account: 'cust_group_operator',
    password: 'demo123',
    role: 'CUSTOMER',
    accountRole: 'CUSTOMER_OPERATOR',
    tenantId: 'TEN-0015',
    vendorId: null,
    vendorType: null,
    displayName: '福州金膳团餐（操作员）',
    onboardingStatus: null,
    landing: '/customer/work-orders',
  },
];

/**
 * 按角色取演示账号（登录页下拉）
 * @param role 入口角色
 * @returns 账号数组
 */
export function demoAccountsOf(role: Role): DemoAccount[] {
  return DEMO_ACCOUNTS.filter((a) => a.role === role);
}

/**
 * 按账号查演示账号
 * @param account 账号名
 * @returns 账号定义；不存在返回 undefined
 */
export function findDemoAccount(account: string): DemoAccount | undefined {
  return DEMO_ACCOUNTS.find((a) => a.account === account);
}