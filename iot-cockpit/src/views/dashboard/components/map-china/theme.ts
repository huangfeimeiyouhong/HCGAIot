/*
 * L1 全国地图线框主题:地图全部色值/线宽集中于此,设计换色只改这一处。
 * 渲染分三层(结构见 index.vue):省界细线 / 国界·海岸线·九段线粗线(带发光)/ 省名文字。
 * 区块填充恒透明(线框风格,透出页面深蓝渐变背景,不在此配置)。
 */
export const MAP_THEME = {
  /** 省界描边色(细线) */
  provinceBorder: '#8A97A8',
  /** 国界/海岸线/九段线描边色(粗线+发光);换色时同步改 outlineGlow */
  outline: '#FEBE29',
  /** 国界发光色(与 outline 同色系,设计稿给 hex 时改 RGB 三位保透明度) */
  outlineGlow: 'rgba(254, 190, 41, 0.8)',
  /** 省名文字色 */
  label: 'rgba(255, 255, 255, 0.9)',
  /** hover 高亮色(省名 + 省界描边提亮) */
  hover: '#5DEBFF',

  /** 省界线宽(px) */
  provinceBorderWidth: 1,
  /** 国界线宽(px) */
  outlineWidth: 3,
  /** 国界发光半径(px,越大越晕) */
  outlineGlowBlur: 12,
  /** hover 时省界线宽(px) */
  hoverBorderWidth: 2,
} as const;
