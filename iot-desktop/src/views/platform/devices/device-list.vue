<!--
  P-06 设备台账 —— 全局只读，行点击开详情抽屉（5 Tab）
  ⚠️ 只读：无新增 / 编辑 / 删除按钮（PRD 明确）
-->
<template>
  <PageContainer
    title="设备台账"
    desc="平台方视角的全量设备档案，只读不可编辑"
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
          label="运行状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
        <Select
          v-model="filters.modelCode"
          label="型号"
          :options="modelOptions"
          placeholder="全部型号"
          filterable
        />
      </template>
      <template #actions>
        <el-tooltip content="平台方为只读视角，无新增 / 编辑 / 删除权限">
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
        row-key="sn"
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

    <!-- P-07 设备详情抽屉（不是独立路由） -->
    <DetailDrawer
      v-model="drawerVisible"
      :title="detail?.device.name ?? '设备详情'"
      :loading="detailLoading"
      size="820"
    >
      <template #extra>
        <StatusBadge
          v-if="detail"
          :status="detail.device.status"
        />
      </template>
      <DeviceDetailTabs
        v-if="detail"
        :detail="detail"
      />
    </DetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformDevices">
import { h, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

import DeviceDetailTabs from './components/DeviceDetailTabs.vue';

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

import { DEVICE_CATEGORY_OPTIONS } from '@/constants/dict';
import { vendorApi } from '@/api/vendor';
import { platformApi } from '@/api';
import { formatDateOnly, formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import type { DeviceCategory, DeviceStatus } from '@/types';
import type { DeviceDetailBundle } from '@/types/vo';

const categoryOptions = DEVICE_CATEGORY_OPTIONS;
const statusOptions = [
  { label: '在线', value: 'ONLINE' },
  { label: '离线', value: 'OFFLINE' },
  { label: '异常', value: 'ABNORMAL' },
  { label: '未启用', value: 'INACTIVE' },
  { label: '维修中', value: 'REPAIRING' },
];

const filters = reactive({
  keyword: '',
  category: undefined as DeviceCategory | undefined,
  status: undefined as DeviceStatus | undefined,
  modelCode: undefined as string | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getDeviceList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      category: filters.category,
      status: filters.status,
      modelCode: filters.modelCode,
    }),
);

/** 型号下拉 */
const modelOptions = ref<Array<{ label: string; value: string }>>([]);

const drawerVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<DeviceDetailBundle | null>(null);

const columns: DataTableColumn[] = [
  { prop: 'sn', label: '设备 SN', width: 180 },
  { prop: 'name', label: '设备名称', minWidth: 180, showOverflowTooltip: true },
  { prop: 'modelCode', label: '型号', width: 130 },
  {
    prop: 'category',
    label: '品类',
    width: 100,
    render: (row) => DEVICE_CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ?? row.category,
  },
  { prop: 'location', label: '位置', minWidth: 140, showOverflowTooltip: true },
  {
    prop: 'ownerCustomerId',
    label: '产权客户',
    width: 150,
    render: (row) => (row.ownerCustomerId ? (row.ownerCustomerId as string) : '未绑定'),
  },
  {
    prop: 'manufactureDate',
    label: '出厂日期',
    width: 110,
    render: (row) => formatDateOnly(row.manufactureDate as string),
  },
  {
    prop: 'warrantyUntil',
    label: '质保期至',
    width: 110,
    render: (row) => formatDateOnly(row.warrantyUntil as string),
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
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'lastReportAt',
    label: '最近上报',
    width: 140,
    render: (row) => formatDateTime(row.lastReportAt as string),
  },
  {
    label: '操作',
    width: 90,
    fixed: 'right',
    render: (row) =>
      h(
        'el-button',
        {
          link: true,
          type: 'primary',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            void onRowClick(row);
          },
        },
        () => '详情',
      ),
  },
];

/** 行点击开抽屉 */
const onRowClick = async (row: Record<string, unknown>): Promise<void> => {
  drawerVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await platformApi.getDeviceDetail(row.sn as string);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载设备详情失败');
    drawerVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
};

const onClear = (): void => {
  void resetFilters();
};

const onExport = (): void => {
  ElMessage.info('演示环境不生成真实文件，正式环境将导出为 Excel');
};

onMounted(async () => {
  await loadData();
  const models = await vendorApi.getOwnedModels();
  modelOptions.value = models.map((m) => ({ label: m.modelCode, value: m.modelCode }));
});
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 220px;
}
</style>