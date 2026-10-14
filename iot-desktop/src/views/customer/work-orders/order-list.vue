<!--
  C-06 报修工单列表 —— 客户视角
  经 customerApi.getWorkOrderList 取数；可撤单（PENDING_ACCEPT）/ 评价（COMPLETED）
-->
<template>
  <PageContainer
    title="报修工单"
    desc="本租户发起与关联的全部工单；处理进度由责任厂家更新"
  >
    <template #extra>
      <el-button
        type="primary"
        @click="router.push('/customer/work-orders/create')"
      >
        发起报修
      </el-button>
    </template>

    <DemoTipBar />

    <FilterBar
      :has-filter="hasFilter"
      @clear="onClear"
    >
      <template #fields>
        <el-input
          v-model="filters.keyword"
          class="filter-input"
          placeholder="工单号 / 设备 SN / 描述"
          clearable
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
        <Select
          v-model="filters.priority"
          label="优先级"
          :options="priorityOptions"
          placeholder="全部优先级"
        />
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="code"
        @row-click="(row: any) => router.push(`/customer/work-orders/${row.code}`)"
      >
        <template #empty>
          <EmptyState text="无匹配工单" />
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

<script setup lang="ts" name="CustomerWorkOrders">
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

import { PRIORITY_OPTIONS } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';
import { customerApi } from '@/api/customer';

import type { Priority, WorkOrderStatus } from '@/types';

const router = useRouter();

const statusOptions = [
  { label: '待接单', value: 'PENDING_ACCEPT' },
  { label: '处理中', value: 'IN_PROGRESS' },
  { label: '待验收', value: 'PENDING_CONFIRM' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已关闭', value: 'CLOSED' },
];
const priorityOptions = PRIORITY_OPTIONS;

const filters = reactive({
  keyword: '',
  status: undefined as WorkOrderStatus | undefined,
  priority: undefined as Priority | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    customerApi.getWorkOrderList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      status: filters.status,
      priority: filters.priority,
    }),
);

const submittingCode = ref('');

const columns: DataTableColumn[] = [
  { prop: 'code', label: '工单编号', width: 150 },
  {
    prop: 'deviceName',
    label: '设备',
    minWidth: 150,
    showOverflowTooltip: true,
  },
  {
    prop: 'vendorName',
    label: '责任厂家',
    minWidth: 140,
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
  {
    prop: 'deadlineAt',
    label: 'SLA 时限',
    width: 150,
    render: (row) => formatDateTime(row.deadlineAt as string),
  },
  {
    label: '操作',
    width: 170,
    fixed: 'right',
    render: (row) => {
      const code = row.code as string;
      const status = row.status as string;
      return h('div', { style: { display: 'flex', gap: '8px' } }, [
        h(
          'el-button',
          {
            link: true,
            type: 'primary',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void router.push(`/customer/work-orders/${code}`);
            },
          },
          () => '详情',
        ),
        h(
          'el-button',
          {
            link: true,
            type: 'danger',
            disabled: status !== 'PENDING_ACCEPT' || submittingCode.value === code,
            onClick: async (e: MouseEvent) => {
              e.stopPropagation();
              await onCancel(code);
            },
          },
          () => '撤单',
        ),
        h(
          'el-button',
          {
            link: true,
            type: 'warning',
            disabled: status !== 'COMPLETED',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void router.push(`/customer/work-orders/${code}?rate=1`);
            },
          },
          () => '评价',
        ),
      ]);
    },
  },
];

const onCancel = async (code: string): Promise<void> => {
  submittingCode.value = code;
  try {
    await customerApi.cancelWorkOrder(code, '客户主动撤单');
    ElMessage.success('工单已撤单关闭');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '撤单失败');
  } finally {
    submittingCode.value = '';
  }
};

const onClear = (): void => {
  void resetFilters();
};

// 首次进入必须主动加载：useTable 的 watch 只在筛选/分页「变化」时触发，初始不加载
onMounted(loadData);
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 220px;
}
</style>
