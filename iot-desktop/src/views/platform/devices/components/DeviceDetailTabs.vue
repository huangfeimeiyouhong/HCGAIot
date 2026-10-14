<!--
  P-07 设备详情抽屉内容 —— 5 Tab（档案 / 部件 / 绑定 / 告警 / 工单）
-->
<template>
  <el-tabs v-model="active">
    <el-tab-pane label="设备档案" name="profile">
      <DescList
        :items="profileItems"
        :columns="2"
      />
    </el-tab-pane>

    <el-tab-pane
      label="部件"
      name="components"
    >
      <el-alert
        v-if="scopeVendorType !== 'IOT'"
        class="iot-hint"
        type="info"
        :closable="false"
        title="厨具厂家视角：部件的固件版本与批次按隔离规则裁剪"
      />
      <DataTable
        :data="detail.components"
        :columns="componentColumns"
        row-key="id"
        max-height="420"
      >
        <template #empty>
          <EmptyState text="该设备暂无部件记录" />
        </template>
      </DataTable>
    </el-tab-pane>

    <el-tab-pane
      label="绑定关系"
      name="bindings"
    >
      <DataTable
        :data="detail.bindings"
        :columns="bindingColumns"
        row-key="id"
        max-height="420"
      >
        <template #empty>
          <EmptyState text="该设备暂无绑定关系" />
        </template>
      </DataTable>
    </el-tab-pane>

    <el-tab-pane
      label="告警记录"
      name="alarms"
    >
      <DataTable
        :data="detail.alarms"
        :columns="alarmColumns"
        row-key="id"
        max-height="420"
      >
        <template #empty>
          <EmptyState text="该设备暂无告警记录" />
        </template>
      </DataTable>
    </el-tab-pane>

    <el-tab-pane
      label="工单记录"
      name="orders"
    >
      <DataTable
        :data="detail.workOrders"
        :columns="orderColumns"
        row-key="code"
        max-height="420"
      >
        <template #empty>
          <EmptyState text="该设备暂无工单记录" />
        </template>
      </DataTable>
    </el-tab-pane>
  </el-tabs>
</template>

<script setup lang="ts" name="DeviceDetailTabs">
import { computed, h, ref } from 'vue';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { BINDING_SOURCE_LABEL, COMPONENT_TYPE_LABEL, DEVICE_CATEGORY_OPTIONS, PROBLEM_TYPE_LABEL } from '@/constants/dict';
import { labelOfBinding, toneOfBinding } from '@/constants/statusMap';
import { formatDateOnly, formatDateTime } from '@/utils/date';
import { useScope } from '@/hooks/use-scope';

import type { DeviceDetailBundle } from '@/types/vo';

interface Props {
  detail: DeviceDetailBundle;
}

const props = defineProps<Props>();

const active = ref('profile');
const scope = useScope();

const scopeVendorType = computed(() => scope.value.vendorType);

/** 档案项 */
const profileItems = computed(() => {
  const d = props.detail.device;
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
    { label: '出厂日期', value: formatDateOnly(d.manufactureDate) },
    { label: '质保期至', value: formatDateOnly(d.warrantyUntil) },
    { label: '关联厂家', value: d.vendorIds.length ? d.vendorIds.join('、') : '—' },
    { label: '最近上报', value: formatDateTime(d.lastReportAt) },
  ];
});

const componentColumns: DataTableColumn[] = [
  { prop: 'componentSn', label: '部件 SN', width: 140 },
  {
    prop: 'type',
    label: '类型',
    width: 120,
    render: (row) => COMPONENT_TYPE_LABEL[row.type as string] ?? row.type,
  },
  // ⚠️ 厨具厂家视角该列被 scope.stripFields 裁掉（不渲染 undefined）
  { prop: 'firmwareVersion', label: '固件版本', width: 110 },
  { prop: 'batch', label: '批次', width: 90 },
  {
    prop: 'dataMissingRate',
    label: '数据缺失率',
    width: 110,
    align: 'right',
    render: (row) => `${row.dataMissingRate ?? 0}%`,
  },
];

const bindingColumns: DataTableColumn[] = [
  { prop: 'id', label: '绑定编号', width: 110 },
  {
    prop: 'type',
    label: '类型',
    width: 100,
    render: (row) => (row.type === 'OWNERSHIP' ? '产权绑定' : '装配绑定'),
  },
  { prop: 'customerId', label: '客户租户', width: 120 },
  { prop: 'vendorId', label: '厂家', width: 120 },
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
    prop: 'effectiveFrom',
    label: '生效时间',
    width: 140,
    render: (row) => formatDateTime(row.effectiveFrom as string),
  },
];

const alarmColumns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 140 },
  { prop: 'type', label: '告警类型', width: 110 },
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
    width: 140,
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
    width: 110,
    render: (row) => PROBLEM_TYPE_LABEL[row.problemType as string] ?? row.problemType,
  },
  {
    prop: 'priority',
    label: '优先级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.priority as string }),
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
    width: 140,
    render: (row) => formatDateTime(row.createdAt as string),
  },
];
</script>

<style scoped lang="scss">
.iot-hint {
  margin-bottom: 12px;
}
</style>