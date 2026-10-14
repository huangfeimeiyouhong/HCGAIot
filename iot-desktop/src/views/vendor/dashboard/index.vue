<!--
  V-01 厂家工作台
-->
<template>
  <PageContainer
    title="厂家工作台"
    :desc="`${auth.userInfo?.tenantName ?? ''} · ${vendorTypeLabel}`"
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
      <ChartCard title="近 7 天告警趋势">
        <BaseChart :option="alarmTrendOption" />
      </ChartCard>
      <ChartCard title="工单状态分布">
        <BaseChart :option="orderOption" />
      </ChartCard>
      <ChartCard title="绑定关系概览">
        <BaseChart :option="bindingOption" />
      </ChartCard>
      <ChartCard title="待办事项">
        <div class="todo-list">
          <button
            v-for="todo in todos"
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
      </ChartCard>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="VendorDashboard">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseChart from '@/components/data/BaseChart.vue';
import ChartCard from '@/components/data/ChartCard.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatCard from '@/components/data/StatCard.vue';

import { VENDOR_TYPE_LABEL } from '@/constants/dict';
import { barOption, lineOption, pieOption } from '@/constants/chart';

import { vendorApi } from '@/api/vendor';
import { useAuthStore } from '@/store/auth';

import type { ECOption } from '@/hooks/use-echarts';
import type { ChartSeriesData, StatCardData, TodoItem } from '@/types';

const router = useRouter();
const auth = useAuthStore();

const kpis = ref<StatCardData[]>([]);
const todos = ref<TodoItem[]>([]);
const alarmTrend = ref<Array<{ date: string; count: number }>>([]);
const orderStats = ref<ChartSeriesData[]>([]);
const bindingOverview = ref<ChartSeriesData[]>([]);

const vendorTypeLabel = computed(() =>
  auth.vendorType ? VENDOR_TYPE_LABEL[auth.vendorType] : '',
);

const alarmTrendOption = computed<ECOption>(() =>
  lineOption(
    alarmTrend.value.map((d) => d.date.slice(5)),
    [{ name: '告警数', value: alarmTrend.value.map((d) => d.count) }],
  ),
);

const orderOption = computed<ECOption>(() => barOption(orderStats.value));
const bindingOption = computed<ECOption>(() => pieOption(bindingOverview.value));

onMounted(async () => {
  const res = await vendorApi.getDashboard();
  kpis.value = res.kpis;
  todos.value = res.todos;
  alarmTrend.value = res.alarmTrend;
  orderStats.value = res.orderStats;
  bindingOverview.value = res.bindingOverview;
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
}

.todo-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-bg-container);
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
  }

  &__count {
    font-size: 18px;
    font-weight: 600;

    &.is-primary  { color: var(--color-primary-text); }
    &.is-success  { color: var(--color-success); }
    &.is-warning  { color: var(--color-warning); }
    &.is-danger   { color: var(--color-danger); }
    &.is-info     { color: var(--color-info); }
    &.is-purple   { color: var(--color-purple); }
  }

  &__label {
    flex: 1;
    color: var(--color-text-body);
    font-size: 13px;
    text-align: left;
  }

  &__arrow {
    color: var(--color-text-disabled);
    font-size: 13px;
  }
}

@media (max-width: 1600px) {
  .kpi-grid {
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
</style>