/**
 * 图表色板与浅色主题常量
 * ⚠️ 这是全项目唯一允许出现色值字面量的业务文件（约定 4 例外条款）
 */
import type { ECOption } from '@/hooks/use-echarts';

/**
 * 分类色板 —— 8 色，在白底上可区分且色相间隔明显
 */
export const CHART_COLORS: string[] = [
  '#41C0FF',
  '#07C160',
  '#FA8C16',
  '#B78FFF',
  '#0B7CAE',
  '#FADB14',
  '#FF4D4F',
  '#5D7092',
];

/**
 * 深色场景地图线框色（入口页 / 登录页）
 * ⚠️ echarts option 里不能写 CSS 变量，地图线框色必须走这个常量，
 *    保证「色值只出现在 styles/variables.scss 与 constants/chart.ts」这条约定不被破坏
 */
export const CHART_DARK_MAP = {
  borderColor: '#16507E',
  backgroundColor: 'transparent',
} as const;

/** 语义色板（告警等级等场景） */
export const CHART_SEMANTIC: Record<string, string> = {
  URGENT: '#FF4D4F',
  IMPORTANT: '#FA8C16',
  NORMAL: '#41C0FF',
};

/** 状态色板（工单/绑定状态分布图） */
export const CHART_STATUS: Record<string, string> = {
  PENDING_ACCEPT: '#FA8C16',
  IN_PROGRESS: '#41C0FF',
  PENDING_CONFIRM: '#B78FFF',
  COMPLETED: '#07C160',
  CLOSED: '#86909C',
};

/** 坐标轴样式（浅底：轴线浅灰，文字深灰） */
export const AXIS_STYLE = {
  axisLine: { lineStyle: { color: '#E5E6EB' } },
  axisTick: { show: false },
  axisLabel: { color: '#86909C', fontSize: 12 },
  splitLine: { lineStyle: { color: '#F2F3F5', type: 'dashed' as const } },
};

/** 文本样式（⚠️ 深色主题移植坑：白底必须用深色文字） */
export const TEXT_STYLE = {
  color: '#4E5969',
  fontSize: 12,
};

/** 提示框统一样式 */
export const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E5E6EB',
  borderWidth: 1,
  textStyle: { color: '#1D2129', fontSize: 12 },
  extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,.08); border-radius: 8px;',
};

/** 图例统一样式 */
export const LEGEND_STYLE = {
  textStyle: { color: '#4E5969', fontSize: 12 },
  icon: 'roundRect',
  itemWidth: 10,
  itemHeight: 10,
};

/**
 * 构造浅色主题的公共 option 片段
 * @param overrides 需要覆盖的字段
 * @returns 可直接展开进 ECOption 的公共配置
 */
export function baseChartOption(overrides: Partial<ECOption> = {}): ECOption {
  return {
    textStyle: { color: TEXT_STYLE.color, fontSize: TEXT_STYLE.fontSize },
    color: CHART_COLORS,
    tooltip: { ...TOOLTIP_STYLE },
    ...overrides,
  } as ECOption;
}

/**
 * 按分类维度生成饼图 option
 * @param data 分类数据
 * @param overrides 覆盖项
 * @returns 饼图 option
 */
export function pieOption(
  data: Array<{ name: string; value: number }>,
  overrides: Partial<ECOption> = {},
): ECOption {
  return {
    ...baseChartOption(),
    tooltip: { ...TOOLTIP_STYLE, trigger: 'item', formatter: '{b}: {c}（{d}%）' },
    legend: { ...LEGEND_STYLE, bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['42%', '66%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#FFFFFF', borderWidth: 2 },
        label: { show: false },
        data,
      },
    ],
    ...overrides,
  } as ECOption;
}

/**
 * 按分类维度生成柱状图 option
 * @param data 分类数据
 * @param overrides 覆盖项
 * @returns 柱状图 option
 */
export function barOption(
  data: Array<{ name: string; value: number }>,
  overrides: Partial<ECOption> = {},
): ECOption {
  return {
    ...baseChartOption(),
    tooltip: { ...TOOLTIP_STYLE, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLine: AXIS_STYLE.axisLine,
      axisTick: AXIS_STYLE.axisTick,
      axisLabel: AXIS_STYLE.axisLabel,
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: AXIS_STYLE.axisTick,
      axisLabel: AXIS_STYLE.axisLabel,
      splitLine: AXIS_STYLE.splitLine,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: data.map((d) => d.value),
      },
    ],
    ...overrides,
  } as ECOption;
}

/**
 * 生成折线趋势图 option
 * @param dates X 轴日期序列
 * @param series 多系列数据
 * @param overrides 覆盖项
 * @returns 折线图 option
 */
export function lineOption(
  dates: string[],
  series: Array<{ name: string; value: number[] }>,
  overrides: Partial<ECOption> = {},
): ECOption {
  return {
    ...baseChartOption(),
    tooltip: { ...TOOLTIP_STYLE, trigger: 'axis' },
    legend: series.length > 1 ? { ...LEGEND_STYLE, top: 0, right: 0 } : undefined,
    grid: { left: 8, right: 16, top: series.length > 1 ? 32 : 16, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: AXIS_STYLE.axisLine,
      axisTick: AXIS_STYLE.axisTick,
      axisLabel: AXIS_STYLE.axisLabel,
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: AXIS_STYLE.axisTick,
      axisLabel: AXIS_STYLE.axisLabel,
      splitLine: AXIS_STYLE.splitLine,
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.08 },
      data: s.value,
    })),
    ...overrides,
  } as ECOption;
}

/**
 * 生成横向条形排行图 option
 * @param data 排行数据
 * @param overrides 覆盖项
 * @returns 条形图 option
 */
export function rankBarOption(
  data: Array<{ name: string; value: number }>,
  overrides: Partial<ECOption> = {},
): ECOption {
  return {
    ...baseChartOption(),
    tooltip: { ...TOOLTIP_STYLE, trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 8, right: 56, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: AXIS_STYLE.axisTick,
      axisLabel: { ...AXIS_STYLE.axisLabel, formatter: '{value}%' },
      splitLine: AXIS_STYLE.splitLine,
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map((d) => d.name),
      axisLine: { show: false },
      axisTick: AXIS_STYLE.axisTick,
      axisLabel: AXIS_STYLE.axisLabel,
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 16,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', formatter: '{c}%', ...TEXT_STYLE },
        data: data.map((d) => d.value),
      },
    ],
    ...overrides,
  } as ECOption;
}