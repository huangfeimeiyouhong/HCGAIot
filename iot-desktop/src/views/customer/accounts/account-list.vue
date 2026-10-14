<!--
  C-12 子账号管理 —— 客户视角
  管理本租户下的子账号，支持邀请与审批。
-->
<template>
  <PageContainer
    title="子账号管理"
    desc="管理本食堂租户下的操作员账号，可邀请新成员并审批其访问权限。"
  >
    <template #extra>
      <el-button
        type="primary"
        @click="openInvite"
      >
        邀请子账号
      </el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <DataTable
        :data="list"
        :columns="columns"
        :loading="loading"
        row-key="id"
      />
      <EmptyState
        v-if="!loading && !list.length"
        text="暂无子账号"
        desc="点击右上角「邀请子账号」添加操作员"
      />
    </section>

    <!-- 邀请子账号弹窗 -->
    <el-dialog
      v-model="inviteVisible"
      title="邀请子账号"
      width="460"
      align-center
      append-to-body
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item
          label="姓名"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入成员姓名"
          />
        </el-form-item>
        <el-form-item
          label="账号"
          prop="account"
        >
          <el-input
            v-model="form.account"
            placeholder="登录账号"
          />
        </el-form-item>
        <el-form-item
          label="角色"
          prop="role"
        >
          <el-select
            v-model="form.role"
            placeholder="请选择角色"
            style="width: 100%"
          >
            <el-option
              label="管理员"
              value="CUSTOMER_ADMIN"
            />
            <el-option
              label="操作员"
              value="CUSTOMER_OPERATOR"
            />
            <el-option
              label="只读"
              value="CUSTOMER_VIEWER"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input
            v-model="form.phone"
            placeholder="选填"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="onInvite"
        >
          发送邀请
        </el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerAccountList">
import { h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElButton, ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { formatDateTime } from '@/utils/date';

import { customerApi } from '@/api/customer';

import type { AccountRole, TenantAccount } from '@/types';

const router = useRouter();

const list = ref<TenantAccount[]>([]);
const loading = ref(false);
const inviteVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const ROLE_LABEL: Record<string, string> = {
  CUSTOMER_ADMIN: '管理员',
  CUSTOMER_OPERATOR: '操作员',
  CUSTOMER_VIEWER: '只读',
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

const form = reactive<{ name: string; account: string; role: AccountRole; phone: string }>({
  name: '',
  account: '',
  role: 'CUSTOMER_OPERATOR',
  phone: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

/** 表格列 */
const columns: DataTableColumn[] = [
  { prop: 'name', label: '姓名', width: 120 },
  { prop: 'account', label: '账号', width: 150 },
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
        label: STATUS_LABEL[row.status as string] ?? String(row.status),
        tone: STATUS_TONE[row.status as string] ?? 'closed',
      }),
  },
  { prop: 'phone', label: '手机号', width: 130, render: (row) => row.phone || '—' },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 160,
    render: (row) => formatDateTime(row.createdAt as string),
  },
  {
    prop: 'actions',
    label: '操作',
    width: 140,
    fixed: 'right',
    render: (row) => {
      const r = row as TenantAccount;
      if (r.status !== 'PENDING_APPROVE') return null;
      return h('div', { class: 'row-actions' }, [
        h(ElButton, { link: true, type: 'success', onClick: (e: Event) => { e.stopPropagation(); onApprove(r, true); } }, '通过'),
        h(ElButton, { link: true, type: 'danger', onClick: (e: Event) => { e.stopPropagation(); onApprove(r, false); } }, '拒绝'),
      ]);
    },
  },
];

/** 加载账号列表 */
const load = async (): Promise<void> => {
  loading.value = true;
  try {
    list.value = await customerApi.getAccountList();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
};

/** 审批账号 */
const onApprove = async (row: TenantAccount, ok: boolean): Promise<void> => {
  try {
    await customerApi.approveAccount(row.id, ok);
    ElMessage.success(ok ? '已通过' : '已拒绝');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

/** 打开邀请弹窗 */
const openInvite = (): void => {
  form.name = '';
  form.account = '';
  form.role = 'CUSTOMER_OPERATOR';
  form.phone = '';
  inviteVisible.value = true;
  formRef.value?.clearValidate();
};

/** 发送邀请 */
const onInvite = async (): Promise<void> => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await customerApi.inviteAccount({ ...form });
      ElMessage.success('邀请已发送，账号待审批');
      inviteVisible.value = false;
      await load();
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '邀请失败');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(load);

void router;
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.row-actions {
  display: flex;
  gap: 8px;
}
</style>
