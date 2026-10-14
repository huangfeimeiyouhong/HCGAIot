<!--
  P-01 平台总览 —— 6 KPI + 4 图 + 待办列表
-->
<template>
  <PageContainer
    title="平台总览"
    desc="全平台设备、厂家、客户与告警工单的实时汇总"
  >
    <DemoTipBar />

    <section class="kpi-grid">
      <StatCard
        v-for="kpi in kpis"
        :key="kpi.key"
        :data="kpi"
      />
    </section>

    <section class="chart-grid">
      <ChartCard title="告警趋势" sub-title="近 7 天">
        <BaseChart :option="alarmTrendOption" />
      </ChartCard>

      <ChartCard title="告警等级分布">
        <BaseChart :option="alarmLevelOption" />
      </ChartCard>

      <ChartCard title="设备品类分布">
        <BaseChart :option="categoryOption" />
      </ChartCard>

      <ChartCard
        title="厂家 SLA 达成率排名"
        :sub-title="quarter"
      >
        <template #extra>
          <el-select
            v-model="quarter"
            size="small"
            class="quarter-select"
          >
            <el-option
              v-for="q in quarters"
              :key="q"
              :label="q"
              :value="q"
            />
          </el-select>
        </template>
        <BaseChart :option="vendorRankOption" />
      </ChartCard>
    </section>

    <section class="card todo-card">
      <div class="todo-card__header">
        <h3 class="todo-card__title">
          待办事项
        </h3>
        <span class="todo-card__desc">点击卡片跳转到对应模块</span>
      </div>
      <div class="todo-card__list">
        <button
          v-for="todo in todoList"
          :key="todo.id"
          type="button"
          class="todo-item"
          @click="router.push(todo.to)"
        >
          <span
            class="todo-item__count"
            :class="`is-${todo.tone ?? 'primary'}`"
          >{{ todo.count }}</span>
          <span class="todo-item__label">{{ todo.label }}</span>
          <el-icon class="todo-item__arrow"><ArrowRight /></el-icon>
        </button>
      </div>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformDashboard">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import BaseChart from '@/components/data/BaseChart.vue';
import ChartCard from '@/components/data/ChartCard.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatCard from '@/components/data/StatCard.vue';

import { barOption, lineOption, pieOption, rankBarOption } from '@/constants/chart';
import { lastDays } from '@/utils/date';

import { platformApi } from '@/api';

import type { ECOption } from '@/hooks/use-echarts';
import type { StatCardData, TodoItem } from '@/types';

const router = useRouter();

const kpis = ref<StatCardData[]>([]);
const todoList = ref<TodoItem[]>([]);
const alarmTrend = ref<Array<{ date: string; count: number }>>([]);
const alarmLevel = ref<Array<{ name: string; value: number }>>([]);
const category = ref<Array<{ name: string; value: number }>>([]);
const vendorRank = ref<Array<{ vendorId: string; vendorName: string; rate: number }>>([]);
const quarters = ref<string[]>([]);
const quarter = ref('2026Q3');

/** 告警趋势 option */
const alarmTrendOption = computed<ECOption>(() =>
  lineOption(
    alarmTrend.value.map((d) => d.date.slice(5)),
    [{ name: '告警数', value: alarmTrend.value.map((d) => d.count) }],
  ),
);

/** 告警等级 option */
const alarmLevelOption = computed<ECOption>(() => pieOption(alarmLevel.value));

/** 品类分布 option */
const categoryOption = computed<ECOption>(() => barOption(category.value));

/** 厂家排名 option */
const vendorRankOption = computed<ECOption>(() =>
  rankBarOption(vendorRank.value.map((v) => ({ name: v.vendorName, value: v.rate }))),
);

/** 拉总览 */
const loadOverview = async (): Promise<void> => {
  const res = await platformApi.getOverview();
  kpis.value = res.kpis;
  todoList.value = res.todoList;
};

/** 拉图表 */
const loadCharts = async (): Promise<void> => {
  const [trend, level, cat, rank] = await Promise.all([
    platformApi.getAlarmTrend(7),
    platformApi.getAlarmLevelDist(),
    platformApi.getCategoryDist(),
    platformApi.getVendorSlaRank(quarter.value),
  ]);
  alarmTrend.value = trend;
  alarmLevel.value = level;
  category.value = cat;
  vendorRank.value = rank;
};

// 季度切换 → 重拉排名
watch(quarter, () => {
  void platformApi.getVendorSlaRank(quarter.value).then((rank) => {
    vendorRank.value = rank;
  });
});

onMounted(async () => {
  await loadOverview();
  await loadCharts();
  quarters.value = await platformApi.getQuarters();
  if (quarters.value.length) quarter.value = quarters.value[quarters.value.length - 1]!;
  // 兜底：若后端无季度数据，用最近 7 天占位，避免 X 轴空白
  if (!alarmTrend.value.length) {
    alarmTrend.value = lastDays(7).map((date) => ({ date, count: 0 }));
  }
});
</script>

<style scoped lang="scss">
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}

.quarter-select {
  width: 110px;
}

.todo-card {
  &__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  &__title {
    color: var(--color-text-title);
    font-size: 15px;
    font-weight: 600;
  }

  &__desc {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 12px;
  }
}

.todo-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--layout-card-radius);
  background: var(--color-bg-container);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  &__count {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.2;

    &.is-primary  { color: var(--color-primary-text); }
    &.is-success  { color: var(--color-success); }
    &.is-warning  { color: var(--color-warning); }
    &.is-danger   { color: var(--color-danger); }
    &.is-info     { color: var(--color-info); }
    &.is-purple   { color: var(--color-purple); }
  }

  &__label {
    color: var(--color-text-body);
    font-size: 13px;
  }

  &__arrow {
    align-self: flex-end;
    color: var(--color-text-disabled);
    font-size: 13px;
  }
}

/* 响应式（PRD 3.3） */
@media (max-width: 1600px) {
  .kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .todo-card__list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1280px) {
  .chart-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .todo-card__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>