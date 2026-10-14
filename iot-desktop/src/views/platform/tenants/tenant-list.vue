<!--
  P-04 租户管理列表
-->
<template>
  <PageContainer
    title="租户管理"
    desc="平台与厂家两类租户的档案管理，财务字段按平台口径脱敏展示"
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
          placeholder="租户编号 / 名称"
          clearable
        />
        <Select
          v-model="filters.type"
          label="租户类型"
          :options="typeOptions"
          placeholder="全部类型"
        />
        <Select
          v-model="filters.auditStatus"
          label="入驻状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
      </template>
      <template #actions>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新增租户
        </el-button>
        <el-button
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
            @clear="onClear"
          />
        </template>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </section>

    <FormDialog
      v-model="createVisible"
      title="新增租户"
      :model="createForm"
      :loading="creating"
      @confirm="onCreate"
    >
      <el-form-item label="租户名称">
        <el-input
          v-model="createForm.name"
          placeholder="请输入租户全称"
        />
      </el-form-item>
      <el-form-item label="简称">
        <el-input
          v-model="createForm.shortName"
          placeholder="用于表格与图表标签"
        />
      </el-form-item>
      <el-form-item label="租户类型">
        <el-select
          v-model="createForm.type"
          class="full"
        >
          <el-option label="厂家" value="VENDOR" />
          <el-option label="客户" value="CUSTOMER" />
        </el-select>
      </el-form-item>
      <el-form-item label="联系人">
        <el-input
          v-model="createForm.contact"
          placeholder="请输入联系人"
        />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input
          v-model="createForm.contactPhone"
          placeholder="请输入联系电话"
        />
      </el-form-item>
    </FormDialog>

    <ConfirmDialog
      v-model="freezeVisible"
      :title="freezeTarget === 'FROZEN' ? '确认冻结租户' : '确认解冻租户'"
      :message="`冻结后该租户将无法登录与操作，确认${freezeTarget === 'FROZEN' ? '冻结' : '解冻'}「${pendingTenant?.shortName}」？`"
      :tone="freezeTarget === 'FROZEN' ? 'danger' : 'warning'"
      @confirm="onToggleStatus"
    />
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformTenants">
import { h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElMessage } from 'element-plus';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import FormDialog from '@/components/form/FormDialog.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { CUSTOMER_INDUSTRY_LABEL, ONBOARDING_STATUS_OPTIONS, VENDOR_TYPE_LABEL } from '@/constants/dict';
import { formatDateOnly } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { platformApi } from '@/api';

import type { OnboardingStatus, Tenant, TenantStatus, TenantType } from '@/types';

const router = useRouter();

const typeOptions = [
  { label: '厂家', value: 'VENDOR' },
  { label: '客户', value: 'CUSTOMER' },
];
const statusOptions = ONBOARDING_STATUS_OPTIONS;

const filters = reactive({
  keyword: '',
  type: undefined as TenantType | undefined,
  auditStatus: undefined as OnboardingStatus | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getTenantList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      type: filters.type,
      auditStatus: filters.auditStatus,
    }),
);

const createVisible = ref(false);
const creating = ref(false);
const createForm = reactive({ name: '', shortName: '', type: 'CUSTOMER' as TenantType, contact: '', contactPhone: '' });

const freezeVisible = ref(false);
const freezeTarget = ref<TenantStatus>('FROZEN');
const pendingTenant = ref<Tenant | null>(null);

const columns: DataTableColumn[] = [
  { prop: 'id', label: '租户编号', width: 100 },
  { prop: 'shortName', label: '简称', width: 140, showOverflowTooltip: true },
  { prop: 'name', label: '租户名称', minWidth: 220, showOverflowTooltip: true },
  {
    prop: 'type',
    label: '类型',
    width: 90,
    render: (row) => (row.type === 'VENDOR' ? '厂家' : '客户'),
  },
  {
    prop: 'vendorType',
    label: '厂家类型 / 行业',
    width: 120,
    render: (row) => {
      const t = row as Tenant;
      if (t.type === 'VENDOR') return VENDOR_TYPE_LABEL[t.vendorType ?? ''] ?? '—';
      return CUSTOMER_INDUSTRY_LABEL[t.industry ?? ''] ?? '—';
    },
  },
  { prop: 'contact', label: '联系人', width: 140 },
  { prop: 'contactPhone', label: '联系电话', width: 130 },
  {
    prop: 'auditStatus',
    label: '入驻状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.auditStatus as string }),
  },
  {
    prop: 'status',
    label: '租户状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'validTo',
    label: '有效期至',
    width: 110,
    render: (row) => formatDateOnly(row.validTo as string),
  },
  {
    prop: 'contractNo',
    label: '合同号',
    width: 120,
    // 平台方可见但脱敏为 ***
  },
  {
    label: '操作',
    width: 170,
    fixed: 'right',
    render: (row) => {
      const t = row as Tenant;
      return h('div', { style: { display: 'flex', gap: '12px' } }, [
        h(ElButton, {
          link: true,
          type: 'primary',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            void router.push(`/platform/tenants/${t.id}`);
          },
        }, () => '详情'),
        h(ElButton, {
          link: true,
          type: t.status === 'FROZEN' ? 'success' : 'danger',
          onClick: (e: MouseEvent) => {
            e.stopPropagation();
            onAskFreeze(t);
          },
        }, () => (t.status === 'FROZEN' ? '解冻' : '冻结')),
      ]);
    },
  },
];

const onRowClick = (row: Record<string, unknown>): void => {
  void router.push(`/platform/tenants/${row.id}`);
};

const onClear = (): void => {
  void resetFilters();
};

const openCreate = (): void => {
  createForm.name = '';
  createForm.shortName = '';
  createForm.type = 'CUSTOMER';
  createForm.contact = '';
  createForm.contactPhone = '';
  createVisible.value = true;
};

const onCreate = async (): Promise<void> => {
  if (!createForm.name) {
    ElMessage.warning('请填写租户名称');
    return;
  }
  creating.value = true;
  try {
    await platformApi.createTenant({ ...createForm });
    ElMessage.success('租户创建成功');
    createVisible.value = false;
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '创建失败');
  } finally {
    creating.value = false;
  }
};

const onAskFreeze = (tenant: Tenant): void => {
  pendingTenant.value = tenant;
  freezeTarget.value = tenant.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN';
  freezeVisible.value = true;
};

const onToggleStatus = async (): Promise<void> => {
  if (!pendingTenant.value) return;
  try {
    await platformApi.toggleTenantStatus(pendingTenant.value.id, freezeTarget.value === 'FROZEN');
    ElMessage.success('操作成功');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
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

.full {
  width: 100%;
}
</style>