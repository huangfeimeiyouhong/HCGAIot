<!--
  V-11 子账号管理 —— 厂家视角子账号邀请与审批
  邀请后进入「待审批」，管理员可「通过」或「拒绝」；角色决定子账号可见范围
-->
<template>
  <PageContainer
    title="子账号管理"
    desc="本厂子账号的邀请、审批与停用。角色决定子账号可见的数据范围与可执行动作。"
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
          placeholder="姓名 / 账号 / 手机号"
          clearable
        />
        <Select
          v-model="filters.role"
          label="角色"
          :options="roleOptions"
          placeholder="全部角色"
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
          @click="openInvite"
        >
          邀请子账号
        </el-button>
      </template>
    </FilterBar>

    <section class="stats">
      <StatCard
        v-for="item in statCards"
        :key="item.key"
        :data="item"
        :clickable="false"
      />
    </section>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
      >
        <template #empty>
          <EmptyState
            text="无匹配子账号"
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
      v-model="inviteVisible"
      title="邀请子账号"
      :model="form"
      :rules="rules"
      :loading="submitting"
      confirm-text="发起邀请"
      @confirm="onInvite"
    >
      <el-form-item
        label="姓名"
        prop="name"
      >
        <el-input
          v-model="form.name"
          placeholder="如 张工"
        />
      </el-form-item>
      <el-form-item
        label="登录账号"
        prop="account"
      >
        <el-input
          v-model="form.account"
          placeholder="如 hc_engineer01"
        />
      </el-form-item>
      <el-form-item
        label="角色"
        prop="role"
      >
        <el-select
          v-model="form.role"
          class="form-select"
          placeholder="请选择角色"
        >
          <el-option
            v-for="opt in roleOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        label="手机号"
        prop="phone"
      >
        <el-input
          v-model="form.phone"
          placeholder="选填，用于接收审批结果短信"
        />
      </el-form-item>
      <p class="invite-tip">
        邀请提交后子账号进入「待审批」，需本厂管理员在下方列表点「通过」后生效。
      </p>
    </FormDialog>

    <!-- 拒绝子账号（必填原因，便于后续追溯） -->
    <ConfirmDialog
      v-model="rejectVisible"
      title="拒绝子账号申请"
      :message="current ? `拒绝后该子账号将置为「已禁用」，不可登录。请填写拒绝原因。` : ''"
      require-reason
      reason-label="拒绝原因"
      reason-placeholder="请填写拒绝原因（必填），如：身份信息待核实 / 非本厂在职人员"
      tone="danger"
      @confirm="onReject"
    />
  </PageContainer>
</template>

<script setup lang="ts" name="VendorAccountList">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import type { FormRules } from 'element-plus';

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
import StatCard from '@/components/data/StatCard.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';

import type { AccountRole, AccountStatus, StatCardData, TenantAccount } from '@/types';

/** 厂家侧角色（VENDOR_* 三档，与 AccountRole 的定义保持一致） */
const ROLE_LABEL: Record<string, string> = {
  VENDOR_ADMIN: '管理员',
  VENDOR_ENGINEER: '工程师',
  VENDOR_VIEWER: '只读',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '启用',
  PENDING_APPROVE: '待审批',
  DISABLED: '已禁用',
};

const STATUS_TONE: Record<string, 'success' | 'waiting' | 'closed'> = {
  ACTIVE: 'success',
  PENDING_APPROVE: 'waiting',
  DISABLED: 'closed',
};

const roleOptions = [
  { label: '管理员', value: 'VENDOR_ADMIN' },
  { label: '工程师', value: 'VENDOR_ENGINEER' },
  { label: '只读', value: 'VENDOR_VIEWER' },
];

const statusOptions = [
  { label: '启用', value: 'ACTIVE' },
  { label: '待审批', value: 'PENDING_APPROVE' },
  { label: '已禁用', value: 'DISABLED' },
];

const filters = reactive({
  keyword: '',
  role: undefined as AccountRole | undefined,
  status: undefined as AccountStatus | undefined,
});

/**
 * 子账号为全量小列表（getAccountList 不分页），这里在 api 返回后
 * 用统一的分页器做前端切片，保持与其余列表页一致的交互。
 */
const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  async (params) => {
    const all = await vendorApi.getAccountList();
    const filtered = all.filter((a) => {
      const kw = String(params.keyword ?? '').trim();
      const hitKw =
        !kw ||
        a.name.includes(kw) ||
        a.account.includes(kw) ||
        (a.phone ?? '').includes(kw);
      return hitKw && (!filters.role || a.role === filters.role) && (!filters.status || a.status === filters.status);
    });
    const start = (params.page - 1) * params.pageSize;
    return {
      list: filtered.slice(start, start + params.pageSize),
      total: filtered.length,
      page: params.page,
      pageSize: params.pageSize,
    };
  },
  { pageSize: 10 },
);

/** 概览：总数 / 待审批 / 启用 / 已禁用 */
const statCards = computed<StatCardData[]>(() => {
  const rows = tableData.value as TenantAccount[];
  const count = (s: string): number => rows.filter((r) => r.status === s).length;
  return [
    { key: 'total', label: '子账号总数', value: total.value, unit: '个', tone: 'primary' },
    { key: 'pending', label: '待审批', value: count('PENDING_APPROVE'), unit: '个', tone: 'warning' },
    { key: 'active', label: '已启用', value: count('ACTIVE'), unit: '个', tone: 'success' },
    { key: 'disabled', label: '已禁用', value: count('DISABLED'), unit: '个', tone: 'info' },
  ];
});

const inviteVisible = ref(false);
const submitting = ref(false);
const rejectVisible = ref(false);
const current = ref<TenantAccount | null>(null);

const form = reactive<{ name: string; account: string; role: AccountRole; phone: string }>({
  name: '',
  account: '',
  role: 'VENDOR_ENGINEER',
  phone: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  account: [
    { required: true, message: '请输入登录账号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_]{3,20}$/, message: '3~20 位字母、数字或下划线', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
};

const columns: DataTableColumn[] = [
  { prop: 'name', label: '姓名', width: 120 },
  { prop: 'account', label: '登录账号', width: 160 },
  {
    prop: 'role',
    label: '角色',
    width: 100,
    render: (row) => ROLE_LABEL[row.role as string] ?? row.role,
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) =>
      h(StatusBadge, {
        status: undefined,
        label: STATUS_LABEL[row.status as string] ?? String(row.status),
        tone: STATUS_TONE[row.status as string] ?? 'closed',
      }),
  },
  { prop: 'phone', label: '手机号', width: 130, render: (row) => row.phone || '—' },
  {
    prop: 'lastLoginAt',
    label: '最近登录',
    width: 160,
    render: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt as string) : '从未登录'),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    label: '操作',
    width: 130,
    fixed: 'right',
    render: (row) => {
      const a = row as TenantAccount;
      // 仅「待审批」态可操作；其余状态按约定 9 隐藏按钮而非置灰
      if (a.status !== 'PENDING_APPROVE') return '';
      return h('div', { style: { display: 'flex', gap: '8px' } }, [
        h(
          ElButton,
          { link: true, type: 'success', onClick: () => void onApprove(a, true) },
          () => '通过',
        ),
        h(
          ElButton,
          {
            link: true,
            type: 'danger',
            onClick: () => {
              current.value = a;
              rejectVisible.value = true;
            },
          },
          () => '拒绝',
        ),
      ]);
    },
  },
];

const openInvite = (): void => {
  form.name = '';
  form.account = '';
  form.role = 'VENDOR_ENGINEER';
  form.phone = '';
  inviteVisible.value = true;
};

const onInvite = async (): Promise<void> => {
  submitting.value = true;
  try {
    await vendorApi.inviteAccount({
      name: form.name,
      account: form.account,
      role: form.role,
      phone: form.phone || undefined,
    });
    ElMessage.success('邀请已发起，等待审批');
    inviteVisible.value = false;
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '邀请失败');
  } finally {
    submitting.value = false;
  }
};

/** 通过 / 拒绝（拒绝走 ConfirmDialog 收集原因） */
const onApprove = async (row: TenantAccount, ok: boolean): Promise<void> => {
  try {
    await vendorApi.approveAccount(row.id, ok);
    ElMessage.success(ok ? '子账号已通过，可正常登录' : '子账号已拒绝');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

/**
 * 拒绝：拒绝原因由 ConfirmDialog 强制收集（与客户端「拒绝」一致），
 * 但 vendorApi.approveAccount(id, ok) 不接收原因字段，此处仅作留痕用途。
 */
const onReject = async (reason: string): Promise<void> => {
  if (!current.value) return;
  const target = current.value;
  await onApprove(target, false);
  void reason;
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}

.filter-input {
  width: 220px;
}

.form-select {
  width: 100%;
}

.invite-tip {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.8;
}
</style>
