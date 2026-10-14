/**
 * 公共 API 层（当前为 mock 实现，延迟 200ms）
 *
 * 接入真实后端三步：
 *   1. 安装 axios，在 vite.config.ts 打开 /api 代理；
 *   2. 将下方各方法体替换为真实请求；
 *   3. 返回数据结构保持不变，上层页面零改动。
 *
 * 数据隔离：所有列表方法必须经 resolveScope(useAuthStore()) 注入范围，
 * 禁止在方法体内直接返回 getDb().xxx 全量数组。
 */
import { getDict as dictOf } from '@/constants/dict';
import { PRIORITY_LABEL, slaOf } from '@/constants/sla';

import { delay } from '@/mock/delay';
import { getDb } from '@/mock/db';
import { scopedQuery } from '@/mock/query';
import { resolveScope } from '@/mock/scope';

import { useAuthStore } from '@/store/auth';

import type { NotificationQuery } from './types';
import type {
  DictOption,
  Notification,
  PageResult,
  Priority,
  SlaCommitment,
  SlaPreview,
} from '@/types';

/**
 * 顶栏「数据范围」标识
 * @returns 徽标文案与色调
 */
export function getScopeBadge(): Promise<{ label: string; tone: string }> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const tone = scope.role === 'PLATFORM' ? 'warning' : scope.role === 'VENDOR' ? 'processing' : 'info';
  return delay({ label: scope.badgeText, tone });
}

/**
 * 铃铛未读数（按当前租户过滤）
 * @returns 未读站内信条数
 */
export function getUnreadCount(): Promise<number> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();
  const rows = scopedQuery(db.notifications, scope, {}).list;
  return delay(rows.filter((n) => !n.isRead).length);
}

/**
 * 通知中心列表
 * @param q 查询条件
 * @returns 分页结果
 */
export function getNotificationList(q: NotificationQuery): Promise<PageResult<Notification>> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  return delay(
    scopedQuery(getDb().notifications, scope, {
      keyword: q.keyword,
      searchFields: ['title', 'content'],
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: q.page,
      pageSize: q.pageSize,
      filter: (n) => (q.type ? n.type === q.type : true) && (q.isRead === undefined ? true : n.isRead === q.isRead),
    }),
  );
}

/**
 * 标记单条已读
 * @param id 通知 id
 */
export function markNotificationRead(id: string): Promise<void> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();
  const hit = scopedQuery(db.notifications, scope, { filter: (n) => n.id === id }).list[0];
  if (hit) hit.isRead = true;
  return delay(undefined);
}

/**
 * 全部标记已读（当前租户）
 */
export function markAllNotificationRead(): Promise<void> {
  const auth = useAuthStore();
  const scope = resolveScope(auth);
  const db = getDb();
  scopedQuery(db.notifications, scope, {}).list.forEach((n) => {
    n.isRead = true;
  });
  return delay(undefined);
}

/**
 * 字典下拉
 * @param type 字典类型
 * @returns 选项数组
 */
export function getDict(type: 'category' | 'priority' | 'problemType'): Promise<DictOption[]> {
  return delay(dictOf(type));
}

/**
 * SLA 预览（发起报修页用）
 * @param priority 优先级
 * @returns SLA 预览数据
 */
export function previewSla(priority: Priority): Promise<SlaPreview> {
  const commitment: SlaCommitment = slaOf(priority);
  const s = slaOf(priority);
  const fmt = (h: number): string => (h < 1 ? `${Math.round(h * 60)} 分钟` : h < 24 ? `${Math.floor(h)} 小时` : `${Math.floor(h / 24)} 天`);
  return delay({
    priority,
    label: PRIORITY_LABEL[priority] ?? priority,
    commitment,
    text: `${PRIORITY_LABEL[priority]}：接单 ${fmt(s.acceptHours)} / 处理 ${fmt(s.handleHours)} / 待验收 ${fmt(s.confirmHours)}`,
  });
}

/** 公共 API 对象 */
export const commonApi = {
  getScopeBadge,
  getUnreadCount,
  getNotificationList,
  markNotificationRead,
  markAllNotificationRead,
  getDict,
  previewSla,
};