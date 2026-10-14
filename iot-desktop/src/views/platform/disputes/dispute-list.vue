<!--
  P-11a 争议仲裁列表
-->
<template>
  <PageContainer
    title="争议仲裁"
    desc="SLA 超时、备件费用等争议的受理与判定"
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
          placeholder="争议编号 / 工单编号 / 类型"
          clearable
        />
        <el-select
          v-model="filters.verdict"
          class="verdict-select"
          placeholder="判定状态"
          clearable
        >
          <el-option label="待判定" value="PENDING" />
          <el-option label="已判定" value="DONE" />
        </el-select>
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
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformDisputes">
import { h, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { platformApi } from '@/api';

import type { Dispute } from '@/types';

const router = useRouter();

const filters = reactive({
  keyword: '',
  verdict: undefined as string | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  async (params) => {
    const res = await platformApi.getDisputeList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
    });
    // 判定状态筛选在 api 层无对应字段，这里做前端过滤（演示数据量小，可接受）
    if (!filters.verdict) return res;
    const list = res.list.filter((d) => (filters.verdict === 'DONE' ? Boolean(d.verdict) : !d.verdict));
    return { ...res, list, total: list.length };
  },
);

const columns: DataTableColumn[] = [
  { prop: 'id', label: '争议编号', width: 120 },
  { prop: 'orderCode', label: '关联工单', width: 140 },
  { prop: 'type', label: '争议类型', minWidth: 150, showOverflowTooltip: true },
  {
    prop: 'raisedBy',
    label: '发起方',
    width: 100,
    render: (row) => (row.raisedBy === 'CUSTOMER' ? '客户' : '厂家'),
  },
  {
    prop: 'evidence',
    label: '举证数',
    width: 100,
    align: 'right',
    type: 'number',
  },
  {
    prop: 'verdict',
    label: '判定结果',
    width: 120,
    render: (row) => {
      const d = row as Dispute;
      return d.verdict ? h(StatusBadge, { status: d.verdict }) : h(StatusBadge, { status: 'PENDING_RELEASE', label: '待判定', tone: 'notice' });
    },
  },
  {
    prop: 'verdictTime',
    label: '判定时间',
    width: 150,
    render: (row) => (row.verdictTime ? formatDateTime(row.verdictTime as string) : '—'),
  },
  {
    prop: 'createdAt',
    label: '发起时间',
    width: 150,
    render: (row) => formatDateTime(row.createdAt as string),
  },
];

const onRowClick = (row: Record<string, unknown>): void => {
  void router.push(`/platform/disputes/${row.id}`);
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 220px;
}

.verdict-select {
  width: 160px;
}
</style>