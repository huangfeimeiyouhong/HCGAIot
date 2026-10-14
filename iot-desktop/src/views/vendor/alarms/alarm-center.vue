<!--
  V-08 告警中心 —— 列表 + 详情抽屉（前后 30min 曲线 + 关联部件）+ 告警转工单
-->
<template>
  <PageContainer
    title="告警中心"
    desc="本厂家设备的告警响应与处理，转工单后进入闭环流程"
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
          placeholder="告警编号 / 设备 SN / 类型"
          clearable
        />
        <Select
          v-model="filters.level"
          label="告警等级"
          :options="levelOptions"
          placeholder="全部等级"
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
        <Select
          v-model="filters.deviceSn"
          label="设备"
          :options="deviceOptions"
          placeholder="全部设备"
          filterable
        />
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
      v-model="detailVisible"
      :title="`告警详情 · ${currentAlarmId}`"
      size="820"
      :loading="detailLoading"
    >
      <AlarmDetailDrawer
        v-if="detail"
        :detail="detail"
        @transition="onTransition"
        @create-order="onCreateOrder"
      />
    </DetailDrawer>

    <!-- 告警转工单 -->
    <FormDialog
      v-model="orderVisible"
      title="告警转工单"
      :model="orderForm"
      :loading="creatingOrder"
      confirm-text="生成工单"
      @confirm="onSubmitOrder"
    >
      <el-form-item label="来源告警">
        <el-input
          :model-value="`${currentAlarmId} · ${detail?.alarm.type ?? ''}`"
          disabled
        />
      </el-form-item>
      <el-form-item label="设备 SN">
        <el-input
          :model-value="detail?.alarm.deviceSn ?? ''"
          disabled
        />
      </el-form-item>
      <el-form-item label="问题类型">
        <el-select
          v-model="orderForm.problemType"
          class="full"
        >
          <el-option
            v-for="p in problemTypeOptions"
            :key="p.value"
            :label="p.label"
            :value="p.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="优先级">
        <el-select
          v-model="orderForm.priority"
          class="full"
        >
          <el-option
            v-for="p in priorityOptions"
            :key="p.value"
            :label="p.label"
            :value="p.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="故障描述">
        <el-input
          v-model="orderForm.description"
          type="textarea"
          :rows="3"
          placeholder="请填写故障现象与初步判断"
        />
      </el-form-item>
    </FormDialog>
  </PageContainer>
</template>

<script setup lang="ts" name="VendorAlarms">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import AlarmDetailDrawer from './components/AlarmDetailDrawer.vue';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DetailDrawer from '@/components/data/DetailDrawer.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import FormDialog from '@/components/form/FormDialog.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { PRIORITY_OPTIONS, PROBLEM_TYPE_OPTIONS } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';

import type { Alarm, AlarmLevel, AlarmStatus, DeviceMetricPoint, Component, ProblemType, Priority, TimelineRecord } from '@/types';

const router = useRouter();

const levelOptions = [
  { label: '紧急', value: 'URGENT' },
  { label: '重要', value: 'IMPORTANT' },
  { label: '一般', value: 'NORMAL' },
];
const statusOptions = [
  { label: '未确认', value: 'UNCONFIRMED' },
  { label: '已确认', value: 'CONFIRMED' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已恢复', value: 'RECOVERED' },
];
const problemTypeOptions = PROBLEM_TYPE_OPTIONS;
const priorityOptions = PRIORITY_OPTIONS;

const filters = reactive({
  keyword: '',
  level: undefined as AlarmLevel | undefined,
  status: undefined as AlarmStatus | undefined,
  deviceSn: undefined as string | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    vendorApi.getAlarmList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      level: filters.level,
      status: filters.status,
      deviceSn: filters.deviceSn,
    }),
);

const deviceOptions = ref<Array<{ label: string; value: string }>>([]);

const detailVisible = ref(false);
const detailLoading = ref(false);
const currentAlarmId = ref('');
const detail = ref<{
  alarm: Alarm;
  before: DeviceMetricPoint[];
  after: DeviceMetricPoint[];
  component?: Component;
  timeline: TimelineRecord[];
} | null>(null);

const orderVisible = ref(false);
const creatingOrder = ref(false);
const orderForm = reactive<{ problemType: ProblemType; priority: Priority; description: string }>({
  problemType: 'DEVICE_FAULT',
  priority: 'HIGH',
  description: '',
});

const columns: DataTableColumn[] = [
  { prop: 'id', label: '告警编号', width: 140 },
  { prop: 'deviceSn', label: '设备 SN', width: 180 },
  { prop: 'type', label: '告警类型', width: 110 },
  {
    prop: 'level',
    label: '等级',
    width: 90,
    render: (row) => h(StatusBadge, { status: row.level as string }),
  },
  {
    prop: 'actualValue',
    label: '实测 / 阈值',
    width: 130,
    align: 'right',
    render: (row) => `${row.actualValue ?? '-'} / ${row.threshold ?? '-'} ${row.unit ?? ''}`,
  },
  {
    prop: 'duration',
    label: '持续',
    width: 100,
    align: 'right',
    render: (row) => `${Math.round((row.duration as number) / 60)} 分钟`,
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
  {
    prop: 'orderId',
    label: '关联工单',
    width: 140,
    render: (row) => (row.orderId ? (row.orderId as string) : '—'),
  },
];

const onRowClick = async (row: Record<string, unknown>): Promise<void> => {
  currentAlarmId.value = row.id as string;
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    detail.value = await vendorApi.getAlarmDetail(row.id as string);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载告警详情失败');
    detailVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
};

const onTransition = async (action: 'confirm' | 'process' | 'recover'): Promise<void> => {
  if (!currentAlarmId.value) return;
  try {
    await vendorApi.transitionAlarm(currentAlarmId.value, action);
    ElMessage.success('告警状态已更新');
    detail.value = await vendorApi.getAlarmDetail(currentAlarmId.value);
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '状态流转失败');
  }
};

const onCreateOrder = (): void => {
  orderForm.description = `${detail.value?.alarm.type ?? ''}触发系统告警，自动生成工单：${detail.value?.alarm.deviceSn ?? ''}`;
  // 告警等级 → 建议优先级
  const level = detail.value?.alarm.level;
  orderForm.priority = level === 'URGENT' ? 'URGENT' : level === 'IMPORTANT' ? 'HIGH' : 'NORMAL';
  orderVisible.value = true;
};

const onSubmitOrder = async (): Promise<void> => {
  if (!orderForm.description.trim()) {
    ElMessage.warning('请填写故障描述');
    return;
  }
  creatingOrder.value = true;
  try {
    const order = await vendorApi.createWorkOrderFromAlarm({
      alarmId: currentAlarmId.value,
      problemType: orderForm.problemType,
      description: orderForm.description,
      priority: orderForm.priority,
    });
    ElMessage.success(`工单 ${order.code} 已生成，状态为「待接单」`);
    orderVisible.value = false;
    detailVisible.value = false;
    void router.push(`/vendor/work-orders/${order.code}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '生成工单失败');
  } finally {
    creatingOrder.value = false;
  }
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(async () => {
  await loadData();
  const devices = await vendorApi.getDeviceList({ page: 1, pageSize: 100 });
  deviceOptions.value = devices.list.map((d) => ({ label: `${d.sn} · ${d.name}`, value: d.sn }));
  void computed;
});
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