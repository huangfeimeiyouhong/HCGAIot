<!--
  C-03 设备详情 —— 客户视角（部件仅给数量，不含固件/成本）
  经 customerApi.getDeviceDetail 取数
-->
<template>
  <PageContainer
    v-if="device"
    :title="device.name"
    :desc="`设备 SN ${device.sn} · ${device.modelName}`"
  >
    <template #extra>
      <StatusBadge :status="device.status" />
      <el-button
        type="primary"
        @click="router.push(`/customer/work-orders/create?deviceSn=${device.sn}`)"
      >
        发起报修
      </el-button>
      <el-button @click="router.back()">
        返回列表
      </el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <h3 class="section-title">
        设备档案
      </h3>
      <DescList
        :items="deviceItems"
        :columns="2"
      />
    </section>

    <section class="card">
      <h3 class="section-title">
        近期监测趋势（最近 {{ metrics.length }} 个采样点）
      </h3>
      <BaseChart
        v-if="metrics.length"
        :option="metricOption"
        height="240px"
      />
      <EmptyState
        v-else
        text="暂无监测数据"
        :actionable="false"
      />
    </section>

    <section
      v-if="alarms.length"
      class="card"
    >
      <h3 class="section-title">
        关联告警（{{ alarms.length }} 条）
      </h3>
      <DataTable
        :data="alarms"
        :columns="alarmColumns"
        row-key="id"
        :max-height="300"
        @row-click="(row: any) => router.push(`/customer/alarms/${row.id}`)"
      />
    </section>

    <section
      v-if="workOrders.length"
      class="card"
    >
      <h3 class="section-title">
        关联工单（{{ workOrders.length }} 条）
      </h3>
      <DataTable
        :data="workOrders"
        :columns="orderColumns"
        row-key="code"
        :max-height="300"
        @row-click="(row: any) => router.push(`/customer/work-orders/${row.code}`)"
      />
    </section>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerDeviceDetail">
import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import BaseChart from '@/components/data/BaseChart.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { lineOption } from '@/constants/chart';
import { DEVICE_CATEGORY_OPTIONS } from '@/constants/dict';
import { formatDateOnly, formatDateTime } from '@/utils/date';
import { customerApi } from '@/api/customer';

import type { Alarm, CustomerDeviceView, WorkOrder } from '@/types';

const route = useRoute();
const router = useRouter();

const device = ref<CustomerDeviceView | null>(null);
const metrics = ref<Array<{ deviceSn: string; metricKey: string; value: number; time: string }>>([]);
const alarms = ref<Alarm[]>([]);
const workOrders = ref<WorkOrder[]>([]);
const componentCount = ref(0);

const deviceItems = computed(() => {
  const d = device.value;
  if (!d) return [];
  return [
    { label: '设备名称', value: d.name },
    { label: '设备 SN', value: d.sn },
    { label: '型号', value: d.modelName },
    { label: '品类', value: DEVICE_CATEGORY_OPTIONS.find((c) => c.value === d.category)?.label ?? d.category },
    { label: '责任厂家', value: d.vendorName },
    { label: '安装位置', value: d.location },
    {
      label: '告警状态',
      value: d.alarmStatus === 'HAS_ALARM' ? '有未确认告警' : '正常',
    },
    { label: '累计告警', value: `${d.alarmCount} 次` },
    { label: '部件数量', value: `${componentCount.value} 个` },
    { label: '质保期至', value: formatDateOnly(d.warrantyUntil) },
    { label: '最近上报', value: formatDateTime(d.lastReportAt) },
  ];
});

const metricOption = computed(() =>
  lineOption(
    metrics.value.map((m) => m.time.slice(5, 16)),
    [{ name: '监测值', value: metrics.value.map((m) => m.value) }],
  ),
);

const alarmColumns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 140 },
  { prop: 'type', label: '类型', width: 110 },
  {
    prop: 'level',
    label: '等级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.level as string }),
  },
  {
    prop: 'triggerTime',
    label: '触发时间',
    width: 150,
    render: (row) => formatDateTime(row.triggerTime as string),
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
];

const orderColumns: DataTableColumn[] = [
  { prop: 'code', label: '工单编号', width: 150 },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'priority',
    label: '优先级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.priority as string }),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 150,
    render: (row) => formatDateTime(row.createdAt as string),
  },
];

const load = async (): Promise<void> => {
  try {
    const res = await customerApi.getDeviceDetail(route.params.id as string);
    device.value = res.device;
    metrics.value = res.metrics;
    alarms.value = res.alarms;
    workOrders.value = res.workOrders;
    componentCount.value = res.componentCount;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载设备详情失败');
    void router.replace('/customer/devices');
  }
};

onMounted(load);
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.section-title {
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}
</style>
