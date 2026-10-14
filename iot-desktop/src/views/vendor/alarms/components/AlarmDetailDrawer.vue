<!--
  告警详情抽屉（厂家版）—— 信息 + 前后 30min 曲线 + 关联部件 + 状态流转 + 转工单
-->
<template>
  <div class="alarm-detail">
    <section class="alarm-detail__section">
      <h4 class="section-title">
        告警信息
      </h4>
      <DescList
        :items="items"
        :columns="2"
      />
    </section>

    <section
      v-if="detail.component"
      class="alarm-detail__section"
    >
      <h4 class="section-title">
        关联部件
      </h4>
      <el-table
        :data="[detail.component]"
        border
      >
        <el-table-column
          prop="componentSn"
          label="部件 SN"
          width="150"
        />
        <el-table-column
          label="类型"
          width="120"
        >
          <template #default="{ row }">{{ COMPONENT_TYPE_LABEL[row.type] ?? row.type }}</template>
        </el-table-column>
        <el-table-column
          prop="firmwareVersion"
          label="固件版本"
          width="110"
        />
        <el-table-column
          prop="batch"
          label="批次"
          width="90"
        />
      </el-table>
    </section>

    <section class="alarm-detail__section">
      <h4 class="section-title">
        触发前后曲线（各 30 分钟采样点）
      </h4>
      <div class="curve">
        <BaseChart :option="curveOption" height="220px" />
      </div>
    </section>

    <section class="alarm-detail__section">
      <h4 class="section-title">
        状态流转
      </h4>
      <div
        v-if="actions.length"
        class="alarm-detail__actions"
      >
        <el-button
          v-for="action in actions"
          :key="action.key"
          :type="action.tone"
          :plain="action.tone !== 'primary'"
          @click="emit('transition', action.key as 'confirm' | 'process' | 'recover')"
        >
          {{ action.label }}
        </el-button>
      </div>
      <el-alert
        v-else
        type="success"
        :closable="false"
        title="该告警已到终态，无可执行操作"
      />
    </section>

    <section class="alarm-detail__section">
      <h4 class="section-title">
        闭环动作
      </h4>
      <div class="alarm-detail__actions">
        <el-tag
          v-if="detail.alarm.orderId"
          type="info"
          effect="plain"
        >
          已生成工单 {{ detail.alarm.orderId }}
        </el-tag>
        <el-button
          v-else
          type="primary"
          plain
          @click="emit('createOrder')"
        >
          告警转工单
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts" name="VendorAlarmDetailDrawer">
import { computed } from 'vue';

import BaseChart from '@/components/data/BaseChart.vue';
import DescList from '@/components/data/DescList.vue';

import { COMPONENT_TYPE_LABEL } from '@/constants/dict';
import { actionsOf } from '@/constants/stateMachine';
import { lineOption } from '@/constants/chart';
import { formatDateTime } from '@/utils/date';

import type { ECOption } from '@/hooks/use-echarts';
import type { Alarm, Component, DeviceMetricPoint, TimelineRecord } from '@/types';

interface Props {
  detail: {
    alarm: Alarm;
    before: DeviceMetricPoint[];
    after: DeviceMetricPoint[];
    component?: Component;
    timeline: TimelineRecord[];
  };
}

const props = defineProps<Props>();

const emit = defineEmits<{
  transition: [action: 'confirm' | 'process' | 'recover'];
  createOrder: [];
}>();

const actions = computed(() => actionsOf('ALARM', props.detail.alarm.status, 'VENDOR'));

const items = computed(() => {
  const a = props.detail.alarm;
  return [
    { label: '告警编号', value: a.id },
    { label: '设备 SN', value: a.deviceSn },
    { label: '告警类型', value: a.type },
    { label: '告警等级', value: a.level },
    { label: '实测值', value: `${a.actualValue} ${a.unit}` },
    { label: '触发阈值', value: `${a.threshold} ${a.unit}` },
    { label: '持续时长', value: `${Math.round(a.duration / 60)} 分钟` },
    { label: '触发时间', value: formatDateTime(a.triggerTime) },
    { label: '客户租户', value: a.customerId },
    {
      label: '触发来源',
      value: a.byCustomerThreshold ? '客户自定义阈值（不计入厂家 SLA 考核）' : a.source,
    },
    { label: '关联工单', value: a.orderId ?? '—' },
  ];
});

/** 前后曲线 option */
const curveOption = computed<ECOption>(() => {
  const metricKey = props.detail.alarm.type === '超温' ? 'temperature' : 'temperature';
  const unit = props.detail.alarm.unit;
  const before = props.detail.before.filter((p) => p.metricKey === metricKey);
  const after = props.detail.after.filter((p) => p.metricKey === metricKey);
  return lineOption(
    [
      ...before.map((p) => formatDateTime(p.time, 'HH:mm')),
      ...after.map((p) => formatDateTime(p.time, 'HH:mm')),
    ],
    [
      { name: `触发前 ${unit}`, value: before.map((p) => p.value) },
      { name: `触发后 ${unit}`, value: [...before.map(() => NaN), ...after.map((p) => p.value)] },
      { name: `阈值`, value: [...before.map(() => props.detail.alarm.threshold), ...after.map(() => props.detail.alarm.threshold)] },
    ],
  );
});
</script>

<style scoped lang="scss">
.alarm-detail {
  &__section {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
}

.section-title {
  margin-bottom: 12px;
  color: var(--color-text-title);
  font-size: 14px;
  font-weight: 600;
}

.curve {
  padding: 8px;
  border-radius: 4px;
  background: var(--color-fill-light);
}
</style>