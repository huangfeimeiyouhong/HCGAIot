<!--
  C-02 我的设备 —— 客户视角聚合列表（无固件/成本/部件列）
  经 customerApi.getDeviceList 取数；状态机无关，纯列表 + 详情/报修入口
-->
<template>
  <PageContainer
    title="我的设备"
    desc="本租户产权绑定范围内的设备台账（不含固件版本 / 成本 / 部件明细）"
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
          placeholder="SN / 名称 / 型号 / 位置"
          clearable
        />
        <Select
          v-model="filters.category"
          label="品类"
          :options="categoryOptions"
          placeholder="全部品类"
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
      </template>
      <template #actions>
        <el-button
          type="primary"
          @click="router.push('/customer/work-orders/create')"
        >
          发起报修
        </el-button>
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="sn"
        @row-click="(row: any) => router.push(`/customer/devices/${row.sn}`)"
      >
        <template #empty>
          <EmptyState text="无匹配设备" />
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

<script setup lang="ts" name="CustomerDevices">
import { h, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { DEVICE_CATEGORY_OPTIONS } from '@/constants/dict';
import { formatDateOnly, formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';
import { customerApi } from '@/api/customer';

import type { DeviceCategory, DeviceStatus } from '@/types';

const router = useRouter();

const categoryOptions = DEVICE_CATEGORY_OPTIONS;
const statusOptions = [
  { label: '在线', value: 'ONLINE' },
  { label: '离线', value: 'OFFLINE' },
  { label: '异常', value: 'ABNORMAL' },
  { label: '维修中', value: 'REPAIRING' },
  { label: '未启用', value: 'INACTIVE' },
];

const filters = reactive({
  keyword: '',
  category: undefined as DeviceCategory | undefined,
  status: undefined as DeviceStatus | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    customerApi.getDeviceList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      category: filters.category,
      status: filters.status,
    }),
);

const columns: DataTableColumn[] = [
  { prop: 'sn', label: '设备 SN', width: 170 },
  { prop: 'name', label: '设备名称', minWidth: 170, showOverflowTooltip: true },
  { prop: 'modelName', label: '型号', width: 150, showOverflowTooltip: true },
  {
    prop: 'category',
    label: '品类',
    width: 100,
    render: (row) => DEVICE_CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ?? row.category,
  },
  {
    prop: 'vendorName',
    label: '责任厂家',
    minWidth: 150,
    showOverflowTooltip: true,
  },
  { prop: 'location', label: '安装位置', minWidth: 140, showOverflowTooltip: true },
  {
    prop: 'alarmStatus',
    label: '告警状态',
    width: 110,
    render: (row) =>
      row.alarmStatus === 'HAS_ALARM'
        ? h(StatusBadge, { label: '有告警', tone: 'reject' })
        : h(StatusBadge, { label: '正常', tone: 'success' }),
  },
  {
    prop: 'alarmCount',
    label: '累计告警',
    width: 100,
    align: 'right',
    type: 'number',
  },
  {
    prop: 'status',
    label: '运行状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'warrantyUntil',
    label: '质保期至',
    width: 110,
    render: (row) => formatDateOnly(row.warrantyUntil as string),
  },
  {
    prop: 'lastReportAt',
    label: '最近上报',
    width: 150,
    render: (row) => formatDateTime(row.lastReportAt as string),
  },
  {
    label: '操作',
    width: 170,
    fixed: 'right',
    render: (row) => {
      const sn = row.sn as string;
      return h('div', { style: { display: 'flex', gap: '8px' } }, [
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void router.push(`/customer/devices/${sn}`);
            },
          },
          () => '详情',
        ),
        h(
          ElButton,
          {
            link: true,
            type: 'warning',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void router.push(`/customer/work-orders/create?deviceSn=${sn}`);
            },
          },
          () => '报修',
        ),
      ]);
    },
  },
];

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
