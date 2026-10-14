<!--
  P-08 绑定关系总览
-->
<template>
  <PageContainer
    title="绑定关系"
    desc="设备与客户 / 厂家之间的产权与装配绑定总览"
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
          placeholder="绑定编号 / 设备 SN"
          clearable
        />
        <Select
          v-model="filters.type"
          label="绑定类型"
          :options="bindingTypeOptions"
          placeholder="全部类型"
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="bindingStatusOptions"
          placeholder="全部状态"
        />
      </template>
      <template #actions>
        <el-tag type="info" effect="plain">只读</el-tag>
        <el-button plain @click="onExport">导出</el-button>
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
      v-model="historyVisible"
      :title="`变更历史 · ${historyBindingId}`"
      size="640"
    >
      <el-timeline v-if="history.length">
        <el-timeline-item
          v-for="item in history"
          :key="item.id"
          :timestamp="formatDateTime(item.time)"
          placement="top"
        >
          <div class="tl-row">
            <strong>v{{ item.version }} · {{ item.action }}</strong>
          </div>
          <div class="tl-meta">
            操作人：{{ item.operator }}
          </div>
          <div class="tl-remark">
            {{ item.reason }}
          </div>
        </el-timeline-item>
      </el-timeline>
      <EmptyState
        v-else
        text="暂无变更记录"
      />
    </DetailDrawer>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformBindings">
import { h, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';

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

import { BINDING_SOURCE_LABEL, BINDING_TYPE_LABEL, BINDING_TYPE_OPTIONS } from '@/constants/dict';
import { labelOfBinding, toneOfBinding } from '@/constants/statusMap';
import { formatDateTime, remainDays } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { platformApi } from '@/api';

import type { BindingStatus, BindingType, BindingHistory } from '@/types';

const bindingTypeOptions = BINDING_TYPE_OPTIONS;
const bindingStatusOptions = [
  { label: '待客户确认', value: 'PENDING_CONFIRM' },
  { label: '生效中', value: 'ACTIVE' },
  { label: '待解除', value: 'PENDING_RELEASE' },
  { label: '已解除', value: 'RELEASED' },
];

const filters = reactive({
  keyword: '',
  type: undefined as BindingType | undefined,
  status: undefined as BindingStatus | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getBindingList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      type: filters.type,
      status: filters.status,
    }),
);

const historyVisible = ref(false);
const historyBindingId = ref('');
const history = ref<BindingHistory[]>([]);

const columns: DataTableColumn[] = [
  { prop: 'id', label: '绑定编号', width: 110 },
  { prop: 'deviceSn', label: '设备 SN', width: 180 },
  { prop: 'deviceName', label: '设备名称', minWidth: 160, showOverflowTooltip: true },
  {
    prop: 'type',
    label: '类型',
    width: 100,
    render: (row) => BINDING_TYPE_LABEL[row.type as string] ?? row.type,
  },
  { prop: 'customerName', label: '客户', width: 140 },
  { prop: 'vendorName', label: '厂家', width: 140 },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    render: (row) =>
      h(StatusBadge, { status: row.status as string, label: labelOfBinding(row.status as string), tone: toneOfBinding(row.status as string) }),
  },
  {
    prop: 'source',
    label: '来源',
    width: 110,
    render: (row) => BINDING_SOURCE_LABEL[row.source as string] ?? row.source,
  },
  {
    prop: 'autoConfirmDeadline',
    label: '自动确认截止',
    width: 150,
    render: (row) => {
      if (row.status !== 'PENDING_CONFIRM') return '—';
      const days = remainDays(row.autoConfirmDeadline as string);
      return `还剩 ${days} 天`;
    },
  },
  {
    prop: 'effectiveFrom',
    label: '生效时间',
    width: 140,
    render: (row) => formatDateTime(row.effectiveFrom as string),
  },
];

const onRowClick = async (row: Record<string, unknown>): Promise<void> => {
  historyBindingId.value = row.id as string;
  historyVisible.value = true;
  history.value = await platformApi.getBindingHistory(row.id as string);
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

.tl-row strong {
  color: var(--color-text-title);
}

.tl-meta {
  margin-top: 2px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.tl-remark {
  margin-top: 4px;
  color: var(--color-text-body);
  font-size: 13px;
}
</style>