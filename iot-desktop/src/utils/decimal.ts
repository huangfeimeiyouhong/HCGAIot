/**
 * 浮点精度安全运算,底层 decimal.js(运算全走 Decimal,仅出口转回 number)。
 * 解决 JS 二进制浮点尾差:0.1 + 0.2 === 0.30000000000000004 这类问题一律用这里,勿裸写四则运算。
 */

import Decimal from 'decimal.js';

/** 精度安全加法 */
export const accurateAdd = (a: number, b: number): number => new Decimal(a).add(b).toNumber();

/** 精度安全减法 */
export const accurateSubtract = (a: number, b: number): number => new Decimal(a).sub(b).toNumber();

/** 精度安全乘法 */
export const accurateMultiply = (a: number, b: number): number => new Decimal(a).mul(b).toNumber();

/** 精度安全除法(除数 0 返回 NaN,与原生除法一致) */
export const accurateDivide = (a: number, b: number): number =>
  b === 0 ? NaN : new Decimal(a).div(b).toNumber();

/** 精度安全求和(空数组返回 0;Decimal.sum 零参会抛错,须先判空) */
export const accurateSum = (nums: number[]): number =>
  nums.length ? Decimal.sum(...nums).toNumber() : 0;

/**
 * 占比分配(最大余数法):各项按 fractionDigits 位小数向下取整,
 * 余量按小数部分大者优先逐项补 1,返回值合计恒等于 100。
 * 逐项独立四舍五入会累加舍入误差,合计可能 99.99 / 100.01。
 */
export const allocatePercents = (values: number[], fractionDigits = 2): number[] => {
  if (!values.length) return [];
  const total = Decimal.sum(...values);
  if (total.lte(0)) return values.map(() => 0);
  const unitTotal = new Decimal(100).mul(10 ** fractionDigits); // 总份数(1 份 = 10^-fractionDigits 个百分点)
  const raws = values.map(value => new Decimal(value).div(total).mul(unitTotal));
  const units = raws.map(raw => raw.floor());
  const remain = unitTotal.minus(Decimal.sum(...units)).toNumber();
  raws
    .map((raw, index) => ({ index, frac: raw.minus(units[index]) }))
    .sort((a, b) => b.frac.comparedTo(a.frac))
    .slice(0, remain)
    .forEach(({ index }) => { units[index] = units[index].add(1); });
  return units.map(unit => unit.div(10 ** fractionDigits).toNumber());
};
