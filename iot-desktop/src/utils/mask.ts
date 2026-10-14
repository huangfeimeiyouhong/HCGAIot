/**
 * 脱敏与字段裁剪工具 —— 由 scope.maskFields / scope.stripFields 驱动（约定 6 / S6）
 * ⚠️ 改通配规则需同步 mock/scope.ts 与 mock/query.ts
 */

/** 脱敏占位符 */
export const MASK_PLACEHOLDER = '***';

/**
 * 判断字段名是否命中规则
 * 支持三种写法：
 * 1. 精确匹配：'contractNo'
 * 2. 一级通配：'components.*' 命中 components 下任意字段
 * 3. 全局通配：'*' 命中所有字段
 * @param key 字段名（可为 'a.b' 形式）
 * @param rules 规则数组
 * @returns 是否命中
 */
function matchField(key: string, rules: string[]): boolean {
  return rules.some((rule) => {
    if (rule === '*') return true;
    if (rule.endsWith('.*')) {
      const prefix = rule.slice(0, -1); // 'components.'
      return key.startsWith(prefix);
    }
    return rule === key;
  });
}

/**
 * 字段脱敏：命中字段的值替换为 '***'
 * 支持嵌套对象（就地修改传入对象）
 * @param obj 目标对象
 * @param fields 需要脱敏的字段名数组
 * @param deep 是否递归处理嵌套对象（默认 true）
 * @returns 传入的对象（就地修改）
 */
export function maskFields<T extends Record<string, any>>(
  obj: T,
  fields: string[],
  deep = true,
): T {
  if (!obj || !fields.length) return obj;
  const target = obj as Record<string, unknown>;
  Object.keys(target).forEach((key) => {
    if (matchField(key, fields)) {
      const v = target[key];
      if (v !== null && v !== undefined && v !== '') {
        target[key] = MASK_PLACEHOLDER;
      }
      return;
    }
    const value = target[key];
    if (deep && value && typeof value === 'object' && !Array.isArray(value)) {
      maskFields(value as Record<string, unknown>, fields, deep);
    } else if (deep && Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === 'object') maskFields(item as Record<string, unknown>, fields, deep);
      });
    }
  });
  return obj;
}

/**
 * 字段裁剪：命中字段直接删除
 * 支持 'components.*' 通配（删除 components 下所有字段但保留 components 本身）
 * @param obj 目标对象（就地修改）
 * @param fields 需要删除的字段名数组
 * @param deep 是否递归处理嵌套对象（默认 true）
 * @returns 传入的对象（就地修改）
 */
export function stripFields<T extends Record<string, any>>(
  obj: T,
  fields: string[],
  deep = true,
): T {
  if (!obj || !fields.length) return obj;
  const target = obj as Record<string, unknown>;
  const exact = fields.filter((f) => !f.endsWith('.*'));
  const prefixes = fields.filter((f) => f.endsWith('.*')).map((f) => f.slice(0, -1));
  const wildcardAll = fields.includes('*');

  if (wildcardAll) {
    Object.keys(target).forEach((key) => {
      delete target[key];
    });
    return obj;
  }

  exact.forEach((key) => {
    delete target[key];
  });
  if (prefixes.length) {
    Object.keys(target).forEach((key) => {
      if (!prefixes.some((p) => key.startsWith(p))) return;
      const value = target[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item && typeof item === 'object') stripFields(item as Record<string, unknown>, ['*'], false);
        });
      } else if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;
        Object.keys(nested).forEach((k) => delete nested[k]);
      }
    });
  }
  if (deep) {
    Object.keys(target).forEach((key) => {
      const value = target[key];
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item && typeof item === 'object') stripFields(item as Record<string, unknown>, fields, deep);
        });
      } else if (value && typeof value === 'object') {
        stripFields(value as Record<string, unknown>, fields, deep);
      }
    });
  }
  return obj;
}

/**
 * 对单个值脱敏
 * @param value 原值
 * @returns 命中脱敏规则时返回 '***'
 */
export function maskValue(value: unknown): unknown {
  return value === null || value === undefined || value === '' ? value : MASK_PLACEHOLDER;
}