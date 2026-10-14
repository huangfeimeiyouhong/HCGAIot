<!--
  KPI 卡 —— label + 数值 + 单位 + 环比箭头 + 可点击跳模块
-->
<template>
  <div
    class="hi-stat-card"
    :class="{ 'hi-stat-card--clickable': clickable && data.to }"
    @click="onClick"
  >
    <div class="hi-stat-card__label">
      <span class="hi-stat-card__label-text">{{ data.label }}</span>
      <el-icon
        v-if="clickable && data.to"
        class="hi-stat-card__arrow"
      >
        <ArrowRight />
      </el-icon>
    </div>
    <div class="hi-stat-card__value-row">
      <span
        class="hi-stat-card__value"
        :class="toneClass"
      >
        <span
          v-thousand="displayValue"
          class="hi-stat-card__number"
        />
        <span
          v-if="data.unit"
          class="hi-stat-card__unit"
        >{{ data.unit }}</span>
      </span>
      <span
        v-if="data.trend !== undefined"
        class="hi-stat-card__trend"
        :class="data.trend >= 0 ? 'is-up' : 'is-down'"
      >
        <el-icon>
          <CaretTop v-if="data.trend >= 0" />
          <CaretBottom v-else />
        </el-icon>
        {{ Math.abs(data.trend).toFixed(1) }}%
      </span>
    </div>
  </div>
</template>

<script setup lang="ts" name="StatCard">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { formatThousand } from '@/utils/format';

import type { StatCardData } from '@/types';

interface Props {
  data: StatCardData;
  /** 是否可点击跳转 */
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  clickable: true,
});

const router = useRouter();

/** 数值展示：非数字（如 '—'）直接显示 */
const displayValue = computed(() => {
  const v = props.data.value;
  return typeof v === 'number' ? formatThousand(v) : v;
});

/** 语义色 class */
const toneClass = computed(() => {
  const map: Record<string, string> = {
    primary: 'is-primary',
    success: 'is-success',
    warning: 'is-warning',
    danger: 'is-danger',
    info: 'is-info',
    purple: 'is-purple',
  };
  return map[props.data.tone ?? ''] ?? '';
});

const onClick = (): void => {
  if (props.clickable && props.data.to) void router.push(props.data.to);
};
</script>

<style scoped lang="scss">
.hi-stat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);
  transition: box-shadow 0.2s ease, transform 0.2s ease;

  &--clickable {
    cursor: pointer;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
      transform: translateY(-1px);
    }
  }

  &__label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__label-text {
    color: var(--color-text-secondary);
    font-size: 13px;
    @include ellipsis(1);
  }

  &__arrow {
    flex-shrink: 0;
    color: var(--color-text-disabled);
    font-size: 13px;
  }

  &__value-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  &__value {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    color: var(--color-text-title);

    &.is-primary  { color: var(--color-primary-text); }
    &.is-success  { color: var(--color-success); }
    &.is-warning  { color: var(--color-warning); }
    &.is-danger   { color: var(--color-danger); }
    &.is-purple   { color: var(--color-purple); }
  }

  &__number {
    font-size: 26px;
    font-weight: 600;
    line-height: 1.2;
  }

  &__unit {
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  &__trend {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 500;

    &.is-up {
      color: var(--color-success);
    }

    &.is-down {
      color: var(--color-danger);
    }
  }
}
</style>