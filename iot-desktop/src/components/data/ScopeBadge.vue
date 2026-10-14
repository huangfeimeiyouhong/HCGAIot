<!--
  数据范围徽标 —— 让租户隔离在顶栏可见（PRD 3.5）
  文案来自 mock/scope.ts 的 badgeText，页面不可自定义
-->
<template>
  <el-tooltip
    placement="bottom"
    :content="tooltip"
  >
    <span
      class="hi-scope-badge"
      :class="`hi-scope-badge--${tone}`"
    >
      <el-icon><Lock /></el-icon>
      <span class="hi-scope-badge__text">{{ scope.badgeText }}</span>
    </span>
  </el-tooltip>
</template>

<script setup lang="ts" name="ScopeBadge">
import { computed } from 'vue';

import { useScope } from '@/hooks/use-scope';

const scope = useScope();

/** 色调：平台方 warning（提示财务脱敏），厂家 processing，客户 info */
const tone = computed(() => {
  if (scope.value.role === 'PLATFORM') return 'warning';
  if (scope.value.role === 'VENDOR') return 'processing';
  return 'info';
});

/** 悬浮说明 */
const tooltip = computed(() => {
  const s = scope.value;
  if (s.role === 'PLATFORM') return '平台方可查看全局数据，但租户的合同号与结算账号已脱敏为 ***';
  if (s.role === 'VENDOR') return `仅可见本厂家设备（${s.visibleDeviceSns?.size ?? 0} 台）与服务范围内客户（${s.visibleCustomerIds?.size ?? 0} 个）`;
  return `仅可见本租户全部数据（${s.visibleDeviceSns?.size ?? 0} 台设备）`;
});
</script>

<style scoped lang="scss">
.hi-scope-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  border-radius: 13px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: default;

  &--warning {
    background: var(--badge-waiting-bg);
    color: var(--badge-waiting-text);
  }

  &--processing {
    background: var(--badge-processing-bg);
    color: var(--badge-processing-text);
  }

  &--info {
    background: var(--badge-info-bg);
    color: var(--badge-info-text);
  }

  &__text {
    @include ellipsis(1);
  }
}
</style>