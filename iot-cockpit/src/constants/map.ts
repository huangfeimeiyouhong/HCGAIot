/**
 * 地图纯常量(零厂商依赖):行政区划码/省名/短名归一、网格色板、省中心锚点。
 * 行政区划数据口径 GB/T 2260;省中心锚点由 assets/map/china.json(DataV.GeoAtlas)主陆块包围盒几何中心算出。
 */

/** 省级行政区划码(前 2 位省码) → 省全名(省码视角路由 /dashboard-grid/:city 的键) */
export const PROVINCE_NAME_BY_AD_CODE: Record<string, string> = {
  '11': '北京市',
  '12': '天津市',
  '13': '河北省',
  '14': '山西省',
  '15': '内蒙古自治区',
  '21': '辽宁省',
  '22': '吉林省',
  '23': '黑龙江省',
  '31': '上海市',
  '32': '江苏省',
  '33': '浙江省',
  '34': '安徽省',
  '35': '福建省',
  '36': '江西省',
  '37': '山东省',
  '41': '河南省',
  '42': '湖北省',
  '43': '湖南省',
  '44': '广东省',
  '45': '广西壮族自治区',
  '46': '海南省',
  '50': '重庆市',
  '51': '四川省',
  '52': '贵州省',
  '53': '云南省',
  '54': '西藏自治区',
  '61': '陕西省',
  '62': '甘肃省',
  '63': '青海省',
  '64': '宁夏回族自治区',
  '65': '新疆维吾尔自治区',
  '71': '台湾省',
  '81': '香港特别行政区',
  '82': '澳门特别行政区',
};

/** 行政码归一取前 2 位省码(兼容 2/4/6 位与数字形态;空值返回 '') */
export const provinceCodeOf = (adCode?: string | number | null): string => {
  const code = adCode === null || adCode === undefined ? '' : String(adCode).trim();
  return code ? code.slice(0, 2) : '';
};

/** 行政码(任意位数)→ 省全名;未命中返回 '' */
export const provinceNameOf = (adCode?: string | number | null): string =>
  PROVINCE_NAME_BY_AD_CODE[provinceCodeOf(adCode)] ?? '';

/** 行政区后缀归一 */
const NAME_SUFFIX_RE = /省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g;

/** 去行政区后缀得短名,如 '广东省' → '广东' */
export function toShortName(fullName: string): string {
  return fullName.replace(NAME_SUFFIX_RE, '');
}

/** 组织名 → 省码(名称含省全名/短名即命中,最长优先;匹配不到返回 '') */
export const provinceCodeOfName = (name?: string | null): string => {
  if (!name) return '';
  let hitLength = 0;
  let hitCode = '';
  Object.entries(PROVINCE_NAME_BY_AD_CODE).forEach(([code, fullName]) => {
    [fullName, toShortName(fullName)].forEach((candidate) => {
      if (candidate.length > hitLength && name.includes(candidate)) {
        hitLength = candidate.length;
        hitCode = code;
      }
    });
  });
  return hitCode;
};

/** 网格五色板(stroke 亮色描边区分网格;fill 备用) */
export const GRID_COLORS: { fill: string; stroke: string }[] = [
  { fill: '#1F3D7A', stroke: '#6B8AFF' }, // 蓝
  { fill: '#1B5A3A', stroke: '#3DE08B' }, // 绿
  { fill: '#7A2A3A', stroke: '#FF6B81' }, // 红
  { fill: '#7A5A1A', stroke: '#FFD66B' }, // 黄
  { fill: '#5B3A8C', stroke: '#B78FFF' }, // 紫
];

/** 省中心锚点(短名索引;网格视角 echarts geo center 定位用) */
export const PROVINCE_CENTER_MAP: Record<string, { lng: number; lat: number }> = {
  北京: { lng: 116.47, lat: 40.25 },
  天津: { lng: 117.39, lat: 39.4 },
  河北: { lng: 116.67, lat: 39.34 },
  山西: { lng: 112.4, lat: 37.66 },
  内蒙古: { lng: 111.62, lat: 45.37 },
  辽宁: { lng: 122.32, lat: 41.11 },
  吉林: { lng: 126.48, lat: 43.59 },
  黑龙江: { lng: 128.14, lat: 48.49 },
  上海: { lng: 121.43, lat: 31.09 },
  江苏: { lng: 119.17, lat: 32.94 },
  浙江: { lng: 120.09, lat: 29.16 },
  安徽: { lng: 117.27, lat: 32.02 },
  福建: { lng: 118.16, lat: 25.93 },
  江西: { lng: 116.03, lat: 27.28 },
  山东: { lng: 118.77, lat: 36.34 },
  河南: { lng: 113.5, lat: 33.87 },
  湖北: { lng: 112.25, lat: 31.15 },
  湖南: { lng: 111.52, lat: 27.38 },
  广东: { lng: 113.42, lat: 22.86 },
  广西: { lng: 108.27, lat: 23.89 },
  海南: { lng: 109.83, lat: 19.15 },
  重庆: { lng: 107.75, lat: 30.18 },
  四川: { lng: 102.95, lat: 30.18 },
  贵州: { lng: 106.58, lat: 26.92 },
  云南: { lng: 101.86, lat: 25.18 },
  西藏: { lng: 88.75, lat: 31.67 },
  陕西: { lng: 108.37, lat: 35.65 },
  甘肃: { lng: 100.53, lat: 37.69 },
  青海: { lng: 96.24, lat: 35.4 },
  宁夏: { lng: 105.97, lat: 37.31 },
  新疆: { lng: 84.94, lat: 41.76 },
  台湾: { lng: 121.02, lat: 23.6 },
  香港: { lng: 114.12, lat: 22.38 },
  澳门: { lng: 113.57, lat: 22.16 },
};
