<!--
  V-09 告警统计 —— 按 日/周/月 粒度 + 维度切换看告警趋势与分布
  三张分布图（等级 / 来源 / 状态）+ TOP 排行，全部经 vendorApi.getAlarmStats 取数
-->
<template>
  <PageContainer
    title="告警统计"
    desc="按日 / 周 / 月粒度统计本厂告警的等级构成、触发来源与处理状态，用于定位高发问题。"
  >
    <DemoTipBar />

    <section class="filter-bar">
      <Select
        v-model="granularity"
        label="统计粒度"
        :options="granularityOptions"
        :clearable="false"
        placeholder="请选择粒度"
      />
      <Select
        v-model="statsDimension"
        label="分析维度"
        :options="dimensionOptions"
        :clearable="false"
        placeholder="请选择维度"
      />
      <span class="filter-bar__tip">
        {{ granularityTip }}
      </span>
    </section>

    <section class="stats">
      <StatCard
        v-for="item in statCards"
        :key="item.key"
        :data="item"
        :clickable="false"
      />
    </section>

    <section class="charts">
      <ChartCard title="告警等级构成">
        <BaseChart :option="levelOption" />
      </ChartCard>
      <ChartCard title="告警触发来源">
        <BaseChart :option="sourceOption" />
      </ChartCard>
      <ChartCard title="告警处理状态">
        <BaseChart :option="statusOption" />
      </ChartCard>
    </section>

    <section class="charts">
      <ChartCard
        title="等级 / 来源 / 状态 TOP 排行"
        sub-title="按数量降序"
      >
        <BaseChart :option="rankOption" />
      </ChartCard>
      <ChartCard
        title="各分类占比"
        sub-title="等级 + 来源 + 状态合并视图"
      >
        <BaseChart :option="mergedOption" />
      </ChartCard>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="VendorAlarmStats">
import { computed, onMounted, ref, watch } from 'vue';

import BaseChart from '@/components/data/BaseChart.vue';
import ChartCard from '@/components/data/ChartCard.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Select from '@/components/control/Select.vue';
import StatCard from '@/components/data/StatCard.vue';

import { barOption, pieOption } from '@/constants/chart';

import { vendorApi } from '@/api/vendor';

import type { ECOption } from '@/hooks/use-echarts';
import type { ChartSeriesData, StatCardData } from '@/types';

const granularityOptions = [
  { label: '按日', value: 'day' },
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' },
];

const dimensionOptions = [
  { label: '按告警等级', value: 'level' },
  { label: '按触发来源', value: 'source' },
  { label: '按处理状态', value: 'status' },
];

const granularity = ref<'day' | 'week' | 'month'>('day');
const statsDimension = ref('level');

const granularityTip = computed(
  () =>
    ({
      day: '日粒度：看最近一天内的告警构成，适合定位突发问题',
      week: '周粒度：看一周内的告警构成，适合观察短期趋势',
      month: '月粒度：看一个月内的告警构成，适合做月度复盘',
    })[granularity.value],
);

/** 三组分布数据 */
const byType = ref<ChartSeriesData[]>([]);
const bySource = ref<ChartSeriesData[]>([]);
const byStatus = ref<ChartSeriesData[]>([]);

const sum = (list: ChartSeriesData[]): number => list.reduce((s, d) => s + d.value, 0);
const pick = (list: ChartSeriesData[], name: string): number =>
  list.find((d) => d.name === name)?.value ?? 0;

const total = computed(() => sum(byType.value));

const statCards = computed<StatCardData[]>(() => [
  { key: 'total', label: '告警总数', value: total.value, unit: '条', tone: 'primary' },
  { key: 'urgent', label: '紧急告警', value: pick(byType.value, '紧急'), unit: '条', tone: 'danger' },
  { key: 'important', label: '重要告警', value: pick(byType.value, '重要'), unit: '条', tone: 'warning' },
  { key: 'unconfirmed', label: '未确认', value: pick(byStatus.value, '未确认'), unit: '条', tone: 'warning' },
  { key: 'recovered', label: '已恢复', value: pick(byStatus.value, '已恢复'), unit: '条', tone: 'success' },
  {
    key: 'urgentRate',
    label: '紧急占比',
    value: total.value ? Number(((pick(byType.value, '紧急') / total.value) * 100).toFixed(1)) : 0,
    unit: '%',
    tone: 'purple',
  },
]);

const levelOption = computed<ECOption>(() => pieOption(byType.value));
const sourceOption = computed<ECOption>(() => pieOption(bySource.value));
const statusOption = computed<ECOption>(() => pieOption(byStatus.value));

/** TOP 排行：按当前分析维度取对应分组 */
const currentSeries = computed<ChartSeriesData[]>(() => {
  const map: Record<string, ChartSeriesData[]> = {
    level: byType.value,
    source: bySource.value,
    status: byStatus.value,
  };
  return map[statsDimension.value] ?? byType.value;
});

const rankOption = computed<ECOption>(() =>
  barOption(currentSeries.value.slice().sort((a, b) => b.value - a.value)),
);

/** 合并视图：三组分类横向并列，便于一张图看全 */
const mergedOption = computed<ECOption>(() =>
  barOption(
    [
      ...byType.value.map((d) => ({ name: `等级·${d.name}`, value: d.value })),
      ...bySource.value.map((d) => ({ name: `来源·${d.name}`, value: d.value })),
      ...byStatus.value.map((d) => ({ name: `状态·${d.name}`, value: d.value })),
    ].sort((a, b) => b.value - a.value),
  ),
);

const loadStats = async (): Promise<void> => {
  try {
    const res = await vendorApi.getAlarmStats({
      granularity: granularity.value,
      dimension: statsDimension.value,
    });
    byType.value = res.byType ?? [];
    bySource.value = res.bySource ?? [];
    byStatus.value = res.byStatus ?? [];
  } catch {
    byType.value = [];
    bySource.value = [];
    byStatus.value = [];
  }
};

watch([granularity, statsDimension], () => {
  void loadStats();
});

onMounted(loadStats);
</script>

<style scoped lang="scss">
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: var(--layout-card-gap);
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);
}

.filter-bar__tip {
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
</style>
