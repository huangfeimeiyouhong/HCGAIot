<!--
  C-04 告警中心 —— 客户视角告警列表
  经 customerApi.getAlarmList 取数；客户可「确认告警」（UNCONFIRMED → CONFIRMED）
-->
<template>
  <PageContainer
    title="告警中心"
    desc="本租户资产范围内的设备告警；未确认告警需先确认再处理"
  >
    <DemoTipBar />

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
          label="等级"
          :options="levelOptions"
          placeholder="全部等级"
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
        @row-click="(row: any) => router.push(`/customer/alarms/${row.id}`)"
      >
        <template #empty>
          <EmptyState text="无匹配告警" />
        </template>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerAlarms">
import { h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { ALARM_TYPE_OPTIONS } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';
import { customerApi } from '@/api/customer';

import type { AlarmLevel, AlarmStatus } from '@/types';

const router = useRouter();

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
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    customerApi.getAlarmList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      level: filters.level,
      status: filters.status,
    }),
);

const submittingId = ref('');

const columns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 150 },
  { prop: 'type', label: '类型', width: 120 },
  {
    prop: 'level',
    label: '等级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.level as string }),
  },
  {
    prop: 'deviceSn',
    label: '设备 SN',
    width: 170,
    showOverflowTooltip: true,
  },
  {
    prop: 'actualValue',
    label: '实测值',
    width: 120,
    align: 'right',
    render: (row) => `${row.actualValue ?? '-'} ${row.unit ?? ''}`,
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
  {
    label: '操作',
    width: 160,
    fixed: 'right',
    render: (row) => {
      const id = row.id as string;
      const canConfirm = row.status === 'UNCONFIRMED';
      return h('div', { style: { display: 'flex', gap: '8px' } }, [
        h(
          'el-button',
          {
            link: true,
            type: 'primary',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void router.push(`/customer/alarms/${id}`);
            },
          },
          () => '详情',
        ),
        h(
          'el-button',
          {
            link: true,
            type: 'success',
            disabled: !canConfirm || submittingId.value === id,
            onClick: async (e: MouseEvent) => {
              e.stopPropagation();
              await onConfirm(id);
            },
          },
          () => '确认告警',
        ),
      ]);
    },
  },
];

const onConfirm = async (id: string): Promise<void> => {
  submittingId.value = id;
  try {
    await customerApi.confirmAlarm(id);
    ElMessage.success('告警已确认');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '确认失败');
  } finally {
    submittingId.value = '';
  }
};

const onClear = (): void => {
  void resetFilters();
};

// 首次进入必须主动加载：useTable 的 watch 只在筛选/分页「变化」时触发，初始不加载
onMounted(loadData);

void ALARM_TYPE_OPTIONS;
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 220px;
}
</style>
