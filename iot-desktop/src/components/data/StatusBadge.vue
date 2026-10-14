<!--
  统一状态徽标 —— 全项目唯一的状态视觉出口
  ⚠️ 内部查 constants/statusMap.ts → { label, tone } → 令牌色
     页面禁止传色值，状态变化只需改 statusMap 一处
-->
<template>
  <span
    class="hi-badge"
    :class="[`hi-badge--${resolvedTone}`, `hi-badge--${size}`]"
  >
    <slot>{{ resolvedLabel }}</slot>
  </span>
</template>

<script setup lang="ts" name="StatusBadge">
import { computed } from 'vue';

import { labelOf, toneOf } from '@/constants/statusMap';

import type { StatusTone } from '@/types';

interface Props {
  /** 状态码（直接传实体 status 字段）；纯展示徽标可只传 label + tone */
  status?: string;
  /** 徽标尺寸 */
  size?: 'small' | 'default';
  /** 自定义文案（不传则查 statusMap） */
  label?: string;
  /** 自定义色调（不传则查 statusMap） */
  tone?: StatusTone;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  label: '',
  tone: undefined,
});

const resolvedLabel = computed(() => props.label || (props.status ? labelOf(props.status) : ''));
const resolvedTone = computed<StatusTone>(() => props.tone ?? (props.status ? toneOf(props.status) : 'closed'));
</script>

<style scoped lang="scss">
.hi-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 18px;
  white-space: nowrap;

  &--small {
    padding: 0 6px;
    font-size: 11px;
    line-height: 16px;
  }

  // 9 组徽标矩阵（对应 variables.scss 的 18 个 --badge-* 变量）
  &--waiting    { background: var(--badge-waiting-bg);    color: var(--badge-waiting-text); }
  &--trial      { background: var(--badge-trial-bg);      color: var(--badge-trial-text); }
  &--success    { background: var(--badge-success-bg);    color: var(--badge-success-text); }
  &--processing { background: var(--badge-processing-bg); color: var(--badge-processing-text); }
  &--confirm    { background: var(--badge-confirm-bg);    color: var(--badge-confirm-text); }
  &--closed     { background: var(--badge-closed-bg);     color: var(--badge-closed-text); }
  &--reject     { background: var(--badge-reject-bg);     color: var(--badge-reject-text); }
  &--info       { background: var(--badge-info-bg);       color: var(--badge-info-text); }
  &--notice     { background: var(--badge-notice-bg);     color: var(--badge-notice-text); }
}
</style>