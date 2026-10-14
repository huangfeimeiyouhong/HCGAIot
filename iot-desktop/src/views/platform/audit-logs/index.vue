<!--
  P-14 审计日志
-->
<template>
  <PageContainer
    title="审计日志"
    desc="账号管理、绑定变更、数据导出与工单处理的操作留痕（append-only）"
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
          placeholder="操作人 / 操作对象"
          clearable
        />
        <Select
          v-model="filters.action"
          label="操作类型"
          :options="actionOptions"
          placeholder="全部类型"
        />
        <DatePicker
          v-model="filters.dateRange"
          label="时间范围"
          type="daterange"
        />
      </template>
      <template #actions>
        <el-button plain @click="onExport">导出</el-button>
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
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

<script setup lang="ts" name="PlatformAuditLogs">
import { onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';

import { AUDIT_ACTION_LABEL, AUDIT_ACTION_OPTIONS } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { platformApi } from '@/api';

const actionOptions = AUDIT_ACTION_OPTIONS;

const filters = reactive({
  keyword: '',
  action: undefined as string | undefined,
  dateRange: [] as string[],
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getAuditLogList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      action: filters.action,
      dateRange: (filters.dateRange.length === 2 ? filters.dateRange : undefined) as [string, string] | undefined,
    }),
);

const columns: DataTableColumn[] = [
  { prop: 'id', label: '日志编号', width: 110 },
  { prop: 'operator', label: '操作人', width: 150 },
  { prop: 'tenantId', label: '所属租户', width: 110 },
  {
    prop: 'action',
    label: '操作类型',
    width: 120,
    render: (row) => AUDIT_ACTION_LABEL[row.action as string] ?? row.action,
  },
  { prop: 'target', label: '操作对象', minWidth: 200, showOverflowTooltip: true },
  { prop: 'before', label: '变更前', minWidth: 160, showOverflowTooltip: true },
  { prop: 'after', label: '变更后', minWidth: 160, showOverflowTooltip: true },
  { prop: 'ip', label: 'IP 地址', width: 130 },
  {
    prop: 'time',
    label: '操作时间',
    width: 160,
    render: (row) => formatDateTime(row.time as string),
  },
];

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
</style>