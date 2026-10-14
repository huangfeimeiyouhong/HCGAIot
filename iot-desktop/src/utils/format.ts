/** 千分位与数值展示格式化（迁移自 dashboard-poc） */

export interface FormatThousandConfig {
  /** 小数位数 */
  decimals?: number;
  /** 是否四舍五入，默认 false（截断） */
  round?: boolean;
}

export const isEmpty = (v: unknown): v is undefined | null | '' =>
  v === undefined || v === null || v === '';

export const isNumeric = (v: unknown): boolean =>
  !isNaN(Number(v)) && !isNaN(parseFloat(String(v)));

export const formatThousand = (v: unknown, config: FormatThousandConfig = {}): string => {
  if (isEmpty(v) || !isNumeric(v)) return String(v);

  let num = parseFloat(String(v));

  if (config.decimals !== undefined && config.decimals >= 0) {
    if (config.round) {
      num = Math.round(num * 10 ** config.decimals) / 10 ** config.decimals;
    } else {
      num = Math.floor(num * 10 ** config.decimals) / 10 ** config.decimals;
    }
    num = Number(num.toFixed(config.decimals));
  }

  const parts = num.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const formatValue = (v: unknown): string => {
  if (isEmpty(v)) return '-';
  if (isNumeric(v)) return formatThousand(v);
  return String(v);
};

/** 两位小数字符串去尾零(整数不带 .00):'98.50' → '98.5','100.00' → '100' */
export const trimDecimalZeros = (v: string | number): string => {
  if (isEmpty(v)) return String(v);
  const num = Number(v);
  return Number.isNaN(num) ? String(v) : String(num);
};

/** 去千分位/百分号转数值（排序前用） */
export const formatNumFromDisplay = (num: string | number | null | undefined): number => {
  if (num === null || num === undefined) return 0;
  if (typeof num === 'number') return Number.isNaN(num) ? 0 : num;
  return Number(String(num).replace(/,/g, '').replace(/%/g, '').trim()) || 0;
};

export interface TreeRow {
  children?: TreeRow[];
  [key: string]: unknown;
}

type SortOrder = 'ascending' | 'descending' | null;

/** 递归树形表格排序（el-table sort-change 用） */
export const tableSort = <T extends TreeRow>(data: T[], prop: string, order: SortOrder): T[] => {
  if (order === 'ascending' || order === 'descending') {
    return data.sort((a, b) => {
      if (a.children) a.children = tableSort(a.children, prop, order);
      if (b.children) b.children = tableSort(b.children, prop, order);
      return order === 'ascending'
        ? Number(formatNumFromDisplay(a[prop] as string | number)) - Number(formatNumFromDisplay(b[prop] as string | number))
        : Number(formatNumFromDisplay(b[prop] as string | number)) - Number(formatNumFromDisplay(a[prop] as string | number));
    });
  }
  return data;
};

export const formatNumberToDisplay = (num: number | null | undefined): string => {
  if (num === null || num === undefined || !num || Number.isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export const formatNumberToDisplayByTable = (_: unknown, __: unknown, cellValue: unknown): string =>
  formatNumberToDisplay(Number(cellValue));

/**
 * 文件大小格式化（上传占位、附件列表用）
 * ⚠️ 本工程扩展（非 iot-cockpit 原样复制）：附件/上传是桌面端新增能力
 * @param bytes 字节数
 * @returns 如 '12 KB' / '1.2 MB'
 */
export const formatSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
};
