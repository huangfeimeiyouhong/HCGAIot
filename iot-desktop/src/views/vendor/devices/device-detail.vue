<!--
  V-05 设备详情 —— 5 Tab（档案 / 部件 / 绑定历史 / 告警 / 工单）
-->
<template>
  <PageContainer
    v-if="detail"
    :title="detail.device.name"
    :desc="`设备 SN ${detail.device.sn}`"
  >
    <template #extra>
      <StatusBadge :status="detail.device.status" />
      <el-button @click="router.back()">返回列表</el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <el-tabs v-model="active">
        <el-tab-pane label="设备档案" name="profile">
          <DescList
            :items="profileItems"
            :columns="2"
          />
        </el-tab-pane>

        <el-tab-pane label="部件" name="components">
          <DataTable
            :data="detail.components"
            :columns="componentColumns"
            row-key="id"
            max-height="400"
          >
            <template #empty>
              <EmptyState text="该设备暂无部件记录（厨具本体通常无独立部件台账）" />
            </template>
          </DataTable>
        </el-tab-pane>

        <el-tab-pane label="绑定历史" name="bindings">
          <el-table
            :data="detail.bindingHistory"
            border
            max-height="400"
          >
            <el-table-column
              prop="version"
              label="版本"
              width="80"
            >
              <template #default="{ row }">v{{ row.version }}</template>
            </el-table-column>
            <el-table-column
              prop="action"
              label="动作"
              width="140"
            />
            <el-table-column
              prop="operator"
              label="操作人"
              width="150"
            />
            <el-table-column
              prop="reason"
              label="原因"
              min-width="240"
            />
            <el-table-column
              prop="time"
              label="时间"
              width="160"
            >
              <template #default="{ row }">{{ formatDateTime(row.time) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="历史告警" name="alarms">
          <DataTable
            :data="detail.alarms"
            :columns="alarmColumns"
            row-key="id"
            max-height="400"
          >
            <template #empty>
              <EmptyState text="该设备暂无告警记录" />
            </template>
          </DataTable>
        </el-tab-pane>

        <el-tab-pane label="相关工单" name="orders">
          <DataTable
            :data="detail.workOrders"
            :columns="orderColumns"
            row-key="code"
            max-height="400"
          >
            <template #empty>
              <EmptyState text="该设备暂无工单记录" />
            </template>
          </DataTable>
        </el-tab-pane>
      </el-tabs>
    </section>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="VendorDeviceDetail">
import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { COMPONENT_TYPE_LABEL, DEVICE_CATEGORY_OPTIONS, PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { formatDateOnly, formatDateTime } from '@/utils/date';

import { vendorApi } from '@/api/vendor';

import type { Alarm, BindingHistory, Component, Device, WorkOrder } from '@/types';

const route = useRoute();
const router = useRouter();

const active = ref('profile');
const detail = ref<{
  device: Device;
  components: Component[];
  bindingHistory: BindingHistory[];
  alarms: Alarm[];
  workOrders: WorkOrder[];
} | null>(null);

const profileItems = computed(() => {
  const d = detail.value?.device;
  if (!d) return [];
  return [
    { label: '设备 SN', value: d.sn },
    { label: '设备名称', value: d.name },
    { label: '型号', value: d.modelCode },
    {
      label: '品类',
      value: DEVICE_CATEGORY_OPTIONS.find((c) => c.value === d.category)?.label ?? d.category,
    },
    { label: '安装位置', value: d.location },
    { label: '产权客户', value: d.ownerCustomerId ?? '未绑定' },
    { label: '关联厂家', value: d.vendorIds.join('、') },
    { label: '出厂日期', value: formatDateOnly(d.manufactureDate) },
    { label: '质保期至', value: formatDateOnly(d.warrantyUntil) },
    { label: '累计告警', value: `${d.alarmCount} 条` },
    { label: '最近上报', value: formatDateTime(d.lastReportAt) },
  ];
});

const componentColumns: DataTableColumn[] = [
  { prop: 'componentSn', label: '部件 SN', width: 150 },
  {
    prop: 'type',
    label: '类型',
    width: 130,
    render: (row) => COMPONENT_TYPE_LABEL[row.type as string] ?? row.type,
  },
  { prop: 'firmwareVersion', label: '固件版本', width: 110 },
  {
    prop: 'metricSet',
    label: '采集指标',
    minWidth: 200,
    render: (row) => ((row.metricSet as string[]) ?? []).join('、') || '—',
  },
  { prop: 'batch', label: '批次', width: 90 },
];

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
    prop: 'actualValue',
    label: '实测值',
    width: 110,
    align: 'right',
    render: (row) => `${row.actualValue ?? '-'} ${row.unit ?? ''}`,
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
  { prop: 'code', label: '工单编号', width: 140 },
  {
    prop: 'problemType',
    label: '问题类型',
    width: 120,
    render: (row) => PROBLEM_TYPE_LABEL[row.problemType as string] ?? row.problemType,
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 150,
    render: (row) => formatDateTime(row.createdAt as string),
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
          onClick: () => router.push(`/vendor/work-orders/${row.code}`),
        },
        () => '处理',
      ),
  },
];

onMounted(async () => {
  const sn = route.params.id as string;
  try {
    detail.value = await vendorApi.getDeviceDetail(sn);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载设备失败');
    void router.replace('/vendor/devices');
  }
});
</script>

<style scoped lang="scss">
.card {
  @include card;
}
</style>