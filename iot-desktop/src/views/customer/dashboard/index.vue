<!--
  C-01 客户工作台 —— 数据驱动实现（替代占位页）
  经 customerApi 取数：KPI 卡 + 待办卡片 + 快捷入口 + 最近告警/工单 + 图表
-->
<template>
  <PageContainer
    :title="`客户工作台`"
    :desc="`欢迎回来，${auth.userInfo?.displayName ?? '客户'} · 您资产范围内的设备与工单概览`"
  >
    <DemoTipBar />

    <!-- KPI 卡 -->
    <section class="kpi-grid">
      <StatCard
        v-for="kpi in dashboard.kpis"
        :key="kpi.key"
        :data="kpi"
      />
    </section>

    <!-- 待办卡片 + 快捷入口 -->
    <section class="todo-grid">
      <div class="card todo-banner">
        <h3 class="section-title">
          待办事项
        </h3>
        <div class="todo-cards">
          <button
            type="button"
            class="todo-card"
            :class="`is-${todoTone('bindings')}`"
            @click="router.push('/customer/bindings')"
          >
            <span class="todo-card__count">{{ dashboard.pendingBindings }}</span>
            <span class="todo-card__label">待确认绑定</span>
            <el-icon class="todo-card__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            type="button"
            class="todo-card"
            :class="`is-${todoTone('orders')}`"
            @click="router.push('/customer/work-orders')"
          >
            <span class="todo-card__count">{{ pendingConfirmOrders }}</span>
            <span class="todo-card__label">待验收工单</span>
            <el-icon class="todo-card__arrow"><ArrowRight /></el-icon>
          </button>
          <button
            type="button"
            class="todo-card"
            :class="`is-${todoTone('alarms')}`"
            @click="router.push('/customer/alarms')"
          >
            <span class="todo-card__count">{{ unconfirmedAlarms }}</span>
            <span class="todo-card__label">未确认告警</span>
            <el-icon class="todo-card__arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </div>

      <div class="card quick-banner">
        <h3 class="section-title">
          快捷入口
        </h3>
        <div class="quick-actions">
          <el-button
            type="primary"
            @click="router.push('/customer/work-orders/create')"
          >
            <el-icon><Plus /></el-icon> 一键报修
          </el-button>
          <el-button @click="router.push('/customer/devices')">
            <el-icon><Cpu /></el-icon> 我的设备
          </el-button>
          <el-button @click="router.push('/customer/alarms')">
            <el-icon><Bell /></el-icon> 告警中心
          </el-button>
          <el-button @click="router.push('/customer/bindings')">
            <el-icon><Connection /></el-icon> 绑定确认
          </el-button>
        </div>
      </div>
    </section>

    <!-- 图表 -->
    <section class="chart-grid">
      <ChartCard title="设备品类分布">
        <BaseChart :option="categoryOption" />
      </ChartCard>
      <ChartCard title="工单状态分布">
        <BaseChart :option="orderOption" />
      </ChartCard>
    </section>

    <!-- 最近列表 -->
    <section class="list-grid">
      <div class="card">
        <div class="list-head">
          <h3 class="section-title">
            最近告警
          </h3>
          <el-button
            text
            type="primary"
            @click="router.push('/customer/alarms')"
          >
            全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <DataTable
          :data="recentAlarms"
          :columns="alarmColumns"
          :loading="loading"
          row-key="id"
          :max-height="320"
          @row-click="(row: any) => router.push(`/customer/alarms/${row.id}`)"
        />
      </div>

      <div class="card">
        <div class="list-head">
          <h3 class="section-title">
            最近工单
          </h3>
          <el-button
            text
            type="primary"
            @click="router.push('/customer/work-orders')"
          >
            全部 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <DataTable
          :data="recentOrders"
          :columns="orderColumns"
          :loading="loading"
          row-key="code"
          :max-height="320"
          @row-click="(row: any) => router.push(`/customer/work-orders/${row.code}`)"
        />
      </div>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerDashboard">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseChart from '@/components/data/BaseChart.vue';
import ChartCard from '@/components/data/ChartCard.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatCard from '@/components/data/StatCard.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { barOption, pieOption } from '@/constants/chart';
import { ALARM_TYPE_OPTIONS, DEVICE_CATEGORY_LABEL, PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { PRIORITY_LABEL } from '@/constants/sla';
import { formatDateTime } from '@/utils/date';
import { useAuthStore } from '@/store/auth';
import { customerApi } from '@/api/customer';

import type { Alarm, ChartSeriesData, CustomerOrderView, StatCardData } from '@/types';

const router = useRouter();
const auth = useAuthStore();

/** 工作台数据（取数后填充） */
const dashboard = reactive({
  kpis: [] as StatCardData[],
  categoryDist: [] as ChartSeriesData[],
  orderDist: [] as ChartSeriesData[],
  pendingBindings: 0,
  todayAlarms: { total: 0, unconfirmed: 0, urgent: 0 },
  vendorScore: { avgScore: 0, ratedCount: 0, vendors: 0 },
});

const recentAlarms = ref<Alarm[]>([]);
const recentOrders = ref<CustomerOrderView[]>([]);
const loading = ref(false);

/** 待验收工单数（工单状态分布里「待验收」一项） */
const pendingConfirmOrders = computed(
  () => dashboard.orderDist.find((o) => o.name === '待验收')?.value ?? 0,
);
/** 未确认告警数（KPI 里 key=alarms 一项） */
const unconfirmedAlarms = computed(
  () => Number(dashboard.kpis.find((k) => k.key === 'alarms')?.value ?? 0),
);

/** 待办卡片语义色 */
const todoTone = (key: 'bindings' | 'orders' | 'alarms'): string => {
  const map = { bindings: 'info', orders: 'purple', alarms: 'danger' } as const;
  return map[key];
};

const categoryOption = computed(() => pieOption(dashboard.categoryDist));
const orderOption = computed(() => barOption(dashboard.orderDist));

const alarmColumns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 140 },
  { prop: 'type', label: '类型', width: 110 },
  {
    prop: 'level',
    label: '等级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.level as string }),
  },
  {
    prop: 'deviceSn',
    label: '设备',
    minWidth: 150,
    showOverflowTooltip: true,
  },
  {
    prop: 'triggerTime',
    label: '触发时间',
    width: 150,
    render: (row) => formatDateTime(row.triggerTime as string),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
];

const orderColumns: DataTableColumn[] = [
  { prop: 'code', label: '工单编号', width: 150 },
  {
    prop: 'deviceName',
    label: '设备',
    minWidth: 150,
    showOverflowTooltip: true,
  },
  {
    prop: 'priority',
    label: '优先级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.priority as string }),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 150,
    render: (row) => formatDateTime(row.createdAt as string),
  },
];

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const res = await customerApi.getDashboard();
    dashboard.kpis = res.kpis;
    dashboard.categoryDist = res.categoryDist;
    dashboard.orderDist = res.orderDist;
    dashboard.pendingBindings = res.pendingBindings;
    dashboard.todayAlarms = res.todayAlarms;
    dashboard.vendorScore = res.vendorScore;
    const [alarms, orders] = await Promise.all([
      customerApi.getAlarmList({ page: 1, pageSize: 5 }),
      customerApi.getWorkOrderList({ page: 1, pageSize: 5 }),
    ]);
    recentAlarms.value = alarms.list;
    recentOrders.value = orders.list;
  } catch (error) {
    window.console.error('[dashboard] 取数失败：', error);
  } finally {
    loading.value = false;
  }
};

void ALARM_TYPE_OPTIONS;
void DEVICE_CATEGORY_LABEL;
void PROBLEM_TYPE_LABEL;
void PRIORITY_LABEL;

onMounted(load);
</script>

<style scoped lang="scss">
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}

.section-title {
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

.todo-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.todo-cards {
  display: flex;
  gap: 12px;
  margin-top: 14px;
}

.todo-card {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 16px 18px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-container);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 14px rgba(11, 124, 174, 0.12);
  }

  &__count {
    font-size: 26px;
    font-weight: 600;
    line-height: 1;
  }

  &__label {
    flex: 1;
    color: var(--color-text-body);
    font-size: 13px;
    text-align: left;
  }

  &__arrow {
    color: var(--color-text-disabled);
    font-size: 14px;
  }

  &.is-info .todo-card__count { color: var(--color-info); }
  &.is-purple .todo-card__count { color: var(--color-purple); }
  &.is-danger .todo-card__count { color: var(--color-danger); }
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.list-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--layout-card-gap);
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

@media (max-width: 1400px) {
  .kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .todo-grid,
  .chart-grid,
  .list-grid { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
