<!--
  P-09 告警中心 —— 实时滚动 + 历史表
-->
<template>
  <PageContainer
    title="告警中心"
    desc="平台方全局告警监控，支持实时滚动与历史检索"
  >
    <DemoTipBar />

    <section class="card realtime-card">
      <div class="realtime-card__header">
        <div class="realtime-card__title">
          <span class="realtime-dot" />
          实时告警流
          <span class="realtime-card__hint">鼠标悬浮可暂停滚动</span>
        </div>
        <el-button
          text
          type="primary"
          @click="loadRealtime"
        >
          刷新
        </el-button>
      </div>
      <RealtimeAlarmStream
        :alarms="realtime"
        @select="openDetail"
      />
    </section>

    <FilterBar
      :has-filter="hasFilter"
      @clear="onClear"
    >
      <template #fields>
        <el-input
          v-model="filters.keyword"
          class="filter-input"
          placeholder="告警编号 / 设备 SN / 类型"
          clearable
        />
        <Select
          v-model="filters.level"
          label="告警等级"
          :options="levelOptions"
          placeholder="全部等级"
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
        <DatePicker
          v-model="filters.dateRange"
          label="触发时间"
          type="daterange"
        />
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
        @row-click="onRowClick"
      >
        <template #empty>
          <EmptyState text="无匹配结果" @clear="onClear" />
        </template>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </section>

    <DetailDrawer
      v-model="detailVisible"
      :title="`告警详情 · ${currentAlarm?.id ?? ''}`"
      size="720"
    >
      <template #extra>
        <StatusBadge
          v-if="currentAlarm"
          :status="currentAlarm.status"
        />
      </template>
      <AlarmDetailDrawer
        v-if="currentAlarm"
        :alarm="currentAlarm"
        @transition="onTransition"
      />
    </DetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformAlarms">
import { h, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import AlarmDetailDrawer from './components/AlarmDetailDrawer.vue';
import RealtimeAlarmStream from './components/RealtimeAlarmStream.vue';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DetailDrawer from '@/components/data/DetailDrawer.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';
import { usePolling } from '@/hooks/use-polling';

import { platformApi } from '@/api';

import type { Alarm, AlarmLevel, AlarmStatus } from '@/types';

const levelOptions = [
  { label: '紧急', value: 'URGENT' },
  { label: '重要', value: 'IMPORTANT' },
  { label: '一般', value: 'NORMAL' },
];
const statusOptions = [
  { label: '未确认', value: 'UNCONFIRMED' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已恢复', value: 'RECOVERED' },
];

const filters = reactive({
  keyword: '',
  level: undefined as AlarmLevel | undefined,
  status: undefined as AlarmStatus | undefined,
  dateRange: [] as string[],
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getAlarmList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      level: filters.level,
      status: filters.status,
      dateRange: (filters.dateRange.length === 2 ? filters.dateRange : undefined) as [string, string] | undefined,
    }),
);

const realtime = ref<Alarm[]>([]);
const detailVisible = ref(false);
const currentAlarm = ref<Alarm | null>(null);

/** 拉实时告警 */
const loadRealtime = async (): Promise<void> => {
  realtime.value = await platformApi.getRealtimeAlarms(12);
};

// 每 60s 静默刷新（keep-alive 感知，离开页面自动停表）
usePolling(loadRealtime, 60_000);

const columns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 140 },
  { prop: 'deviceSn', label: '设备 SN', width: 180 },
  { prop: 'type', label: '告警类型', width: 110 },
  {
    prop: 'level',
    label: '等级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.level as string }),
  },
  {
    prop: 'actualValue',
    label: '实测 / 阈值',
    width: 130,
    align: 'right',
    render: (row) => `${row.actualValue ?? '-'} / ${row.threshold ?? '-'} ${row.unit ?? ''}`,
  },
  { prop: 'customerId', label: '客户', width: 110 },
  { prop: 'vendorId', label: '厂家', width: 110 },
  {
    prop: 'duration',
    label: '持续时长',
    width: 110,
    align: 'right',
    render: (row) => `${Math.round((row.duration as number) / 60)} 分钟`,
  },
  {
    prop: 'triggerTime',
    label: '触发时间',
    width: 140,
    render: (row) => formatDateTime(row.triggerTime as string),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'orderId',
    label: '关联工单',
    width: 140,
    render: (row) => (row.orderId ? (row.orderId as string) : '—'),
  },
];

const onRowClick = (row: Record<string, unknown>): void => {
  currentAlarm.value = row as unknown as Alarm;
  detailVisible.value = true;
};

const openDetail = (alarm: Alarm): void => {
  currentAlarm.value = alarm;
  detailVisible.value = true;
};

const onTransition = async (action: 'confirm' | 'process' | 'recover'): Promise<void> => {
  if (!currentAlarm.value) return;
  try {
    const updated = await platformApi.transitionAlarm(currentAlarm.value.id, action);
    currentAlarm.value = updated;
    ElMessage.success('告警状态已更新');
    await Promise.all([loadData(), loadRealtime()]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '状态流转失败');
  }
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(async () => {
  await Promise.all([loadData(), loadRealtime()]);
});
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.realtime-card {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-title);
    font-size: 15px;
    font-weight: 600;
  }

  &__hint {
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 400;
  }
}

.realtime-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-danger);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.filter-input {
  width: 200px;
}
</style>