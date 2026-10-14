<!--
  C-05 告警详情 —— 客户视角
  经 customerApi.getAlarmDetail 取数；可确认告警 / 转工单报修
-->
<template>
  <PageContainer
    v-if="alarm"
    :title="`告警 ${alarm.id}`"
    :desc="`${alarm.type} · 设备 ${alarm.deviceSn}`"
  >
    <template #extra>
      <StatusBadge :status="alarm.status" />
      <el-button
        v-if="alarm.status === 'UNCONFIRMED'"
        type="success"
        :loading="submitting"
        @click="onConfirm"
      >
        确认告警
      </el-button>
      <el-button
        type="primary"
        @click="router.push(`/customer/work-orders/create?deviceSn=${alarm.deviceSn}${alarm.id ? `&alarmId=${alarm.id}` : ''}`)"
      >
        转工单报修
      </el-button>
      <el-button @click="router.back()">
        返回列表
      </el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <h3 class="section-title">
        告警信息
      </h3>
      <DescList
        :items="alarmItems"
        :columns="2"
      />
    </section>

    <section class="card">
      <h3 class="section-title">
        告警期间监测趋势（{{ metrics.length }} 个采样点）
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
      v-if="order"
      class="card"
    >
      <h3 class="section-title">
        关联工单
      </h3>
      <el-alert
        type="info"
        :closable="false"
        class="order-alert"
      >
        <template #title>
          本告警已转工单
          <el-link
            type="primary"
            @click="router.push(`/customer/work-orders/${order.code}`)"
          >
            {{ order.code }}
          </el-link>
          （{{ order.status }}）
        </template>
      </el-alert>
    </section>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerAlarmDetail">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import BaseChart from '@/components/data/BaseChart.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import DescList from '@/components/data/DescList.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { lineOption } from '@/constants/chart';
import { ALARM_METRIC_MAP } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';
import { customerApi } from '@/api/customer';

import type { Alarm, DeviceMetricPoint, WorkOrder } from '@/types';

const route = useRoute();
const router = useRouter();

const alarm = ref<Alarm | null>(null);
const metrics = ref<DeviceMetricPoint[]>([]);
const vendor = ref('');
const order = ref<WorkOrder | undefined>(undefined);
const submitting = ref(false);

const alarmItems = computed(() => {
  const a = alarm.value;
  if (!a) return [];
  return [
    { label: '告警编号', value: a.id },
    { label: '告警类型', value: a.type },
    { label: '告警等级', value: a.level },
    { label: '设备 SN', value: a.deviceSn },
    { label: '实测值', value: `${a.actualValue} ${a.unit}` },
    { label: '阈值', value: `${a.threshold} ${a.unit}` },
    { label: '责任厂家', value: vendor.value },
    { label: '触发时间', value: formatDateTime(a.triggerTime) },
    { label: '持续时长', value: `${Math.round(a.duration / 60)} 分钟` },
    { label: '当前状态', value: a.status },
  ];
});

const metricOption = computed(() =>
  lineOption(
    metrics.value.map((m) => m.time.slice(5, 16)),
    [{ name: '监测值', value: metrics.value.map((m) => m.value) }],
  ),
);

const onConfirm = async (): Promise<void> => {
  if (!alarm.value) return;
  submitting.value = true;
  try {
    await customerApi.confirmAlarm(alarm.value.id);
    ElMessage.success('告警已确认');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '确认失败');
  } finally {
    submitting.value = false;
  }
};

const load = async (): Promise<void> => {
  try {
    const res = await customerApi.getAlarmDetail(route.params.id as string);
    alarm.value = res.alarm;
    metrics.value = res.metrics;
    vendor.value = res.vendor;
    order.value = res.order;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载告警详情失败');
    void router.replace('/customer/alarms');
  }
};

void ALARM_METRIC_MAP;

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

.order-alert {
  margin: 0;
}
</style>
