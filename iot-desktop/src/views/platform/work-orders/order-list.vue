<!--
  P-10 工单管理 —— 只读，仅「标记争议」「导出」（PRD Q6 平台不代替厂家/客户执行动作）
-->
<template>
  <PageContainer
    title="工单管理"
    desc="平台方视角的全局工单，只读；平台不代替厂家与客户执行状态流转"
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
          placeholder="工单编号 / 设备 SN"
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
      <template #actions>
        <el-tooltip content="平台方为只读视角，不提供「接单」「反馈」等厂家动作">
          <el-tag type="info" effect="plain">只读</el-tag>
        </el-tooltip>
        <el-button plain @click="onExport">导出</el-button>
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

    <ConfirmDialog
      v-model="disputeVisible"
      title="确认标记争议"
      message="标记争议后该工单进入平台仲裁流程，责任方需举证。确认标记？"
      require-reason
      reason-label="争议原因"
      @confirm="onMarkDispute"
    />
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformWorkOrders">
import { h, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { ESCALATION_TEXT } from '@/constants/sla';
import { PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { formatCountdown, formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { platformApi } from '@/api';

import type { Priority, WorkOrderStatus } from '@/types';

const statusOptions = [
  { label: '待接单', value: 'PENDING_ACCEPT' },
  { label: '处理中', value: 'IN_PROGRESS' },
  { label: '待验收', value: 'PENDING_CONFIRM' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已关闭', value: 'CLOSED' },
];
const priorityOptions = [
  { label: '紧急', value: 'URGENT' },
  { label: '高', value: 'HIGH' },
  { label: '中', value: 'NORMAL' },
  { label: '低', value: 'LOW' },
];

const filters = reactive({
  keyword: '',
  status: undefined as WorkOrderStatus | undefined,
  priority: undefined as Priority | undefined,
  slaTimeout: undefined as boolean | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getWorkOrderList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      status: filters.status,
      priority: filters.priority,
      slaTimeout: filters.slaTimeout,
    }),
);

const disputeVisible = ref(false);
const pendingCode = ref('');

const columns: DataTableColumn[] = [
  { prop: 'code', label: '工单编号', width: 140 },
  { prop: 'deviceSn', label: '设备 SN', width: 180 },
  {
    prop: 'problemType',
    label: '问题类型',
    width: 110,
    render: (row) => PROBLEM_TYPE_LABEL[row.problemType as string] ?? row.problemType,
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
    prop: 'escalationLevel',
    label: 'SLA 升级',
    width: 90,
    render: (row) => {
      const level = row.escalationLevel as number;
      return level > 0 ? h(StatusBadge, { label: `${level} 级`, tone: level >= 2 ? 'reject' : 'notice' }) : '—';
    },
  },
  {
    prop: 'deadlineAt',
    label: 'SLA 倒计时',
    width: 170,
    render: (row) => {
      const cd = formatCountdown(row.deadlineAt as string);
      const level = (row.escalationLevel as number) ?? 0;
      if (level === 0) return cd.text;
      return h(
        'el-tooltip',
        { content: ESCALATION_TEXT[level] ?? '' },
        () => h('span', { style: { color: cd.isTimeout ? 'var(--color-danger)' : 'var(--color-warning)' } }, cd.text),
      );
    },
  },
  {
    prop: 'rejectCount',
    label: '驳回次数',
    width: 100,
    align: 'right',
    type: 'number',
  },
  {
    prop: 'disputeFlag',
    label: '争议',
    width: 90,
    render: (row) => (row.disputeFlag ? h(StatusBadge, { status: 'REJECTED', label: '争议中', tone: 'reject' }) : '—'),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 140,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    label: '操作',
    width: 110,
    fixed: 'right',
    render: (row) =>
      h(
        'el-button',
        {
          link: true,
          type: 'warning',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            pendingCode.value = row.code as string;
            disputeVisible.value = true;
          },
        },
        () => '标记争议',
      ),
  },
];

const onMarkDispute = async (reason: string): Promise<void> => {
  try {
    await platformApi.markDispute(pendingCode.value, reason);
    ElMessage.success('已标记争议，可前往争议仲裁页处理');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '标记失败');
  }
};

const onClear = (): void => {
  void resetFilters();
};

const onExport = (): void => {
  ElMessage.info('演示环境不生成真实文件，正式环境将导出为 Excel');
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 200px;
}

.sla-select {
  width: 160px;
}
</style>