<!--
  告警详情抽屉内容 —— 告警信息 + 关联信息 + 状态流转按钮
  ★ 按钮组由 ALARM_MACHINE 驱动（平台角色）
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
      v-if="alarm.componentSn"
      class="alarm-detail__section"
    >
      <h4 class="section-title">
        关联部件
      </h4>
      <p class="component-text">
        {{ alarm.componentSn }}（物联网厂家可见完整部件档案）
      </p>
    </section>

    <section
      v-if="alarm.orderId"
      class="alarm-detail__section"
    >
      <h4 class="section-title">
        关联工单
      </h4>
      <el-link
        type="primary"
        @click="router.push('/platform/work-orders')"
      >
        {{ alarm.orderId }}
      </el-link>
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
  </div>
</template>

<script setup lang="ts" name="PlatformAlarmDetailDrawer">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import DescList from '@/components/data/DescList.vue';

import { actionsOf } from '@/constants/stateMachine';
import { formatDateTime } from '@/utils/date';

import type { Alarm } from '@/types';

interface Props {
  alarm: Alarm;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  transition: [action: 'confirm' | 'process' | 'recover'];
}>();

const router = useRouter();

const actions = computed(() => actionsOf('ALARM', props.alarm.status, 'PLATFORM'));

const items = computed(() => {
  const a = props.alarm;
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
    { label: '责任厂家', value: a.vendorId },
    {
      label: '触发来源',
      value: a.byCustomerThreshold ? '客户自定义阈值（不计入厂家 SLA 考核）' : a.source,
    },
    { label: '关联部件', value: a.componentSn ?? '—' },
  ];
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
    gap: 10px;
  }
}

.section-title {
  margin-bottom: 12px;
  color: var(--color-text-title);
  font-size: 14px;
  font-weight: 600;
}

.component-text {
  color: var(--color-text-body);
  font-size: 13px;
}
</style>