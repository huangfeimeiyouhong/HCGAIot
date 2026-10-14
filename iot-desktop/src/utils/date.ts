/**
 * 日期工具 —— 演示数据的统一时间出入口
 * 存储格式统一 ISO 8601（YYYY-MM-DDTHH:mm:ss），展示统一走本文件
 */
import type { Countdown } from '@/types';

const PAD = (n: number): string => String(n).padStart(2, '0');

/**
 * 格式化日期时间
 * @param iso ISO 时间串
 * @param fmt 格式，默认 'YYYY-MM-DD HH:mm'
 * @returns 格式化结果；入参为空返回 '-'
 */
export function formatDateTime(iso?: string | null, fmt = 'YYYY-MM-DD HH:mm'): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return formatDate(d, fmt);
}

/**
 * 格式化 Date 对象
 * @param d 日期对象
 * @param fmt 格式，支持 YYYY/MM/DD/HH/mm/ss
 * @returns 格式化结果
 */
export function formatDate(d: Date, fmt: string): string {
  return fmt
    .replace('YYYY', String(d.getFullYear()))
    .replace('MM', PAD(d.getMonth() + 1))
    .replace('DD', PAD(d.getDate()))
    .replace('HH', PAD(d.getHours()))
    .replace('mm', PAD(d.getMinutes()))
    .replace('ss', PAD(d.getSeconds()));
}

/**
 * 仅格式化日期部分
 * @param iso ISO 时间串
 * @returns 如 '2026-10-13'
 */
export function formatDateOnly(iso?: string | null): string {
  return formatDateTime(iso, 'YYYY-MM-DD');
}

/**
 * 相对时间描述
 * @param iso ISO 时间串
 * @param now 当前时间戳（默认 Date.now()，便于测试注入）
 * @returns 如「3 天前」「2 小时后」；入参为空返回 '-'
 */
export function fromNow(iso?: string | null, now: number = Date.now()): string {
  if (!iso) return '-';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '-';
  const diff = now - t;
  const abs = Math.abs(diff);
  const suffix = diff >= 0 ? '前' : '后';
  if (abs < 60_000) return '刚刚';
  if (abs < 3_600_000) return `${Math.floor(abs / 60_000)} 分钟${suffix}`;
  if (abs < 86_400_000) return `${Math.floor(abs / 3_600_000)} 小时${suffix}`;
  if (abs < 30 * 86_400_000) return `${Math.floor(abs / 86_400_000)} 天${suffix}`;
  if (abs < 365 * 86_400_000) return `${Math.floor(abs / (30 * 86_400_000))} 个月${suffix}`;
  return `${Math.floor(abs / (365 * 86_400_000))} 年${suffix}`;
}

/**
 * SLA 倒计时格式化
 * @param deadlineIso 截止时间 ISO 串
 * @param now 当前时间戳（默认 Date.now()）
 * @returns { text, isTimeout, ratio, hours }
 */
export function formatCountdown(deadlineIso?: string | null, now: number = Date.now()): Countdown {
  if (!deadlineIso) return { text: '-', isTimeout: false, ratio: 1, hours: 0 };
  const end = new Date(deadlineIso).getTime();
  if (Number.isNaN(end)) return { text: '-', isTimeout: false, ratio: 1, hours: 0 };
  const remainMs = end - now;
  const isTimeout = remainMs < 0;
  const absMs = Math.abs(remainMs);
  const totalHours = absMs / 3_600_000;
  const hours = Math.floor(totalHours);
  const minutes = Math.floor((absMs % 3_600_000) / 60_000);

  let text: string;
  if (absMs < 60_000) {
    text = isTimeout ? '刚刚超时' : '即将到期';
  } else if (hours > 0) {
    text = `${isTimeout ? '已超时' : '还剩'} ${hours} 小时 ${minutes} 分`;
  } else {
    text = `${isTimeout ? '已超时' : '还剩'} ${minutes} 分钟`;
  }
  return { text, isTimeout, ratio: 1, hours: totalHours };
}

/**
 * 计算两个日期相差天数
 * @param fromISO 起始 ISO 串
 * @param toISO 结束 ISO 串（默认当前时间）
 * @returns 相差天数（向下取整，to 早于 from 时为负）
 */
export function daysBetween(fromISO: string, toISO?: string): number {
  const from = new Date(fromISO).getTime();
  const to = toISO ? new Date(toISO).getTime() : Date.now();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.floor((to - from) / 86_400_000);
}

/**
 * 取 ISO 串距今的剩余天数（向下取整，最小 0）
 * @param iso ISO 串
 * @param now 当前时间戳（默认 Date.now()）
 * @returns 剩余天数；已过期返回 0
 */
export function remainDays(iso?: string | null, now: number = Date.now()): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((t - now) / 86_400_000));
}

/**
 * 在 ISO 时间上增加小时数，返回新的 ISO 串
 * @param iso 基准 ISO 串
 * @param hours 增加小时数（可为负）
 * @returns 新 ISO 串
 */
export function addHours(iso: string, hours: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  return new Date(t + hours * 3_600_000).toISOString();
}

/**
 * 在 ISO 时间上增加天数，返回新的 ISO 串
 * @param iso 基准 ISO 串
 * @param days 增加天数（可为负）
 * @returns 新 ISO 串
 */
export function addDays(iso: string, days: number): string {
  return addHours(iso, days * 24);
}

/**
 * 判断日期区间是否命中（闭区间）
 * @param value 待判定 ISO 串
 * @param range 区间二元组；未传或任一端为空返回 true
 * @returns 是否命中
 */
export function inRange(value: string | null | undefined, range?: [string, string] | null): boolean {
  if (!range || !range[0] || !range[1] || !value) return true;
  const t = new Date(value).getTime();
  const a = new Date(range[0]).getTime();
  const b = new Date(range[1]).getTime();
  if (Number.isNaN(t) || Number.isNaN(a) || Number.isNaN(b)) return true;
  return t >= a && t <= b;
}

/**
 * 生成最近 N 天的日期序列（升序，YYYY-MM-DD）
 * @param days 天数
 * @param now 当前时间戳（默认 Date.now()）
 * @returns 日期数组
 */
export function lastDays(days: number, now: number = Date.now()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    out.push(formatDate(new Date(now - i * 86_400_000), 'YYYY-MM-DD'));
  }
  return out;
}