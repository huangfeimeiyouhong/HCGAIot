<!--
  V-10 工单处理列表 —— 状态 Tab + SLA 提示
-->
<template>
  <PageContainer
    title="工单处理"
    desc="厂家侧的工单闭环：接单 → 更新进展 → 反馈结果"
  >
    <DemoTipBar />

    <section class="card tab-card">
      <el-tabs
        v-model="activeStatus"
        @tab-change="onTabChange"
      >
        <el-tab-pane label="全部" name="" />
        <el-tab-pane
          v-for="s in statusTabs"
          :key="s.value"
          :label="`${s.label}`"
          :name="s.value"
        />
      </el-tabs>
    </section>

    <FilterBar
      :has-filter="hasFilter"
      @clear="onClear"
    >
      <template #fields>
        <el-input
          v-model="filters.keyword"
          class="filter-input"
          placeholder="工单编号 / 设备 SN"
          clearable
        />
        <Select
          v-model="filters.priority"
          label="优先级"
          :options="priorityOptions"
          placeholder="全部优先级"
        />
        <el-select
          v-model="filters.slaTimeout"
          class="sla-select"
          placeholder="SLA 状态"
          clearable
        >
          <el-option label="仅看已超时" :value="true" />
          <el-option label="仅看未超时" :value="false" />
        </el-select>
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="code"
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
  </PageContainer>
</template>

<script setup lang="ts" name="VendorWorkOrders">
import { h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { PRIORITY_OPTIONS, PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { formatCountdown, formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';

import type { Priority, WorkOrderStatus } from '@/types';

const router = useRouter();

const priorityOptions = PRIORITY_OPTIONS;
const statusTabs: Array<{ label: string; value: WorkOrderStatus }> = [
  { label: '待接单', value: 'PENDING_ACCEPT' },
  { label: '处理中', value: 'IN_PROGRESS' },
  { label: '待验收', value: 'PENDING_CONFIRM' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已关闭', value: 'CLOSED' },
];

const activeStatus = ref<string>('');

const filters = reactive({
  keyword: '',
  priority: undefined as Priority | undefined,
  slaTimeout: undefined as boolean | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    vendorApi.getWorkOrderList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      status: (activeStatus.value || undefined) as WorkOrderStatus | undefined,
      priority: filters.priority,
      slaTimeout: filters.slaTimeout,
    }),
);

const columns: DataTableColumn[] = [
  { prop: 'code', label: '工单编号', width: 140 },
  { prop: 'deviceSn', label: '设备 SN', width: 180 },
  {
    prop: 'problemType',
    label: '问题类型',
    width: 110,
    render: (row) => PROBLEM_TYPE_LABEL[row.problemType as string] ?? row.problemType,
  },
  { prop: 'customerName', label: '客户', width: 150 },
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
    prop: 'escalationLevel',
    label: 'SLA',
    width: 170,
    render: (row) => {
      const cd = formatCountdown(row.deadlineAt as string);
      const level = (row.escalationLevel as number) ?? 0;
      if (level === 0) return cd.text;
      return h(
        'el-tooltip',
        { content: `SLA 已升级至 ${level} 级` },
        () => h('span', { style: { color: cd.isTimeout ? 'var(--color-danger)' : 'var(--color-warning)' } }, cd.text),
      );
    },
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 150,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    label: '操作',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(
        'el-button',
        {
          link: true,
          type: 'primary',
          onClick: () => router.push(`/vendor/work-orders/${row.code}`),
        },
        () => '去处理',
      ),
  },
];

const onTabChange = (): void => {
  query.page = 1;
  void loadData();
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.tab-card {
  padding-bottom: 0;

  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.filter-input {
  width: 200px;
}

.sla-select {
  width: 160px;
}
</style>