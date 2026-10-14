<!--
  V-08b 告警详情独立路由态 —— 与抽屉共用内容组件，便于直接分享链接
-->
<template>
  <PageContainer
    v-if="detail"
    :title="`告警详情 · ${detail.alarm.id}`"
    :desc="`${detail.alarm.deviceSn} · ${detail.alarm.type}`"
  >
    <template #extra>
      <StatusBadge :status="detail.alarm.status" />
      <el-button @click="router.back()">返回告警中心</el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <AlarmDetailDrawer
        :detail="detail"
        @transition="onTransition"
        @create-order="onCreateOrder"
      />
    </section>
  </PageContainer>

  <PageContainer v-else>
    <el-skeleton :rows="8" animated />
  </PageContainer>
</template>

<script setup lang="ts" name="VendorAlarmDetail">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import AlarmDetailDrawer from './components/AlarmDetailDrawer.vue';

import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { vendorApi } from '@/api/vendor';

import type { Alarm, Component, DeviceMetricPoint, TimelineRecord } from '@/types';

const route = useRoute();
const router = useRouter();

const detail = ref<{
  alarm: Alarm;
  before: DeviceMetricPoint[];
  after: DeviceMetricPoint[];
  component?: Component;
  timeline: TimelineRecord[];
} | null>(null);

const load = async (): Promise<void> => {
  try {
    detail.value = await vendorApi.getAlarmDetail(route.params.id as string);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载告警失败');
    void router.replace('/vendor/alarms');
  }
};

const onTransition = async (action: 'confirm' | 'process' | 'recover'): Promise<void> => {
  try {
    await vendorApi.transitionAlarm(route.params.id as string, action);
    ElMessage.success('告警状态已更新');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '状态流转失败');
  }
};

const onCreateOrder = async (): Promise<void> => {
  if (!detail.value) return;
  try {
    const order = await vendorApi.createWorkOrderFromAlarm({
      alarmId: detail.value.alarm.id,
      problemType: 'DEVICE_FAULT',
      description: `${detail.value.alarm.type}触发系统告警，自动生成工单：${detail.value.alarm.deviceSn}`,
      priority: detail.value.alarm.level === 'URGENT' ? 'URGENT' : 'HIGH',
    });
    ElMessage.success(`工单 ${order.code} 已生成`);
    void router.push(`/vendor/work-orders/${order.code}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '生成工单失败');
  }
};

onMounted(load);
</script>

<style scoped lang="scss">
.card {
  @include card;
}
</style>