<!--
  V-12 履约画像 —— 按季度看本厂 SLA 达成情况
  季度选择器（getPerformanceQuarters）+ SLA 指标卡 + 达成率趋势图 + 响应/确认时长对比
-->
<template>
  <PageContainer
    title="履约画像"
    desc="按季度回顾本厂的接单及时率、处理及时率、一次通过率与违约次数，用于服务复盘。"
  >
    <DemoTipBar />

    <section class="quarter-bar">
      <span class="quarter-bar__label">统计季度</span>
      <el-radio-group
        v-model="quarter"
        size="large"
        @change="onQuarterChange"
      >
        <el-radio-button
          v-for="q in quarters"
          :key="q"
          :value="q"
        >
          {{ q }}
        </el-radio-button>
      </el-radio-group>
      <span class="quarter-bar__tip">
        共 {{ quarters.length }} 个季度可查
      </span>
    </section>

    <section
      v-if="loading"
      class="card"
    >
      <el-skeleton :rows="6" animated />
    </section>

    <template v-else-if="stat">
      <section class="stats">
        <StatCard
          v-for="item in statCards"
          :key="item.key"
          :data="item"
          :clickable="false"
        />
      </section>

      <section class="charts">
        <ChartCard
          title="三项达成率"
          :sub-title="`${quarter} · 单位 %`"
        >
          <BaseChart :option="rateOption" />
        </ChartCard>
        <ChartCard
          title="时效表现"
          :sub-title="`${quarter} · 单位 小时`"
        >
          <BaseChart :option="hoursOption" />
        </ChartCard>
      </section>

      <section class="card">
        <DescList :items="descItems" />
      </section>
    </template>

    <section
      v-else
      class="card"
    >
      <EmptyState
        text="该季度暂无履约统计"
        desc="换一个季度试试，或确认本厂已产生工单数据"
        :actionable="false"
      />
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="VendorPerformance">
import { computed, onMounted, ref } from 'vue';

import BaseChart from '@/components/data/BaseChart.vue';
import ChartCard from '@/components/data/ChartCard.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatCard from '@/components/data/StatCard.vue';

import { barOption, rankBarOption } from '@/constants/chart';

import { vendorApi } from '@/api/vendor';

import type { ECOption } from '@/hooks/use-echarts';
import type { StatCardData, VendorSlaStat } from '@/types';

/** 描述列表项（与 DescList.vue 的 Props.items 结构保持一致） */
interface DescItem {
  label: string;
  value?: string | number | null;
  span?: number;
}

const quarters = ref<string[]>([]);
const quarter = ref('');
const stat = ref<VendorSlaStat | null>(null);
const loading = ref(false);

/** 星级：按一次通过率折算（≥95 五星，每 5 分降一星，最低一星） */
const starLevel = computed(() => {
  if (!stat.value) return 0;
  const p = stat.value.passRate;
  if (p >= 95) return 5;
  if (p >= 90) return 4;
  if (p >= 85) return 3;
  if (p >= 80) return 2;
  return 1;
});

const starText = computed(() => '★'.repeat(starLevel.value) + '☆'.repeat(5 - starLevel.value));

const statCards = computed<StatCardData[]>(() => {
  const s = stat.value;
  if (!s) return [];
  return [
    { key: 'accept', label: '接单及时率', value: s.onTimeAcceptRate, unit: '%', tone: s.onTimeAcceptRate >= 90 ? 'success' : 'danger' },
    { key: 'handle', label: '处理及时率', value: s.onTimeHandleRate, unit: '%', tone: s.onTimeHandleRate >= 90 ? 'success' : 'danger' },
    { key: 'pass', label: '一次通过率', value: s.passRate, unit: '%', tone: s.passRate >= 90 ? 'success' : 'primary' },
    { key: 'response', label: '平均响应时长', value: s.avgResponseHours, unit: 'h', tone: 'info' },
    { key: 'confirm', label: '平均确认时长', value: s.avgConfirmHours, unit: 'h', tone: 'info' },
    { key: 'breach', label: '违约次数', value: s.breachCount, unit: '次', tone: s.breachCount > 0 ? 'danger' : 'success' },
  ];
});

const rateOption = computed<ECOption>(() => {
  const s = stat.value;
  if (!s) return barOption([]);
  return rankBarOption([
    { name: '接单及时率', value: s.onTimeAcceptRate },
    { name: '处理及时率', value: s.onTimeHandleRate },
    { name: '一次通过率', value: s.passRate },
  ]);
});

const hoursOption = computed<ECOption>(() => {
  const s = stat.value;
  if (!s) return barOption([]);
  return barOption([
    { name: '平均响应', value: s.avgResponseHours },
    { name: '平均确认', value: s.avgConfirmHours },
  ]);
});

const descItems = computed<DescItem[]>(() => {
  const s = stat.value;
  if (!s) return [];
  return [
    { label: '统计季度', value: s.quarter },
    { label: '厂家编号', value: s.vendorId },
    { label: '综合星级', value: `${starText.value}（${starLevel.value}/5）` },
    { label: '接单及时率', value: `${s.onTimeAcceptRate}%` },
    { label: '处理及时率', value: `${s.onTimeHandleRate}%` },
    { label: '一次通过率', value: `${s.passRate}%` },
    { label: '平均响应时长', value: `${s.avgResponseHours} 小时` },
    { label: '平均确认时长', value: `${s.avgConfirmHours} 小时` },
    { label: '违约次数', value: `${s.breachCount} 次` },
  ];
});

const loadQuarters = async (): Promise<void> => {
  try {
    const list = await vendorApi.getPerformanceQuarters();
    quarters.value = list ?? [];
    if (!quarter.value && quarters.value.length) quarter.value = quarters.value[0]!;
  } catch {
    quarters.value = [];
  }
};

const loadStat = async (): Promise<void> => {
  if (!quarter.value) {
    stat.value = null;
    return;
  }
  loading.value = true;
  try {
    stat.value = await vendorApi.getPerformance(quarter.value);
  } catch {
    stat.value = null;
  } finally {
    loading.value = false;
  }
};

const onQuarterChange = async (): Promise<void> => {
  await loadStat();
};

onMounted(async () => {
  await loadQuarters();
  await loadStat();
});
</script>

<style scoped lang="scss">
.quarter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: var(--layout-card-gap);
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);
}

.quarter-bar__label {
  color: var(--color-text-body);
  font-size: 13px;
  white-space: nowrap;
}

.quarter-bar__tip {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}
</style>
