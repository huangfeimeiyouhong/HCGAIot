/** L1 全国地图 GeoJSON 注册(echarts geo 消费;L2/L3 省街视角仍走百度 JSAPI,不在此列) */
import * as echarts from 'echarts/core';

import chinaGeoJson from '@/assets/map/china.json';

/** 全国地图注册名(固定,判重用) */
export const CHINA_MAP_NAME = 'china';

/**
 * 全国 GeoJSON 静态注册(幂等):DataV 4 位小数简化版(480KB),
 * 自带九段线 100000_JD feature 会原位渲染,勿再开第二 geo 画南海(会把全图重复缩小画在右下角)。
 * 九段线 feature 的 properties.name 为空串,注册时补名「九段线」——geo.regions 按名匹配,
 * 补名后才能单独给它配黄色国界描边(国界线分层渲染的数据前提)
 */
export function registerChinaMap() {
  if (!echarts.getMap(CHINA_MAP_NAME)) {
    const features = (chinaGeoJson as { features: unknown[] }).features.map((feature) => {
      const f = feature as { properties?: { adchar?: string }; };
      return f.properties?.adchar === 'JD'
        ? { ...f, properties: { ...f.properties, name: '九段线' } }
        : f;
    });
    echarts.registerMap(CHINA_MAP_NAME, {
      type: 'FeatureCollection',
      features,
    } as Parameters<typeof echarts.registerMap>[1]);
  }
}
