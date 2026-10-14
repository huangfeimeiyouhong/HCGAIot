<!--
  P-05 租户详情 —— 基础档案 + 子账号 + 资产统计
  ⚠️ 合同/结算字段按平台口径脱敏为 ***
-->
<template>
  <PageContainer
    v-if="tenant"
    :title="tenant.name"
    :desc="`租户编号 ${tenant.id}`"
  >
    <template #extra>
      <StatusBadge :status="tenant.auditStatus" />
      <el-button @click="router.back()">返回列表</el-button>
    </template>

    <section class="stat-grid">
      <StatCard
        :data="{ key: 'devices', label: '在管设备', value: stats.devices, unit: '台', tone: 'primary' }"
        :clickable="false"
      />
      <StatCard
        :data="{ key: 'alarms', label: '历史告警', value: stats.alarms, unit: '条', tone: 'warning' }"
        :clickable="false"
      />
      <StatCard
        :data="{ key: 'orders', label: '历史工单', value: stats.workOrders, unit: '单', tone: 'info' }"
        :clickable="false"
      />
      <StatCard
        :data="{ key: 'bindings', label: '绑定关系', value: stats.bindings, unit: '条', tone: 'success' }"
        :clickable="false"
      />
    </section>

    <section class="card">
      <h3 class="section-title">
        基础档案
      </h3>
      <DescList
        :items="basicItems"
        :columns="2"
      />
    </section>

    <section class="card">
      <h3 class="section-title">
        子账号（{{ accounts.length }}）
      </h3>
      <DataTable
        :data="accountRows"
        :columns="accountColumns"
        row-key="id"
        max-height="320"
      >
        <template #empty>
          <EmptyState text="暂无子账号" />
        </template>
      </DataTable>
    </section>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformTenantDetail">
import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatCard from '@/components/data/StatCard.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { CUSTOMER_INDUSTRY_LABEL, VENDOR_TYPE_LABEL } from '@/constants/dict';
import { labelOf } from '@/constants/statusMap';
import { formatDateOnly, formatDateTime } from '@/utils/date';

import { platformApi } from '@/api';

import type { Tenant, TenantAccount } from '@/types';

const route = useRoute();
const router = useRouter();

const tenant = ref<Tenant | null>(null);
const accounts = ref<TenantAccount[]>([]);
const stats = ref({ devices: 0, alarms: 0, workOrders: 0, bindings: 0 });

const basicItems = computed(() => {
  const t = tenant.value;
  if (!t) return [];
  const industryOrType = t.type === 'VENDOR'
    ? VENDOR_TYPE_LABEL[t.vendorType ?? ''] ?? '—'
    : CUSTOMER_INDUSTRY_LABEL[t.industry ?? ''] ?? '—';
  return [
    { label: '租户编号', value: t.id },
    { label: '租户类型', value: t.type === 'VENDOR' ? '厂家' : '客户' },
    { label: '简称', value: t.shortName },
    { label: '厂家类型 / 行业', value: industryOrType },
    { label: '入驻状态', value: labelOf(t.auditStatus) },
    { label: '租户状态', value: labelOf(t.status) },
    { label: '联系人', value: t.contact },
    { label: '联系电话', value: t.contactPhone },
    { label: '创建时间', value: formatDateTime(t.createdAt) },
    { label: '有效期至', value: formatDateOnly(t.validTo) },
    // ⚠️ 平台方可见但脱敏为 ***
    { label: '合同号', value: t.contractNo ?? '***' },
    { label: '结算账号', value: t.settlementAccount ?? '***' },
    ...(t.type === 'VENDOR' ? [{ label: '服务范围客户数', value: `${t.serviceScope.length} 个`, span: 2 }] : []),
  ];
});

/** 账号行 */
const accountRows = computed(() => accounts.value.map((a) => ({ ...a })));

const accountColumns: DataTableColumn[] = [
  { prop: 'id', label: '账号编号', width: 110 },
  { prop: 'name', label: '姓名', width: 160 },
  { prop: 'account', label: '登录账号', width: 130 },
  { prop: 'role', label: '账号角色', minWidth: 150 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'lastLoginAt',
    label: '最近登录',
    width: 150,
    render: (row) => (row.lastLoginAt ? formatDateTime(row.lastLoginAt as string) : '从未登录'),
  },
];

onMounted(async () => {
  const id = route.params.id as string;
  try {
    const res = await platformApi.getTenantDetail(id);
    tenant.value = res.tenant;
    accounts.value = res.accounts;
    stats.value = res.stats;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载租户失败');
    void router.replace('/platform/tenants');
  }
});
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.section-title {
  margin-bottom: 14px;
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>