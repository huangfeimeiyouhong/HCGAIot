<template>
  <div class="dashboard">
    <div class="dashboard__content">
      <!-- L1 全国地图层:铺满全屏铺底,echarts geo + GeoJSON 省份区块(区块内显示省名,可缩放拖拽),左右面板浮于其上 -->
      <div class="dashboard__map-layer">
        <MapChina @province-click="handleProvinceClick" />
      </div>
      <!-- 安全环保左栏 -->
      <div
        v-if="view === 'security'"
        class="dashboard__left"
      >
        <div class="dashboard__panel dashboard__panel--h156">
          <SecurityAssetInfo />
        </div>
        <div class="dashboard__panel dashboard__panel--h440">
          <SecurityHazard />
        </div>
        <div class="dashboard__panel dashboard__panel--h330">
          <SecuritySupervision />
        </div>
      </div>
      <!-- 应急态势左栏 -->
      <div
        v-else
        class="dashboard__left"
      >
        <div class="dashboard__panel dashboard__panel--h358">
          <EmergencyWarning />
        </div>
        <div class="dashboard__panel dashboard__panel--h520">
          <EmergencySupplies />
        </div>
      </div>
      <div class="dashboard__main">
        <SituationSwitch
          :view="view"
          @change="handleViewChange"
        />
        <div class="dashboard__carousel-wrapper">
          <VideoCarousel
            @more-click="goMonitor"
          />
        </div>
      </div>
      <!-- 安全环保右栏 -->
      <div
        v-if="view === 'security'"
        class="dashboard__right"
      >
        <div class="dashboard__panel dashboard__panel--h252">
          <SecurityRanking />
        </div>
        <div class="dashboard__panel dashboard__panel--h350">
          <SecurityIot />
        </div>
        <div class="dashboard__panel dashboard__panel--h304">
          <SecurityEmergencyManage />
        </div>
      </div>
      <!-- 应急态势右栏 -->
      <div
        v-else
        class="dashboard__right"
      >
        <div class="dashboard__panel dashboard__panel--h324">
          <EmergencyEvents />
        </div>
        <div class="dashboard__panel dashboard__panel--h276">
          <EmergencyTeam />
        </div>
        <div class="dashboard__panel dashboard__panel--h326">
          <EmergencyPlan />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="DashboardIndex">
import { ref, watch } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import { buildVideoCarouselRoute } from './carousel-data';
import EmergencyEvents from './components/emergency-events/index.vue';
import EmergencyPlan from './components/emergency-plan/index.vue';
import EmergencySupplies from './components/emergency-supplies/index.vue';
import EmergencyTeam from './components/emergency-team/index.vue';
import EmergencyWarning from './components/emergency-warning/index.vue';
import MapChina from './components/map-china/index.vue';
import SecurityAssetInfo from './components/security-asset-info/index.vue';
import SecurityEmergencyManage from './components/security-emergency-manage/index.vue';
import SecurityHazard from './components/security-hazard/index.vue';
import SecurityIot from './components/security-iot/index.vue';
import SecurityRanking from './components/security-ranking/index.vue';
import SecuritySupervision from './components/security-supervision/index.vue';
import SituationSwitch from './components/situation-switch/index.vue';
import VideoCarousel from './components/video-carousel/index.vue';

import type { CarouselTab } from './carousel-data';
import type { SituationView } from './situation-data';

const route = useRoute();
const router = useRouter();

/** 轮播面板右侧 LinkTag:重点项目→跳视频轮播页(全国视角不带 orgId = 全部项目);AI事件→跳事件台账 */
const goMonitor = (tab: CarouselTab) => {
  if (tab === 'ai') {
    router.push({ path: '/ledger/index', query: { type: 'ai' } });
    return;
  }
  router.push(buildVideoCarouselRoute({}));
};

/** 当前视角(query 驱动,缺省安全) */
const view = ref<SituationView>(route.query.view === 'emergency' ? 'emergency' : 'security');

// keep-alive 缓存期 route 指向他页,只在 L1 自己的路由上同步
watch(
  () => route.query.view,
  (next) => {
    if (route.name !== 'DashboardIndex') return;
    view.value = next === 'emergency' ? 'emergency' : 'security';
  }
);

const handleViewChange = (next: SituationView) => {
  router.replace({ query: { ...route.query, view: next } });
};

// L1 点省份区块 → 跳网格视角页(携带当前视角;模板简化两级:全国 → 网格)
const handleProvinceClick = (cityCode: string) => {
  router.push({ path: `/dashboard-grid/${cityCode}`, query: { view: view.value } });
};
</script>

<style scoped lang="scss">
.dashboard {
  background: linear-gradient(180deg, #0a1a3e 0%, #061230 100%);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  // 撑满路由容器,地图层才能按容器高度向四周出血铺满整个大屏舞台
  height: 100%;

  &__content {
    display: flex;
    align-items: flex-start;
    flex: 1;
    position: relative;
  }

  // 地图背景层:铺满整个大屏舞台(1920×1080)。向上出血 100px 到顶部导航下方,
  // 左右/底部出血容器 padding(30px);header-bar 已提 z-index 浮于地图之上
  &__map-layer {
    position: absolute;
    top: -30px;
    right: -10px;
    bottom: -10px;
    left: -10px;
    z-index: 0;
  }

  // 三栏浮于地图层之上;栏容器不拦截点击(地图空白处可点/缩放拖拽),交互子元素恢复
  &__left,
  &__main,
  &__right {
    position: relative;
    z-index: 1;
    pointer-events: none;

    > * {
      pointer-events: auto;
    }
  }

  &__left {
    width: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__main {
    flex: 1;
    // content 是 align-items: flex-start,height:100% 无有效参照会塌缩;用 stretch 撑满全高让 space-between 生效
    align-self: stretch;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  // 视频轮播面板(980×220,自带 header/body 视觉壳)
  &__carousel-wrapper {
    margin-left: 20px;
    margin-top: 12px;
  }

  &__right {
    width: 420px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__panel {
    display: flex;
    flex-direction: column;
  }

  &__panel--h156 { height: 156px; }
  &__panel--h252 { height: 252px; }
  &__panel--h276 { height: 276px; }
  &__panel--h304 { height: 304px; }
  &__panel--h324 { height: 324px; }
  &__panel--h326 { height: 326px; }
  &__panel--h330 { height: 330px; }
  &__panel--h350 { height: 350px; }
  &__panel--h358 { height: 358px; }
  &__panel--h440 { height: 440px; }
  &__panel--h520 { height: 520px; }
}
</style>
