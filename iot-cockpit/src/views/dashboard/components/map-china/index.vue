<template>
  <div class="map-china">
    <div
      ref="domRef"
      class="map-china__chart"
    />
  </div>
</template>

<script setup lang="ts" name="MapChina">
import { computed } from 'vue';

import { CHINA_MAP_NAME, registerChinaMap } from './geo';
import { MAP_THEME } from './theme';

import chinaOutline from '@/assets/map/china-outline.json';
import { PROVINCE_NAME_BY_AD_CODE } from '@/constants/map';
import { useEcharts, type ECOption } from '@/hooks/use-echarts';

const emit = defineEmits(['province-click']);

registerChinaMap();

/** 行政区后缀(去后缀得短名,如“广东省”→“广东”) */
const NAME_SUFFIX_RE = /省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g;

/** 省全名 → 短名 */
const shortNameByFull: Record<string, string> = {};
/** 短名 → 省码(前 2 位,路由 /dashboard/:city 参数值) */
const cityCodeByShort: Record<string, string> = {};
Object.entries(PROVINCE_NAME_BY_AD_CODE).forEach(([cityCode, fullName]) => {
  const short = fullName.replace(NAME_SUFFIX_RE, '');
  shortNameByFull[fullName] = short;
  cityCodeByShort[short] = cityCode;
});

// ---- 样式(线框风格:区块无填充;省界浅灰细线,国界/海岸线黄色粗线,hover 提亮省界与省名;色值集中 theme.ts) ----

/** 省界描边:浅灰细线 */
const borderStyle = {
  borderColor: MAP_THEME.provinceBorder,
  borderWidth: MAP_THEME.provinceBorderWidth,
};

/** 国界/海岸线描边:黄色粗线 + 黄色发光(对齐百度底图国界黄) */
const outlineStyle = {
  borderColor: MAP_THEME.outline,
  borderWidth: MAP_THEME.outlineWidth,
  shadowColor: MAP_THEME.outlineGlow,
  shadowBlur: MAP_THEME.outlineGlowBlur,
};

/** 国界/海岸线 lines series 数据(china-outline.json 单 feature MultiLineString,每链一条 polyline) */
const outlineLines = (chinaOutline as {
  features: { geometry: { coordinates: number[][][] } }[];
}).features[0].geometry.coordinates.map((coords) => ({ coords }));

/** 全国 geo.regions:省份区块内显示省名短名;九段线按名单配黄色描边 */
const countryRegions = [
  ...Object.keys(shortNameByFull).map((fullName) => ({
    name: fullName,
    label: {
      show: true,
      formatter: shortNameByFull[fullName],
      color: MAP_THEME.label,
      fontSize: 14,
    },
  })),
  {
    name: '九段线',
    itemStyle: outlineStyle,
  },
];

const option = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  geo: [
    {
      map: CHINA_MAP_NAME,
      // 滚轮缩放 + 拖拽平移;缩放范围钳位防缩没/失控
      roam: true,
      scaleLimit: { min: 0.8, max: 5 },
      // 容器已出血到左右面板下方,layoutCenter 对齐左右面板间的可视区中心(人工微调值);
      // 100% + 1.1 撑满可视区高度,九段线最南尾段(屏下 ~109px)有意取舍裁出屏换更大地图
      // (2026-09-11 用户定夺;东西向距面板各余 ~8px,顶部贴 header 底线)
      layoutCenter: ['50%', '58%'],
      layoutSize: '100%',
      zoom: 1.1,
      // geo 级 label 关闭兜底;省名逐 region 配置
      label: { show: false },
      // 线框风格:填充透明透出页面深蓝背景,省界只留浅灰描边
      itemStyle: { ...borderStyle, areaColor: 'transparent' },
      emphasis: {
        label: { show: true, color: MAP_THEME.hover },
        itemStyle: {
          ...borderStyle,
          areaColor: 'transparent',
          borderColor: MAP_THEME.hover,
          borderWidth: MAP_THEME.hoverBorderWidth,
        },
      },
      regions: countryRegions,
      select: { disabled: true },
    },
  ],
  series: [
    {
      // 国界/海岸线层:geo 坐标系 polyline,叠在省界之上;silent 不拦省份 hover/点击
      type: 'lines',
      coordinateSystem: 'geo',
      polyline: true,
      silent: true,
      lineStyle: {
        color: MAP_THEME.outline,
        width: MAP_THEME.outlineWidth,
        cap: 'round',
        join: 'round',
        shadowColor: MAP_THEME.outlineGlow,
        shadowBlur: MAP_THEME.outlineGlowBlur,
      },
      data: outlineLines,
    },
  ],
}));

const { domRef } = useEcharts(option, (chartInstance) => {
  // 点省份区块 → 下钻 L2 省视角(全量省份可点——无公司/无网格省进 L2 看百度默认省界,
  // 有无资产不设限;非省 feature(九段线等)无省码映射不跳)
  chartInstance.on('click', (params: { componentType?: string; name?: string }) => {
    if (params.componentType !== 'geo' || !params.name) return;
    const short = shortNameByFull[params.name] ?? params.name.replace(NAME_SUFFIX_RE, '');
    const cityCode = cityCodeByShort[short];
    if (!cityCode) return;
    emit('province-click', cityCode);
  });
});
</script>

<style scoped lang="scss">
.map-china {
  width: 100%;
  height: 100%;

  &__chart {
    width: 100%;
    height: 100%;
  }
}
</style>
