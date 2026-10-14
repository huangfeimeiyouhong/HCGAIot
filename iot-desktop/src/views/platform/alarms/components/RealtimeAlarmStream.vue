<!--
  实时告警流 —— hover 暂停滚动
-->
<template>
  <div
    class="realtime-stream"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <TransitionGroup
      name="stream"
      tag="div"
      class="realtime-stream__list"
    >
      <div
        v-for="alarm in alarms"
        :key="alarm.id"
        class="stream-item"
        :class="`stream-item--${levelClass(alarm.level)}`"
        @click="emit('select', alarm)"
      >
        <span class="stream-item__time">{{ timeOf(alarm.triggerTime) }}</span>
        <StatusBadge
          :status="alarm.level"
          size="small"
        />
        <span class="stream-item__sn">{{ alarm.deviceSn }}</span>
        <span class="stream-item__type">{{ alarm.type }}</span>
        <span class="stream-item__value">{{ alarm.actualValue }} {{ alarm.unit }}</span>
        <StatusBadge
          :status="alarm.status"
          size="small"
        />
      </div>
    </TransitionGroup>
    <p
      v-if="!alarms.length"
      class="realtime-stream__empty"
    >
      暂无实时告警
    </p>
  </div>
</template>

<script setup lang="ts" name="RealtimeAlarmStream">
import { ref } from 'vue';

import StatusBadge from '@/components/data/StatusBadge.vue';

import { formatDateTime } from '@/utils/date';

import type { Alarm, AlarmLevel } from '@/types';

interface Props {
  alarms: Alarm[];
}

defineProps<Props>();

const emit = defineEmits<{
  /** 点击某条告警 */
  select: [alarm: Alarm];
}>();

/** 悬浮暂停（视觉上停止动画，避免阅读时内容移动） */
const paused = ref(false);

/** 等级 → class 后缀（urgent 红 / important 橙 / normal 蓝） */
const levelClass = (level: AlarmLevel): string =>
  level === 'URGENT' ? 'urgent' : level === 'IMPORTANT' ? 'important' : 'normal';

/** 时间（只取 HH:mm） */
const timeOf = (iso: string): string => formatDateTime(iso, 'HH:mm');
</script>

<style scoped lang="scss">
.realtime-stream {
  max-height: 240px;
  overflow-y: auto;
  @include thin-scrollbar;

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__empty {
    padding: 16px;
    color: var(--color-text-secondary);
    font-size: 13px;
    text-align: center;
  }
}

.stream-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-left: 3px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-fill-light);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: var(--color-primary-bg);
  }

  &--urgent {
    border-left-color: var(--color-danger);
  }

  &--important {
    border-left-color: var(--color-warning);
  }

  &--normal {
    border-left-color: var(--color-info);
  }

  &__time {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__sn {
    color: var(--color-text-title);
    font-weight: 500;
  }

  &__type {
    color: var(--color-text-body);
  }

  &__value {
    margin-left: auto;
    color: var(--color-text-secondary);
    font-size: 12px;
  }
}

// 新告警从顶部滑入
.stream-enter-active {
  transition: all 0.3s ease;
}

.stream-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
</style>