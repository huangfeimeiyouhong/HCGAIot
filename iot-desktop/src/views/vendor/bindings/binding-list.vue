<!--
  V-06 绑定关系管理 —— 申报 + 解绑申请 + 服务范围校验
-->
<template>
  <PageContainer
    title="绑定关系"
    desc="厂家侧的产权与装配绑定管理，申报后由客户确认（7 天自动生效）"
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
          :options="typeOptions"
          placeholder="全部类型"
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
      v-model="unbindVisible"
      title="确认申请解绑"
      :message="`解绑申请提交后进入「待解除」状态，需客户或平台确认后生效。确认申请解绑 ${pendingBinding?.deviceSn ?? ''}？`"
      require-reason
      reason-label="解绑原因"
      tone="warning"
      @confirm="onUnbind"
    />

    <DetailDrawer
      v-model="historyVisible"
      :title="`绑定变更历史 · ${historyBindingId}`"
      size="600"
    >
      <el-timeline v-if="history.length">
        <el-timeline-item
          v-for="item in history"
          :key="item.id"
          :timestamp="formatDateTime(item.time)"
          placement="top"
        >
          <strong>v{{ item.version }} · {{ item.action }}</strong>
          <div class="tl-meta">
            {{ item.operator }}
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

<script setup lang="ts" name="VendorBindings">
import { h, onMounted, reactive, ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
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

import { vendorApi } from '@/api/vendor';

import type { Binding, BindingHistory, BindingStatus, BindingType } from '@/types';

const typeOptions = BINDING_TYPE_OPTIONS;
const statusOptions = [
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
    vendorApi.getBindingList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      type: filters.type,
      status: filters.status,
    }),
);

const unbindVisible = ref(false);
const pendingBinding = ref<(Binding & { deviceName: string; customerName: string }) | null>(null);
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
  { prop: 'customerName', label: '客户', width: 150 },
  {
    prop: 'status',
    label: '状态',
    width: 120,
    render: (row) =>
      h(StatusBadge, { status: row.status as string, label: labelOfBinding(row.status as string), tone: toneOfBinding(row.status as string) }),
  },
  {
    prop: 'autoConfirmDeadline',
    label: '自动生效',
    width: 120,
    render: (row) => {
      if (row.status !== 'PENDING_CONFIRM') return '—';
      return `还剩 ${remainDays(row.autoConfirmDeadline as string)} 天`;
    },
  },
  {
    prop: 'source',
    label: '来源',
    width: 110,
    render: (row) => BINDING_SOURCE_LABEL[row.source as string] ?? row.source,
  },
  {
    prop: 'effectiveFrom',
    label: '生效时间',
    width: 150,
    render: (row) => formatDateTime(row.effectiveFrom as string),
  },
  {
    label: '操作',
    width: 150,
    fixed: 'right',
    render: (row) => {
      const b = row as Binding & { deviceName: string; customerName: string };
      const btns = [
        h(
          ElButton,
          {
            link: true,
            type: 'primary',
            onClick: async (e: MouseEvent) => {
              e.stopPropagation();
              historyBindingId.value = b.id;
              history.value = await vendorApi.getBindingHistory(b.id);
              historyVisible.value = true;
            },
          },
          () => '变更历史',
        ),
      ];
      // 无权限/无意义的按钮直接隐藏（约定 9），不置灰
      if (b.status === 'ACTIVE') {
        btns.push(
          h(
            ElButton,
            {
              link: true,
              type: 'danger',
              onClick: (e: MouseEvent) => {
                e.stopPropagation();
                pendingBinding.value = b;
                unbindVisible.value = true;
              },
            },
            () => '申请解绑',
          ),
        );
      }
      return h('div', { style: { display: 'flex', gap: '10px' } }, btns);
    },
  },
];

const onUnbind = async (reason: string): Promise<void> => {
  if (!pendingBinding.value) return;
  try {
    await vendorApi.requestUnbind(pendingBinding.value.id, reason);
    ElMessage.success('解绑申请已提交');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
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
  width: 200px;
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