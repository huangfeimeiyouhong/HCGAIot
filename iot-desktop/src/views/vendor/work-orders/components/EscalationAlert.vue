<!--
  SLA 升级提示 —— 三级升级文案
-->
<template>
  <el-alert
    v-if="level > 0"
    class="escalation-alert"
    :type="level >= 2 ? 'error' : 'warning'"
    :closable="false"
    :title="alertTitle"
    :description="description"
    show-icon
  />
</template>

<script setup lang="ts" name="EscalationAlert">
import { computed } from 'vue';

import { ESCALATION_TEXT } from '@/constants/sla';

import type { Countdown } from '@/types';

interface Props {
  level: number;
  countdown?: Countdown;
}

const props = defineProps<Props>();

const alertTitle = computed(() => {
  if (props.level >= 3) return '三级升级：平台已介入并标记争议';
  if (props.level === 2) return '二级催办：SLA 时限已超时';
  return '一级提醒：SLA 时限已消耗 80%';
});

const description = computed(() => {
  const base = ESCALATION_TEXT[props.level] ?? '';
  const cd = props.countdown;
  return cd ? `${base}（${cd.text}）` : base;
});
</script>

<style scoped lang="scss">
.escalation-alert {
  margin-bottom: var(--layout-card-gap);
}
</style>