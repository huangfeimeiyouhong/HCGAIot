<!--
  阈值输入 —— 数值 + 单位 + 范围校验 + 等级选择
-->
<template>
  <div class="hi-threshold">
    <div class="hi-threshold__row">
      <el-input-number
        :model-value="modelValue"
        class="hi-threshold__number"
        :min="min"
        :max="max"
        :step="step"
        :disabled="disabled"
        :controls="false"
        @update:model-value="onUpdate"
      />
      <span class="hi-threshold__unit">{{ unit }}</span>
      <el-select
        :model-value="level"
        class="hi-threshold__level"
        :options="levelOptions"
        :disabled="disabled"
        @update:model-value="(v: any) => emit('update:level', v)"
      />
    </div>
    <p
      v-if="errorText"
      class="hi-threshold__error"
    >
      {{ errorText }}
    </p>
  </div>
</template>

<script setup lang="ts" name="ThresholdInput">
import { computed } from 'vue';

import { CONDITION_LABEL } from '@/constants/dict';

import type { AlarmLevel } from '@/types';

interface Props {
  modelValue: number;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  level: AlarmLevel;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 10000,
  step: 1,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: number];
  'update:level': [value: AlarmLevel];
}>();

const levelOptions = [
  { label: `紧急（${CONDITION_LABEL.GT}）`, value: 'URGENT' },
  { label: `重要（${CONDITION_LABEL.GTE}）`, value: 'IMPORTANT' },
  { label: `一般（${CONDITION_LABEL.GT}）`, value: 'NORMAL' },
];

/** 超范围错误提示 */
const errorText = computed(() => {
  const v = props.modelValue;
  if (v === null || v === undefined || Number.isNaN(v)) return '请输入阈值';
  if (v < props.min) return `阈值不能小于 ${props.min}${props.unit}`;
  if (v > props.max) return `阈值不能大于 ${props.max}${props.unit}`;
  return '';
});

const onUpdate = (val: number | undefined): void => {
  if (val === undefined || val === null) return;
  emit('update:modelValue', val);
};
</script>

<style scoped lang="scss">
.hi-threshold {
  width: 100%;

  &__row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__number {
    width: 120px;
  }

  &__unit {
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  &__level {
    width: 130px;
  }

  &__error {
    margin-top: 4px;
    color: var(--color-danger);
    font-size: 12px;
  }
}
</style>