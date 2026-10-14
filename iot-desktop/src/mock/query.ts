/**
 * ★ 泛型查询管道 —— 数据隔离的唯一实现点
 *
 * 所有 api 列表方法必须经过 scopedQuery；单条读取走 scopedFind（先校验可见性）；
 * 写入走 scopedMutate（先校验可见性再改）。页面永远拿不到全量数组引用。
 *
 * ⚠️ 改这里需同步 mock/scope.ts 的三个分支与 utils/mask.ts（约定 6 / S6）
 */
import { maskFields, stripFields } from '@/utils/mask';

import type { Scope } from './types';
import type { PageResult } from '@/types';

/** 泛型行约束 */
export type Row = Record<string, any>;

/**
 * 行级过滤：按 scope 过滤出可见行
 *
 * 规则（与架构文档附录 B.1 一致）：
 * - 三个维度都为 null（平台方）→ 全量通过
 * - 设备维度：行上的 sn / deviceSn 必须在 visibleDeviceSns 内
 * - 客户维度：行上的 customerId 必须在 visibleCustomerIds 内
 * - 厂家维度：行上的 vendorIds / vendorId 必须命中 visibleVendorIds
 *
 * ⚠️ 行上没有对应维度字段时不参与该维度判定（如租户列表没有 sn）
 * @param rows 原始行
 * @param scope 当前范围
 * @param skipDeviceScope 是否跳过设备维度判定（待确认绑定等「设备尚未可见」的行用）
 * @returns 可见行
 */
function applyScopeFilter<T extends Row>(rows: T[], scope: Scope, skipDeviceScope = false): T[] {
  if (!scope.visibleDeviceSns && !scope.visibleCustomerIds && !scope.visibleVendorIds) return rows;

  return rows.filter((row) => {
    // 设备维度
    if (scope.visibleDeviceSns && !skipDeviceScope) {
      const sn = (row.sn ?? row.deviceSn) as string | undefined;
      if (sn && !scope.visibleDeviceSns.has(sn)) return false;
    }
    // 客户维度
    if (scope.visibleCustomerIds) {
      const customerId = (row.customerId ?? row.ownerCustomerId ?? row.tenantId) as string | undefined;
      // 工单/告警的 customerId 与设备的 ownerCustomerId 语义一致，统一判定
      if (customerId && !scope.visibleCustomerIds.has(customerId)) return false;
    }
    // 厂家维度
    if (scope.visibleVendorIds) {
      const vendorIds: string[] = Array.isArray(row.vendorIds)
        ? (row.vendorIds as string[])
        : row.vendorId
          ? [row.vendorId as string]
          : [];
      if (vendorIds.length && !vendorIds.some((id) => scope.visibleVendorIds!.has(id))) return false;
    }
    return true;
  });
}

/**
 * 字段裁剪 + 脱敏（浅拷贝，不污染原始集合）
 * @param rows 可见行
 * @param scope 当前范围
 * @param extraStrip 本次查询附加的裁剪字段
 * @returns 处理后的行
 */
function applyFieldScope<T extends Row>(rows: T[], scope: Scope, extraStrip: string[] = []): T[] {
  const strip = [...scope.stripFields, ...extraStrip];
  if (!strip.length && !scope.maskFields.length) return rows;
  return rows.map((row) => {
    const cloned = { ...row } as Row;
    if (strip.length) stripFields(cloned, strip);
    if (scope.maskFields.length) maskFields(cloned, scope.maskFields);
    return cloned as T;
  });
}

/**
 * 关键字模糊匹配
 * @param rows 行
 * @param fields 参与搜索的字段
 * @param keyword 关键字（大小写不敏感）
 * @returns 命中行
 */
function keywordMatch<T extends Row>(rows: T[], fields: Array<keyof T>, keyword: string): T[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw || !fields.length) return rows;
  return rows.filter((row) =>
    fields.some((field) => String(row[field] ?? '').toLowerCase().includes(kw)),
  );
}

/**
 * 排序（数值优先，字符串兜底）
 * @param rows 行
 * @param field 排序字段
 * @param order 排序方向
 * @returns 排序后的新数组
 */
function sortRows<T extends Row>(rows: T[], field: keyof T, order: 'asc' | 'desc'): T[] {
  const dir = order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-CN') * dir;
  });
}

/** scopedQuery 选项 */
export interface ScopedQueryOptions<T extends Row> {
  /** 行过滤：返回 true 保留 */
  filter?: (row: T) => boolean;
  /** 关键字模糊搜索的字段名列表 */
  searchFields?: Array<keyof T>;
  /** 关键字 */
  keyword?: string;
  /** 排序字段 */
  sortBy?: keyof T;
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
  /** 分页页码（不传则返回全量） */
  page?: number;
  /** 每页条数（不传则默认 20） */
  pageSize?: number;
  /** 本次查询附加的裁剪字段 */
  stripFields?: string[];
  /**
   * 跳过「设备维度」隔离判定（客户/厂家维度仍然生效）
   *
   * ⚠️ 仅用于「待确认绑定」这类行：绑定正是让设备进入客户可见范围的机制，
   * 其 deviceSn 按定义还不在 visibleDeviceSns 内，若走设备维度会把所有
   * 待确认绑定过滤掉，客户侧的「绑定确认」页永远为空。
   */
  skipDeviceScope?: boolean;
}

/**
 * 统一查询管道：隔离 → 过滤 → 关键字 → 排序 → 字段裁剪脱敏 → 分页
 * @param collection 原始集合（唯一来源 mock/db.ts）
 * @param scope 当前登录范围
 * @param opts 过滤/排序/分页/裁剪选项
 * @returns 分页结果
 */
export function scopedQuery<T extends Row>(
  collection: T[],
  scope: Scope,
  opts: ScopedQueryOptions<T> = {},
): PageResult<T> {
  let rows = applyScopeFilter(collection, scope, opts.skipDeviceScope ?? false);
  if (opts.filter) rows = rows.filter(opts.filter);
  if (opts.keyword && opts.searchFields?.length) {
    rows = keywordMatch(rows, opts.searchFields, opts.keyword);
  }
  if (opts.sortBy) {
    rows = sortRows(rows, opts.sortBy, opts.sortOrder ?? 'desc');
  }
  rows = applyFieldScope(rows, scope, opts.stripFields);

  const total = rows.length;
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const list = opts.page === undefined ? rows : rows.slice((page - 1) * pageSize, page * pageSize);
  return { list, total, page, pageSize };
}

/**
 * 单条查询：先做可见性校验，不可见返回 null（防越权，如手输 URL 访问他人设备）
 * @param collection 原始集合
 * @param idKey 主键字段
 * @param id 主键值
 * @param scope 当前范围
 * @param strip 附加裁剪字段
 * @returns 可见的行；不可见返回 null
 */
export function scopedFind<T extends Row>(
  collection: T[],
  idKey: keyof T,
  id: unknown,
  scope: Scope,
  strip: string[] = [],
): T | null {
  const rows = applyScopeFilter(collection, scope);
  const hit = rows.find((r) => r[idKey] === id);
  return hit ? applyFieldScope([hit], scope, strip)[0]! : null;
}

/**
 * 单条写入：先 scopedFind 校验可见性 → 不可见抛错 → 再改
 * @param collection 原始集合
 * @param idKey 主键字段
 * @param id 主键值
 * @param scope 当前范围
 * @param mutator 修改函数
 * @returns 修改后的行
 */
export function scopedMutate<T extends Row>(
  collection: T[],
  idKey: keyof T,
  id: unknown,
  scope: Scope,
  mutator: (row: T) => void,
): T {
  const rows = applyScopeFilter(collection, scope);
  const hit = rows.find((r) => r[idKey] === id);
  if (!hit) throw new Error(`[mock] 记录不存在或不在当前数据范围内：${String(id)}`);
  mutator(hit);
  return hit;
}

/**
 * 判断某行是否在当前范围内可见（api 层做写操作前的判定）
 * @param row 目标行
 * @param scope 当前范围
 * @returns 是否可见
 */
export function isVisible<T extends Row>(row: T, scope: Scope): boolean {
  return applyScopeFilter([row], scope).length > 0;
}

/**
 * 过滤出范围内的原始行（api 层需要拿原始对象再关联其他集合时用）
 * ⚠️ 返回的是原始行的引用，api 层不得直接透传给页面，必须再经 scopedQuery 收口
 * @param rows 原始行
 * @param scope 当前范围
 * @returns 可见的原始行
 */
export function visibleRows<T extends Row>(rows: T[], scope: Scope): T[] {
  return applyScopeFilter(rows, scope);
}