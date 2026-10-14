# vue3-cockpit-starter

可视化驾驶舱大屏基础模板(1920×1080;Vue 3.5 `<script setup>` + TS + Vite + SCSS + Pinia + ECharts + video.js)。

## 快速开始

```bash
npm install
npm run dev     # 默认 9899 端口
npm run build   # 生产构建
```

## 包含内容

- **缩放壳**:`self-adaption` 1920×1080 等比缩放,业务组件直接写 px
- **布局**:三区 Header(main 居中光效大标题 / detail 左标题两变体,返回上一级/返回首页/全屏)+ keep-alive 缓存路由
- **面板**:panel-card / panel-title / sub-title / border-box-13 / card / nav-tab / section-tab
- **图表**:base-chart(use-echarts 封装)/ pie-center-chart / pie-3d-chart / pie-3d-panel / gauge-chart / liquid-chart
- **指标**:num-with-unit / name-value-item / legend + `v-thousand` 千分位指令
- **表单/数据组件**(ElementPlus 暗色二次封装):cascader(级联)/ select / date-picker / pagination / tree / tree-select / dialog / data-table(配置化表格)/ screen-table(大屏滚动表)
- **地图**:map-china(全国 GeoJSON 线框图,点省下钻)/ map-grid(单省聚焦 + 项目撒点),零地图厂商依赖
- **视频**:video-player——开源 video.js 封装,支持 mp4/webm/m3u8
- **工程**:use-polling(keep-alive 感知轮询)、use-resize、store(app/resize/auth)、utils(format/decimal/palette)
- **登录**:`src/permission.ts` 路由守卫 + `store/auth.ts`——默认 mock 放行(固定演示用户,零请求),接入真实 SSO 只改这两处 + `.env` 的 `VITE_AUTH_MODE`
- **示例页**:`views/dashboard` 三栏驾驶舱(L1 全国视角,安全环保/应急态势双视角切换)+ `views/dashboard-grid` 网格视角(点击地图撒点下钻)+ `views/ledger` 台账(新页打开,`query.type` 驱动 `LEDGER_CONFIGS`,级联/日期/配置化表格/分页全套演示)+ `views/video-carousel` 视频轮播,全部 mock 数据 + 5s 模拟轮询
- **组织筛选**:Header 左上角组织搜索入口(`org-search-dialog`),`store/org.ts` mock 组织树,支持两级联动筛选 + 选中下钻导航;台账页级联直接消费 `LEDGER_ORG_OPTIONS`

## 定制点

| 需求 | 位置 |
|------|------|
| Logo / 标题 | Logo 换 `src/assets/images/headers/logo.svg`;标题取路由 `meta.title`(可用 `appStore.pageTitle` 页面级覆盖) |
| Header 背景 | `src/assets/images/headers/` 下 `header.png`(main)/ `header-detail-bg.svg`(detail)同名替换 |
| 标题/数字字体 | `src/styles/index.scss` 的 `.font-title` / `.font-digital` |
| 主题色 | `src/constants/chart.ts` + 组件内 `#41C0FF` 主色 |
| 面板装饰图 | `src/assets/images/components/` 同名替换 |
| 新页面 | `src/views/<kebab-case>/` + `src/router/index.ts` |
| 台账类型 | `src/views/ledger/index.vue` 的 `LEDGER_CONFIGS`,按 `query.type` 配列/筛选项/数据源 |
| 组织树数据 | `src/store/org.ts`(导出 `LEDGER_ORG_OPTIONS` / `orgNameOf` 等) |
| 真实接口 | demo 页 mock 换成请求;`usePolling` 回调换拉数函数 |
| 省/市地图 | GeoJSON 放 `src/assets/map/`,`echarts.registerMap` 后切换 |

## 约定

- 组件一律显式 import(不依赖自动导入)
- echarts 渐变色用普通对象 `{ type:'linear', colorStops }`
- 轮询一律走 `usePolling`,回调保持静默刷新语义
- 模板不含任何业务密钥/品牌资源,地图 AK、私有 SDK、品牌字体请自行接入
