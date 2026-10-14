<template>
  <div class="dashboard-grid">
    <div class="dashboard-grid__content">
      <!-- 网格地图层:echarts geo 聚焦单省 + 项目撒点,铺底出血同全国视角 -->
      <div class="dashboard-grid__map-layer">
        <MapGrid
          :city="city"
          @project-click="handleProjectClick"
        />
      </div>
      <!-- 安全环保左栏 -->
      <div
        v-if="view === 'security'"
        class="dashboard-grid__left"
      >
        <div class="dashboard-grid__panel dashboard-grid__panel--h156">
          <SecurityAssetInfo
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h440">
          <SecurityHazard
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h330">
          <SecuritySupervision
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
      </div>
      <!-- 应急态势左栏 -->
      <div
        v-else
        class="dashboard-grid__left"
      >
        <div class="dashboard-grid__panel dashboard-grid__panel--h358">
          <EmergencyWarning
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h520">
          <EmergencySupplies
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
      </div>
      <div class="dashboard-grid__main">
        <SituationSwitch
          :view="view"
          @change="handleViewChange"
        />
        <div class="dashboard-grid__carousel-wrapper">
          <VideoCarousel
            :city="city"
            :grid-org-id="gridOrgId"
            @more-click="goMonitor"
          />
        </div>
      </div>
      <!-- 安全环保右栏 -->
      <div
        v-if="view === 'security'"
        class="dashboard-grid__right"
      >
        <div class="dashboard-grid__panel dashboard-grid__panel--h252">
          <SecurityRanking
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h350">
          <SecurityIot
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h304">
          <SecurityEmergencyManage
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
      </div>
      <!-- 应急态势右栏 -->
      <div
        v-else
        class="dashboard-grid__right"
      >
        <div class="dashboard-grid__panel dashboard-grid__panel--h324">
          <EmergencyEvents
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h276">
          <EmergencyTeam
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
        <div class="dashboard-grid__panel dashboard-grid__panel--h326">
          <EmergencyPlan
            :city="city"
            :grid-org-id="gridOrgId"
          />
        </div>
      </div>
    </div>

    <!-- 任务调度弹窗(点项目撒点演示打开;真实项目此处多为跳项目详情页) -->
    <DispatchDialog ref="dispatchDialogRef" />
  </div>
</template>

<script setup lang="ts" name="DashboardGrid">
import { ref, watch } from 'vue';

import { useRoute, useRouter } from 'vue-router';

// 全国视角页面板组件跨页复用(面板无页面私有状态,均为 props 驱动)
import { buildVideoCarouselRoute } from '../dashboard/carousel-data';
import DispatchDialog from '../dashboard/components/dispatch-dialog/index.vue';
import EmergencyEvents from '../dashboard/components/emergency-events/index.vue';
import EmergencyPlan from '../dashboard/components/emergency-plan/index.vue';
import EmergencySupplies from '../dashboard/components/emergency-supplies/index.vue';
import EmergencyTeam from '../dashboard/components/emergency-team/index.vue';
import EmergencyWarning from '../dashboard/components/emergency-warning/index.vue';
import MapGrid from '../dashboard/components/map-grid/index.vue';
import SecurityAssetInfo from '../dashboard/components/security-asset-info/index.vue';
import SecurityEmergencyManage from '../dashboard/components/security-emergency-manage/index.vue';
import SecurityHazard from '../dashboard/components/security-hazard/index.vue';
import SecurityIot from '../dashboard/components/security-iot/index.vue';
import SecurityRanking from '../dashboard/components/security-ranking/index.vue';
import SecuritySupervision from '../dashboard/components/security-supervision/index.vue';
import SituationSwitch from '../dashboard/components/situation-switch/index.vue';
import VideoCarousel from '../dashboard/components/video-carousel/index.vue';

import type { CarouselTab } from '../dashboard/carousel-data';
import type { SituationView } from '../dashboard/situation-data';

import { buildLedgerQuery } from '@/utils/ledger';

const route = useRoute();
const router = useRouter();

/** 轮播面板右侧 LinkTag:重点项目→跳视频轮播页(带网格 orgId);AI事件→跳事件台账(携带当前省域公司+网格) */
const goMonitor = (tab: CarouselTab) => {
  if (tab === 'ai') {
    router.push({ path: '/ledger/index', query: { type: 'ai', ...buildLedgerQuery(city.value, gridOrgId.value) } });
    return;
  }
  router.push(buildVideoCarouselRoute({ city: city.value, gridOrgId: gridOrgId.value }));
};

/** 省码(路由参数,前 2 位行政码) */
const city = ref((route.params.city as string) || '');
/** 网格 orgId(query 参数;空 = 省下全部资产) */
const gridOrgId = ref((route.query.grid as string) || '');

// keep-alive 缓存期组件不卸载但路由已指向他页,只在本页自己的路由上同步
watch(
  () => [route.params.city, route.query.grid] as const,
  ([nextCity, nextGrid]) => {
    if (route.name !== 'DashboardGrid') return;
    city.value = (nextCity as string) || '';
    gridOrgId.value = (nextGrid as string) || '';
  }
);

/** 当前视角(query 驱动,缺省安全) */
const view = ref<SituationView>(route.query.view === 'emergency' ? 'emergency' : 'security');

// keep-alive 缓存期 route 指向他页,只在本页自己的路由上同步
watch(
  () => route.query.view,
  (next) => {
    if (route.name !== 'DashboardGrid') return;
    view.value = next === 'emergency' ? 'emergency' : 'security';
  }
);

const handleViewChange = (next: SituationView) => {
  router.replace({ query: { ...route.query, view: next } });
};

/** 点项目撒点 → 打开任务调度弹窗(模板演示;真实项目多为跳项目详情页) */
const dispatchDialogRef = ref<InstanceType<typeof DispatchDialog>>();

const handleProjectClick = (projectId: string) => {
  dispatchDialogRef.value?.open({ id: projectId });
};
</script>

<style scoped lang="scss">
.dashboard-grid {
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

  // 地图背景层:铺满整个大屏舞台(1920×1080),向上出血到顶部导航下方
  &__map-layer {
    position: absolute;
    top: -30px;
    right: -10px;
    bottom: -10px;
    left: -10px;
    z-index: 0;
  }

  // 三栏浮于地图层之上;栏容器不拦截点击(地图空白处可点),交互子元素恢复
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
