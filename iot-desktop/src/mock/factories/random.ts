/**
 * 确定性随机 —— mulberry32 算法
 * ⚠️ 必须固定种子：演示时数字乱跳会破坏可信度（架构文档 A10.3 假设 A-1）
 */
import type { Random } from '../types';

/**
 * 创建带种子的随机数发生器
 * @param seed 种子
 * @returns 随机工具集
 */
export function createRandom(seed: number): Random {
  // mulberry32：32 位状态，同种子必得同序列
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** 闭区间整数 */
  const int = (min: number, max: number): number => {
    if (max <= min) return min;
    return min + Math.floor(next() * (max - min + 1));
  };

  /** 小数（保留 digits 位） */
  const float = (min: number, max: number, digits = 2): number => {
    const v = min + next() * (max - min);
    const p = 10 ** digits;
    return Math.round(v * p) / p;
  };

  /** 从数组中取一个 */
  const pick = <T>(arr: readonly T[]): T => {
    if (!arr.length) throw new Error('[mock] pick 的数组不能为空');
    return arr[Math.floor(next() * arr.length)]!;
  };

  /** 按权重取样 */
  const weighted = <T>(items: Array<{ value: T; weight: number }>): T => {
    const total = items.reduce((sum, i) => sum + i.weight, 0);
    let r = next() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item.value;
    }
    return items[items.length - 1]!.value;
  };

  /** 概率命中 */
  const bool = (probability = 0.5): boolean => next() < probability;

  /** 最近 withinDays 天内的随机时刻（ISO 串） */
  const date = (withinDays: number): string => {
    const offsetMs = int(0, Math.max(1, Math.round(withinDays * 86_400_000)));
    return new Date(Date.now() - offsetMs).toISOString();
  };

  /** 最近 withinDays 天内的随机时刻（返回毫秒时间戳） */
  const timestamp = (withinDays: number): number => {
    const offsetMs = int(0, Math.max(1, Math.round(withinDays * 86_400_000)));
    return Date.now() - offsetMs;
  };

  /** 左补零 */
  const pad = (value: number, len = 4): string => String(value).padStart(len, '0');

  /** 洗牌（不改原数组） */
  const shuffle = <T>(arr: readonly T[]): T[] => {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
  };

  return { next, int, float, pick, weighted, bool, date, timestamp, pad, shuffle };
}

/** 全局演示种子（⚠️ 改此值会改变全部 mock 数据） */
export const DEMO_SEED = 20261013;

/** 便捷单例（工厂函数内部默认用它，保证确定性） */
export const defaultRandom: Random = createRandom(DEMO_SEED);