<!--
  P-02 入驻申请列表
-->
<template>
  <PageContainer
    title="入驻申请"
    desc="厂家入驻申请的全量列表，支持按状态与厂家类型筛选"
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
          placeholder="申请编号 / 厂家名称"
          clearable
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
        <Select
          v-model="filters.vendorType"
          label="厂家类型"
          :options="vendorTypeOptions"
          placeholder="全部类型"
        />
      </template>
      <template #actions>
        <el-button
          type="primary"
          plain
          @click="onExport"
        >
          导出
        </el-button>
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
          <EmptyState
            text="无匹配结果"
            desc="试试调整筛选条件或清空关键字"
            @clear="onClear"
          />
        </template>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        @change="loadData"
      />
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformApplications">
import { h, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import Pagination from '@/components/data/Pagination.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Select from '@/components/control/Select.vue';

import { ONBOARDING_STATUS_OPTIONS, VENDOR_TYPE_OPTIONS } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { platformApi } from '@/api';

import type { OnboardingStatus, VendorType } from '@/types';

const router = useRouter();

const statusOptions = ONBOARDING_STATUS_OPTIONS;
const vendorTypeOptions = VENDOR_TYPE_OPTIONS;

const filters = reactive({
  keyword: '',
  status: undefined as OnboardingStatus | undefined,
  vendorType: undefined as VendorType | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getApplicationList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      status: filters.status,
      vendorType: filters.vendorType,
    }),
);

/** 列配置 */
const columns: DataTableColumn[] = [
  { prop: 'id', label: '申请编号', width: 150 },
  { prop: 'vendorName', label: '厂家名称', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'vendorType',
    label: '厂家类型',
    width: 100,
    render: (row) => (row.vendorType === 'COOKWARE' ? '厨具厂家' : '物联网厂家'),
  },
  { prop: 'legalEntity', label: '主体名称', minWidth: 180, showOverflowTooltip: true },
  { prop: 'engineerCount', label: '工程师数', width: 90, type: 'number', align: 'right' },
  { prop: 'serviceRadius', label: '服务半径', width: 100, align: 'right' },
  {
    prop: 'submitTime',
    label: '提交时间',
    width: 140,
    render: (row) => formatDateTime(row.submitTime),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
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
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            void router.push(`/platform/review/applications/${row.id}`);
          },
        },
        () => '去审核',
      ),
  },
];

/** 行点击进详情 */
const onRowClick = (row: Record<string, unknown>): void => {
  void router.push(`/platform/review/applications/${row.id}`);
};

/** 清空筛选 */
const onClear = (): void => {
  void resetFilters();
};

/** 导出（演示环境只 Toast，见假设 A-6） */
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
  width: 220px;
}
</style>