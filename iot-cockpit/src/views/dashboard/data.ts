/**
 * Dashboard 首页数据
 * 数据使用数字形式，千分位格式化在组件渲染时通过指令处理
 */
import { provinceNameOf, toShortName } from '@/constants/map';
import { getProvinceCompanies } from '@/views/dashboard/grid-data';
import { projectData } from '@/views/dashboard/project-data';

export interface MapDataItem {
  title: string;
  value: number;
}

/** 地区公司详情指标项(全国视角数值标签 hover 弹窗) */
export interface CompanyDetailMetric {
  label: string;
  value: number;
  unit: string;
}

/**
 * 获取地图数据(与真实组织架构同源:省域公司名录由 adCode 派生省码;
 * value 为该省真实资产数;title 为省短名(adCode 反查,与公司命名解耦),与 map-china 省名短名口径一致)
 */
export function getMapData(): MapDataItem[] {
  // 省码为空的公司(无 adCode = 未配置网格)无省视角路由,不进数值地图
  return getProvinceCompanies()
    .filter(({ cityCode }) => cityCode)
    .map(({ cityCode }) => ({
      title: toShortName(provinceNameOf(cityCode)),
      value: (projectData.value[cityCode] ?? []).length,
    }));
}

/**
 * 获取地区公司详情指标(全国视角 hover 数值标签弹出,2026-08-30 起弹窗禁用,数据保留备用)
 * 固定 6 项,按 2 列 × 3 行行主序渲染:考核得分/营业收入 | 资产数量/资产总额 | 出租率/建筑面积;
 * 公司名录与真实组织同源,资产数量取真实项目数(projectData 键 = 省码:北京 11/河北 13),其余指标为设计稿 mock 值
 */
export function getCompanyDetail(short: string): CompanyDetailMetric[] {
  const detailMap: Record<string, CompanyDetailMetric[]> = {
    北京: [
      {
        label: '考核得分', value: 96.5, unit: '分'
      },
      {
        label: '营业收入', value: 21.6, unit: '亿元'
      },
      {
        label: '资产数量', value: (projectData.value['11'] ?? []).length, unit: '个'
      },
      {
        label: '资产总额', value: 186.2, unit: '亿元'
      },
      {
        label: '出租率', value: 97.2, unit: '%'
      },
      {
        label: '建筑面积', value: 245, unit: '万㎡'
      },
    ],
    河北: [
      {
        label: '考核得分', value: 90.6, unit: '分'
      },
      {
        label: '营业收入', value: 7.2, unit: '亿元'
      },
      {
        label: '资产数量', value: (projectData.value['13'] ?? []).length, unit: '个'
      },
      {
        label: '资产总额', value: 68.4, unit: '亿元'
      },
      {
        label: '出租率', value: 92.8, unit: '%'
      },
      {
        label: '建筑面积', value: 102, unit: '万㎡'
      },
    ],
  };
  return detailMap[short] || [];
}

/**
 * 获取城市详情指标(省份视角 hover 城市标签弹出)
 * 资产数量取真实项目数,其余按城市名哈希生成稳定伪随机值(同一名称每次结果一致)
 */
export function getCityDetail(cityName: string, assetCount: number): CompanyDetailMetric[] {
  // 简单字符串哈希 → 0~1 稳定伪随机序列
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = (hash * 31 + cityName.charCodeAt(i)) % 1000003;
  }
  const rand = (salt: number) => {
    const x = Math.sin(hash + salt) * 10000;
    return x - Math.floor(x);
  };
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return [
    {
      label: '考核得分', value: round1(85 + rand(1) * 13), unit: '分'
    },
    {
      label: '营业收入', value: round1(assetCount * (0.5 + rand(2) * 0.6)), unit: '亿元'
    },
    {
      label: '资产数量', value: assetCount, unit: '个'
    },
    {
      label: '资产总额', value: round1(assetCount * (4 + rand(3) * 3)), unit: '亿元'
    },
    {
      label: '出租率', value: round1(88 + rand(4) * 10), unit: '%'
    },
    {
      label: '建筑面积', value: round1(assetCount * (6 + rand(5) * 4)), unit: '万㎡'
    },
  ];
}
