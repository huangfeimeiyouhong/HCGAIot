/** 基础色系衍生调色板（迁移自 dashboard-poc utils/palette.js） */
import { BASE_COLOR } from '@/constants/chart';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface DerivedPaletteParams {
  /** 需要生成的颜色数量 */
  count?: number;
  /** 基色（支持数组或对象） */
  bases?: string[] | Record<string, string>;
  /** 输出顺序：交错/分组 */
  mode?: 'interleave' | 'group';
  /** 从第几个变体开始（用于多处复用时错开） */
  start?: number;
  /** 亮度下限（0-1） */
  minLightness?: number;
  /** 亮度上限（0-1） */
  maxLightness?: number;
  /** 饱和度下限（0-1） */
  minSaturation?: number;
  /** 饱和度上限（0-1） */
  maxSaturation?: number;
}

export interface ChartColorsOptions {
  count?: number;
  bases?: string[] | Record<string, string>;
  mode?: 'interleave' | 'group';
  start?: number;
  minLightness?: number;
  maxLightness?: number;
  minSaturation?: number;
  maxSaturation?: number;
}

/**
 * ==========
 * 基础色系衍生调色板（用于图表系列色）
 * - 目标：主色调（Hue）保持不变，通过调整 Saturation/Lightness 派生出多种“周边色”
 * - 默认输出顺序：交错（interleave），避免同一主色衍生色挨在一起
 * - 可切换为分组（group），按“变体层级”分组
 *
 * 用法示例：
 * 1) 生成 30 个颜色（默认基于 BASE_COLOR，交错输出）
 *    const colors = getDerivedPalette({ count: 30 })
 *
 * 2) 指定多个基色生成 20 个颜色
 *    const colors = getDerivedPalette({ count: 20, bases: ['#2CA850', '#007AF5'] })
 *
 * 3) 按“变体层级”分组输出（A：更均匀）
 *    const colors = getDerivedPalette({ count: 20, mode: 'group' })
 */

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const normalizeHex = (hex: unknown): string | null => {
  if (!hex) return null;
  let v = String(hex).trim();
  if (!v) return null;
  if (v.startsWith('#')) v = v.slice(1);
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return `#${v.toUpperCase()}`;
};

const hexToRgb = (hex: unknown): Rgb | null => {
  const h = normalizeHex(hex);
  if (!h) return null;
  const v = h.slice(1);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return {
    r, g, b
  };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex2 = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`.toUpperCase();
};

// rgb: 0-255 -> hsl: h(0-360), s/l(0-1)
const rgbToHsl = (r: number, g: number, b: number): Hsl => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
    case rn:
      h = ((gn - bn) / d) % 6;
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
      break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return {
    h, s, l
  };
};

// hsl: h(0-360), s/l(0-1) -> rgb: 0-255
const hslToRgb = (h: number, s: number, l: number): Rgb => {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s);
  const ll = clamp01(l);
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hh < 60) {
    r1 = c;
    g1 = x;
  } else if (hh < 120) {
    r1 = x;
    g1 = c;
  } else if (hh < 180) {
    g1 = c;
    b1 = x;
  } else if (hh < 240) {
    g1 = x;
    b1 = c;
  } else if (hh < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }

  return {
    r: (r1 + m) * 255,
    g: (g1 + m) * 255,
    b: (b1 + m) * 255
  };
};

/**
 * 生成衍生调色板
 * @returns HEX 颜色数组
 */
export const getDerivedPalette = (params: DerivedPaletteParams = {}): string[] => {
  const {
    count,
    bases = BASE_COLOR,
    mode = 'interleave',
    start = 0,
    minLightness = 0.22,
    maxLightness = 0.8,
    minSaturation = 0.35,
    maxSaturation = 1
  } = params;

  const total = Number(count);
  if (!Number.isFinite(total) || total <= 0) return [];

  const baseList: unknown[] = Array.isArray(bases)
    ? bases
    : bases && typeof bases === 'object'
      ? Object.values(bases)
      : [];

  const normalizedBases = baseList.map(normalizeHex).filter((v): v is string => Boolean(v));
  if (normalizedBases.length === 0) return [];

  // 一组“可控的”S/L 偏移（保持 Hue 不变），用于生成稳定且区分度较高的衍生色
  // 注：偏移会在 clamp 区间内截断，确保暗色大屏场景也不会过暗/过亮
  const deltas = [
    { dL: 0.16, dS: -0.04 },
    { dL: 0.1, dS: 0.02 },
    { dL: 0.04, dS: 0.06 },
    { dL: -0.04, dS: 0.06 },
    { dL: -0.1, dS: 0.02 },
    { dL: -0.16, dS: -0.04 },
    { dL: 0.22, dS: 0.06 },
    { dL: 0.12, dS: 0.1 },
    { dL: 0.02, dS: 0.12 },
    { dL: -0.08, dS: 0.1 },
    { dL: -0.18, dS: 0.06 },
    { dL: -0.22, dS: 0 }
  ];

  const derive = (baseHex: string, variantIndex: number): string => {
    const rgb = hexToRgb(baseHex);
    if (!rgb) return baseHex;
    const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const d = deltas[variantIndex % deltas.length];
    const s2 = Math.max(minSaturation, Math.min(maxSaturation, s + d.dS));
    const l2 = Math.max(minLightness, Math.min(maxLightness, l + d.dL));
    const out = hslToRgb(h, s2, l2);
    return rgbToHex(out.r, out.g, out.b);
  };

  const baseCount = normalizedBases.length;
  const colors: string[] = [];

  if (mode === 'group') {
    // A：按“变体层级”推进，每层把所有主色跑一遍（整体更均匀）
    let produced = 0;
    let variant = start;
    while (produced < total) {
      for (let b = 0; b < baseCount && produced < total; b++) {
        colors.push(derive(normalizedBases[b], variant));
        produced++;
      }
      variant++;
    }
    return colors;
  }

  // 默认：交错输出，避免同主色挨在一起
  // round-robin：base 轮转，variant 递增
  for (let i = 0; i < total; i++) {
    const baseIdx = i % baseCount;
    const variantIdx = start + Math.floor(i / baseCount);
    colors.push(derive(normalizedBases[baseIdx], variantIdx));
  }
  return colors;
};

/**
 * 兼容式调用：支持“指定数量”或“指定多个颜色值”
 * - getChartColors(30) => 基于 BASE_COLOR 生成 30 个
 * - getChartColors(['#2CA850', '#007AF5'], { count: 20 }) => 基于指定基色生成 20 个
 */
export const getChartColors = (
  countOrBases: number | string[] | string,
  options: ChartColorsOptions = {}
): string[] => {
  if (typeof countOrBases === 'number') {
    return getDerivedPalette({ ...options, count: countOrBases });
  }
  if (Array.isArray(countOrBases)) {
    return getDerivedPalette({
      ...options,
      bases: countOrBases,
      count: options.count ?? countOrBases.length
    });
  }
  if (typeof countOrBases === 'string') {
    return getDerivedPalette({
      ...options,
      bases: [countOrBases],
      count: options.count ?? 1
    });
  }
  return getDerivedPalette({ ...options, count: options.count ?? 0 });
};
