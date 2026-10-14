/**
 * 3D 环形饼图几何(SVG 2.5D 平行投影)
 *
 * 视角约定:俯视倾斜的甜甜圈,投影为椭圆(纵横比 k = sin(tilt));
 * 角度 θ 从 12 点方向起顺时针增长(与常规饼图一致),
 * 屏幕坐标:x = cx + r·cos(θ-90°),y = cy + r·k·sin(θ-90°)。
 * 前半圈(θ ∈ 90°~270°)可见外壁,后半圈(θ ∈ 270°~360°、0°~90°)可见内壁。
 * 本文件为纯函数、无框架依赖,可被 Node 直接执行用于视觉核验。
 */

/** 3D 环形饼图数据项 */
export interface Pie3dDataItem {
  name: string;
  value: number;
}

/** 构建几何所需配置 */
export interface BuildTorusOptions {
  /** 系列色板(按数据顺序取色) */
  colors: string[];
  /** 内径 / 外径(0 ~ 1),越大中心孔越大 */
  innerRatio: number;
  /** 厚度 / 外径(0 ~ 1),饼壁在投影下的高度占比 */
  thickness: number;
  /** 俯仰角(度),决定椭圆压扁程度,sin(tilt) = 纵横比 */
  tilt: number;
  /** 相邻扇形间隙(度),0 为无缝贴合 */
  gap: number;
  /** 悬停扇区索引(null = 无悬停),命中的扇区顶面抬升、壁面加长 */
  hoverIndex?: number | null;
  /** 悬停抬升高度(viewBox 单位) */
  hoverLift?: number;
  /** 总量基数;超过数据和时余量留空(设计稿的缺口形态),缺省按数据和布满全圆 */
  total?: number;
}

/** 单个扇形的面片路径与配色 */
export interface TorusSegment {
  index: number;
  name: string;
  value: number;
  /** 顶面亮色 */
  color: string;
  /** 外壁色 */
  wallColor: string;
  /** 内壁色 */
  innerColor: string;
  /** 切面(扇形断面)色 */
  cutColor: string;
  paths: {
    /** 顶面环带 */
    top: string;
    /** 外壁(前半圈可见),不可见为空串 */
    outer: string;
    /** 内壁(后半圈可见),不可见为空串 */
    inner: string;
    /** 起始端切面,不可见为空串 */
    cutStart: string;
    /** 结束端切面,不可见为空串 */
    cutEnd: string;
  };
}

/** 整体几何信息 */
export interface TorusGeometry {
  viewBoxW: number;
  viewBoxH: number;
  /** 顶面椭圆中心(viewBox 单位),中心数值锚点 */
  cx: number;
  cy: number;
  segments: TorusSegment[];
}

/** 外半径(viewBox 单位) */
const RADIUS = 50;
/** 四周留白(viewBox 单位) */
const PAD = 2;

/** 深色底(壁面通道混合用) */
const DARK_BASE: [number, number, number] = [10, 26, 56];

/** 通道混合:向深色底靠拢,同时压暗与降饱和(壁面用;HSL 只压亮度会残留高饱和电光色,如紫 #867EFF 壁变 #1b0cff) */
const mixTo = (hex: string, t: number): string => {
  const m = hex.replace('#', '');
  const out = [0, 1, 2].map((i) => {
    const v = parseInt(m.slice(i * 2, i * 2 + 2), 16);
    return Math.round(v * (1 - t) + DARK_BASE[i] * t);
  });
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** HSL 亮度调整(保持色相,乘系数压暗/提亮) */
const shadeHsl = (hex: string, lMult: number): string => {
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  const nl = Math.min(1, Math.max(0, l * lMult));
  const c = (1 - Math.abs(2 * nl - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m2 = nl - c / 2;
  let nr = 0;
  let ng = 0;
  let nb = 0;
  if (h < 60) [nr, ng, nb] = [c, x, 0];
  else if (h < 120) [nr, ng, nb] = [x, c, 0];
  else if (h < 180) [nr, ng, nb] = [0, c, x];
  else if (h < 240) [nr, ng, nb] = [0, x, c];
  else if (h < 300) [nr, ng, nb] = [x, 0, c];
  else [nr, ng, nb] = [c, 0, x];
  const to255 = (v: number) =>
    Math.round((v + m2) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to255(nr)}${to255(ng)}${to255(nb)}`;
};

/** 构建 3D 环形饼图几何(面片路径 + 配色) */
export const buildTorusGeometry = (
  data: Pie3dDataItem[],
  options: BuildTorusOptions
): TorusGeometry => {
  const k = Math.sin((options.tilt * Math.PI) / 180);
  const rx = RADIUS;
  const ry = RADIUS * k;
  const irx = RADIUS * options.innerRatio;
  /** 饼壁在投影下的高度 */
  const t = RADIUS * options.thickness;
  const viewBoxW = (RADIUS + PAD) * 2;
  const cx = RADIUS + PAD;
  const cy = PAD + ry;
  const viewBoxH = PAD * 2 + ry * 2 + t;

  const f = (n: number) => Math.round(n * 100) / 100;

  /** θ 角对应的椭圆点(dy 为竖向偏移:抬升为负、贴地为正) */
  const point = (r: number, theta: number, dy = 0) => {
    const a = ((theta - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * k * Math.sin(a) + dy };
  };

  /** 椭圆弧命令(>180° 自动拆段,SVG 单段弧不支持全圆);dy 为竖向偏移(画壁底) */
  const arcTo = (r: number, from: number, to: number, sweep: 0 | 1, dy = 0) => {
    const cmds: string[] = [];
    let cur = from;
    const dir = sweep === 1 ? 1 : -1;
    while (Math.abs(to - cur) > 180) {
      const mid = cur + dir * 180;
      const p = point(r, mid);
      cmds.push(`A ${f(r)} ${f(r * k)} 0 0 ${sweep} ${f(p.x)} ${f(p.y + dy)}`);
      cur = mid;
    }
    const p = point(r, to);
    cmds.push(`A ${f(r)} ${f(r * k)} 0 0 ${sweep} ${f(p.x)} ${f(p.y + dy)}`);
    return cmds.join(' ');
  };

  /** 顶面环带:外弧顺时针 + 内弧逆时针;lift = 悬停抬升(顶面整体上移) */
  const buildTop = (a0: number, a1: number, lift = 0) => {
    const dy = -lift;
    const p1 = point(rx, a0, dy);
    const p3 = point(irx, a1, dy);
    return `M ${f(p1.x)} ${f(p1.y)} ${arcTo(rx, a0, a1, 1, dy)} L ${f(p3.x)} ${f(p3.y)} ${arcTo(irx, a1, a0, 0, dy)} Z`;
  };

  /** 壁面(外壁用 rx、内壁用 irx):顶缘随顶面抬升、底缘贴地不动,悬停时壁面加长 */
  const buildWall = (r: number, w0: number, w1: number, lift = 0) => {
    const a = point(r, w0, -lift);
    const gb = point(r, w1);
    return `M ${f(a.x)} ${f(a.y)} ${arcTo(r, w0, w1, 1, -lift)} L ${f(gb.x)} ${f(gb.y + t)} ${arcTo(r, w1, w0, 0, t)} Z`;
  };

  /** 切面(扇形断面):从内径到外径的竖直面,上缘随顶面抬升 */
  const buildCut = (theta: number, lift = 0) => {
    const pi = point(irx, theta, -lift);
    const po = point(rx, theta, -lift);
    const gi = point(irx, theta);
    const go = point(rx, theta);
    return `M ${f(pi.x)} ${f(pi.y)} L ${f(po.x)} ${f(po.y)} L ${f(go.x)} ${f(go.y + t)} L ${f(gi.x)} ${f(gi.y + t)} Z`;
  };

  const segments: TorusSegment[] = [];
  // 各扇形中点的屏幕纵深(投影 y),用于渲染排序
  const depths: number[] = [];
  const sum = data.reduce((acc, cur) => acc + cur.value, 0);
  // 满圆基数:total 超过数据和时,余量角度留空形成缺口(设计稿 10~12 点方向空槽)
  const full = options.total && options.total > sum ? options.total : sum;

  let startDeg = 0;
  data.forEach((item, index) => {
    const endDeg = startDeg + (item.value / full) * 360;
    const spanDeg = endDeg - startDeg;
    const single = data.filter((d) => d.value > 0).length === 1;
    // 间隙两侧各留一半,且不超过扇区的 1/4,防止小扇区被吃掉
    const gapHalf = single ? 0 : Math.min(options.gap / 2, spanDeg / 4);
    const a0 = startDeg + gapHalf;
    const a1 = endDeg - gapHalf;
    startDeg = endDeg;
    if (item.value <= 0 || a1 - a0 <= 0.2) return;

    const color = options.colors[index % options.colors.length];
    // 悬停扇区抬升:顶面上移 lift、壁面/切面加长(底缘贴地不动)
    const lift = index === options.hoverIndex ? options.hoverLift ?? 0 : 0;

    // 外壁:前半圈可见
    const ow0 = Math.max(a0, 90);
    const ow1 = Math.min(a1, 270);
    const outer = ow1 - ow0 > 0.1 ? buildWall(rx, ow0, ow1, lift) : '';

    // 内壁:后半圈可见(可能拆成 270°~360° 与 0°~90° 两段)
    let inner = '';
    if (a0 < 90) {
      const s1 = Math.min(a1, 90);
      if (s1 - a0 > 0.1) inner += buildWall(irx, a0, s1, lift);
    }
    if (a1 > 270) {
      const s0 = Math.max(a0, 270);
      if (a1 - s0 > 0.1) inner += buildWall(irx, s0, a1, lift);
    }

    // 切面:结束端朝顺时针方向、起始端朝逆时针方向时朝向观众
    const cutEnd = a1 > 0.1 && a1 < 179.9 ? buildCut(a1, lift) : '';
    const cutStart = a0 > 180.1 && a0 < 359.9 ? buildCut(a0, lift) : '';

    // 扇形中点的屏幕纵深(投影 y),用于渲染排序
    const dir = point(1, (a0 + a1) / 2);
    depths.push(dir.y);

    segments.push({
      index,
      name: item.name,
      value: item.value,
      color,
      // 壁面向深海军蓝混合:外壁 0.5 / 内壁 0.62(对齐设计稿哑光壁面,青→#058194、紫→#484c9c、蓝→#065797)
      wallColor: mixTo(color, 0.5),
      innerColor: mixTo(color, 0.62),
      // 切面朝上偏转受光更多,设计稿为提亮变体(#FF7723→#FFA86E)
      cutColor: shadeHsl(color, 1.18),
      paths: {
        top: buildTop(a0, a1, lift),
        outer,
        inner,
        cutStart,
        cutEnd,
      },
    });
  });

  // 画家算法:按扇形中点纵深从远(环后半圈)到近(前半圈)排序渲染,
  // 避免后半圈扇形(如 12 点两侧)盖住前半圈扇形的面片
  const sorted = segments
    .map((seg, i) => ({ seg, depth: depths[i] }))
    .sort((a, b) => a.depth - b.depth)
    .map(({ seg }) => seg);

  return {
    viewBoxW, viewBoxH, cx, cy, segments: sorted
  };
};
