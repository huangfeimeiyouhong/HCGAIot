<!--
  SLA 倒计时 —— 每 60s 刷新（不做每秒跳动，避免视觉噪音，见假设 A-4）
-->
<template>
  <div class="sla-countdown">
    <span
      class="sla-countdown__text"
      :class="toneClass"
    >
      <el-icon><Timer /></el-icon>
      {{ countdown.text }}
    </span>
    <el-tag
      v-if="level > 0"
      :type="level >= 2 ? 'danger' : 'warning'"
      size="small"
      effect="plain"
    >
      SLA {{ level }} 级升级
    </el-tag>
  </div>
</template>

<script setup lang="ts" name="SlaCountdown">
import { computed, onBeforeUnmount, ref } from 'vue';

import { formatCountdown } from '@/utils/date';

import type { Countdown } from '@/types';

interface Props {
  deadlineAt: string;
  level?: number;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
});

/** 当前倒计时（每 60s 刷新一次） */
const countdown = ref<Countdown>(formatCountdown(props.deadlineAt));

let timer: number | null = null;
const refresh = (): void => {
  countdown.value = formatCountdown(props.deadlineAt);
};

timer = window.setInterval(refresh, 60_000);

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer);
});

const toneClass = computed(() => {
  if (props.level >= 2) return 'is-danger';
  if (props.level === 1 || countdown.value.isTimeout) return 'is-warning';
  return 'is-normal';
});
</script>

<style scoped lang="scss">
.sla-countdown {
  display: flex;
  align-items: center;
  gap: 8px;

  &__text {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;

    &.is-normal {
      color: var(--color-text-body);
    }

    &.is-warning {
      color: var(--color-warning);
    }

    &.is-danger {
      color: var(--color-danger);
    }
  }
}
</style>