<!--
  入口选择页 —— 深色科技风 + 地图背景 + 三入口卡片
-->
<template>
  <div class="entry-page">
    <!-- 地图背景：动态 import，加载期纯深色渐变兜底 -->
    <div class="entry-page__bg">
      <BaseChart
        v-if="mapReady"
        :option="mapOption"
        height="100%"
      />
    </div>
    <div class="entry-page__mask" />

    <div class="entry-page__inner">
      <header class="entry-page__header">
        <img
          class="entry-page__logo"
          src="@/assets/images/logo.svg"
          alt="后厨管家"
        >
        <h1 class="entry-page__title">
          后厨管家 · AIoT 双边服务平台
        </h1>
        <p class="entry-page__subtitle">
          平台运营 · 厂家服务 · 客户用保 三端一体，设备全生命周期数字化管理
        </p>
      </header>

      <section class="entry-page__cards">
        <article
          v-for="entry in entries"
          :key="entry.role"
          class="entry-card"
          @click="go(entry.role)"
        >
          <div class="entry-card__icon">
            <el-icon><component :is="entry.icon" /></el-icon>
          </div>
          <h3 class="entry-card__title">
            {{ entry.title }}
          </h3>
          <p class="entry-card__desc">
            {{ entry.desc }}
          </p>
          <ul class="entry-card__points">
            <li
              v-for="point in entry.points"
              :key="point"
            >
              {{ point }}
            </li>
          </ul>
          <span class="entry-card__cta">
            进入{{ entry.short }} →
          </span>
        </article>
      </section>

      <footer class="entry-page__footer">
        <el-button
          text
          @click="goDemo('/demo/guide')"
        >
          演示导览：四条主链路怎么点
        </el-button>
        <el-button
          text
          @click="goDemo('/demo/isolation')"
        >
          数据隔离演示
        </el-button>
        <el-button
          text
          @click="openScreen"
        >
          平台运营监控大屏
        </el-button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts" name="Entry">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { ECOption } from '@/hooks/use-echarts';

import BaseChart from '@/components/data/BaseChart.vue';

import { CHART_DARK_MAP } from '@/constants/chart';

import type { Role } from '@/types';

/** 入口卡片定义 */
interface EntryCard {
  role: Role;
  title: string;
  short: string;
  icon: string;
  desc: string;
  points: string[];
}

const router = useRouter();

/** 地图是否加载完成（加载期用深色渐变兜底） */
const mapReady = ref(false);

const entries: EntryCard[] = [
  {
    role: 'PLATFORM',
    title: '平台方运营',
    short: '平台运营',
    icon: 'Odometer',
    desc: '全平台数据总览、入驻审核、租户与设备治理、争议仲裁',
    points: ['入驻申请 7 态审核流转', '全局设备台账与绑定关系', '履约考核与争议仲裁'],
  },
  {
    role: 'VENDOR',
    title: '厂家服务',
    short: '厂家端',
    icon: 'Cpu',
    desc: '入驻申请、产品型号档案、设备台账申报、告警响应与工单闭环',
    points: ['入驻申请与试运营转正', '设备批量导入与绑定申报', '工单接单 / 进展 / 反馈含备件'],
  },
  {
    role: 'CUSTOMER',
    title: '客户用保',
    short: '客户端',
    icon: 'OfficeBuilding',
    desc: '我的设备、告警确认、在线报修、验收评价与绑定确认',
    points: ['设备资产总览与告警提醒', '一键发起报修并跟踪进度', '验收 / 评价 / 绑定确认'],
  },
];

/** 地图 option（浅色线框叠加在深色底上） */
const mapOption = computed<ECOption>(() => ({
  backgroundColor: 'transparent',
  geo: {
    map: 'china',
    roam: false,
    zoom: 1.15,
    center: [105, 36],
    itemStyle: {
      areaColor: 'transparent',
      borderColor: CHART_DARK_MAP.borderColor,
      borderWidth: 1,
    },
    emphasis: {
      disabled: true,
    },
    label: { show: false },
  },
  series: [],
}) as ECOption);

/**
 * 动态加载地图 GeoJSON（480KB，不进首屏 bundle，见架构文档 D4）
 * 加载失败时静默降级为纯深色渐变，不阻塞页面
 */
onMounted(async () => {
  try {
    await (await import('@/assets/map/china.json')).default;
    // china.json 为标准 GeoJSON（FeatureCollection），需注册为 echarts 地图
    const [{ registerMap }, geo] = await Promise.all([
      import('echarts/core'),
      import('@/assets/map/china.json'),
    ]);
    registerMap('china', geo.default as never);
    mapReady.value = true;
  } catch (error) {
    console.warn('[entry] 地图背景加载失败，降级为纯深色背景：', error);
  }
});

/** 进入指定入口的登录页 */
const go = (role: Role): void => {
  void router.push({ path: '/login', query: { role: role.toLowerCase() } });
};

/** 跳演示页 */
const goDemo = (path: string): void => {
  void router.push(path);
};

/** 打开 IoT 大屏（file:// 下可能被拦截，失败给出提示） */
const openScreen = (): void => {
  const url = import.meta.env.VITE_COCKPIT_URL;
  if (!url) {
    window.alert('未配置 VITE_COCKPIT_URL，请在 .env 中补充大屏地址');
    return;
  }
  const win = window.open(url, '_blank');
  if (!win) {
    window.alert('浏览器拦截了新窗口，请允许弹窗后重试；或复制地址到新标签页打开：\n' + new URL(url, window.location.href).href);
  }
};
</script>

<style scoped lang="scss">
.entry-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: var(--color-bg-dark);
  color: var(--color-dark-text);

  &__bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    // 加载期兜底：纯深色径向渐变
    background: radial-gradient(ellipse at 50% 40%, var(--color-bg-dark-2) 0%, var(--color-bg-dark) 70%);
  }

  &__mask {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(180deg, rgba(6, 18, 48, 0.35) 0%, rgba(6, 18, 48, 0.85) 100%);
    pointer-events: none;
  }

  &__inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 48px 24px;
  }

  &__header {
    text-align: center;
    margin-bottom: 40px;
  }

  &__logo {
    width: 56px;
    height: 56px;
    margin-bottom: 16px;
  }

  &__title {
    color: var(--color-dark-strong);
    font-size: 32px;
    font-weight: 600;
    letter-spacing: 2px;
  }

  &__subtitle {
    margin-top: 10px;
    color: var(--color-dark-dim);
    font-size: 14px;
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 320px));
    gap: 24px;
    width: 100%;
    max-width: 1080px;
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 40px;

    :deep(.el-button) {
      color: var(--color-dark-dim);

      &:hover {
        color: var(--color-primary);
      }
    }
  }
}

.entry-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 28px 24px;
  border: 1px solid var(--color-dark-line);
  border-radius: 10px;
  background: rgba(13, 43, 82, 0.55);
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    background: rgba(20, 58, 106, 0.7);
    transform: translateY(-4px);
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 10px;
    background: rgba(65, 192, 255, 0.14);
    color: var(--color-primary);
    font-size: 24px;
  }

  &__title {
    color: var(--color-dark-strong);
    font-size: 20px;
    font-weight: 600;
  }

  &__desc {
    color: var(--color-dark-dim);
    font-size: 13px;
    line-height: 1.6;
    min-height: 42px;
  }

  &__points {
    margin: 4px 0 0;
    padding-left: 18px;
    list-style: none;

    li {
      position: relative;
      color: var(--color-dark-dim);
      font-size: 12px;
      line-height: 1.9;

      &::before {
        content: '';
        position: absolute;
        top: 10px;
        left: -14px;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--color-primary);
      }
    }
  }

  &__cta {
    margin-top: 8px;
    color: var(--color-primary);
    font-size: 13px;
    font-weight: 500;
  }
}
</style>