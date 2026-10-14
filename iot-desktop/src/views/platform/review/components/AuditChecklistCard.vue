<!--
  审核检查卡 —— 四个维度之一，展示该维度的检查项与结论
-->
<template>
  <section class="checklist-card">
    <header class="checklist-card__header">
      <h4 class="checklist-card__title">
        {{ title }}
      </h4>
      <span
        class="checklist-card__summary"
        :class="summaryClass"
      >{{ passedCount }}/{{ items.length }} 通过</span>
    </header>

    <ul v-if="items.length" class="checklist-card__list">
      <li
        v-for="item in items"
        :key="item.key"
        class="checklist-card__item"
      >
        <el-icon
          class="checklist-card__icon"
          :class="item.passed ? 'is-pass' : 'is-fail'"
        >
          <SuccessFilled v-if="item.passed" />
          <CircleCloseFilled v-else />
        </el-icon>
        <span class="checklist-card__label">{{ item.label }}</span>
      </li>
    </ul>
    <p
      v-else
      class="checklist-card__empty"
    >
      暂无该维度检查项
    </p>
  </section>
</template>

<script setup lang="ts" name="AuditChecklistCard">
import { computed } from 'vue';

import type { AuditChecklistItem } from '@/api/platform';

interface Props {
  title: string;
  items: AuditChecklistItem[];
}

const props = defineProps<Props>();

const passedCount = computed(() => props.items.filter((i) => i.passed).length);

const summaryClass = computed(() =>
  passedCount.value === props.items.length && props.items.length ? 'is-pass' : 'is-fail',
);
</script>

<style scoped lang="scss">
.checklist-card {
  padding: 16px;
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }

  &__title {
    color: var(--color-text-title);
    font-size: 14px;
    font-weight: 600;
  }

  &__summary {
    font-size: 12px;
    font-weight: 500;

    &.is-pass {
      color: var(--color-success);
    }

    &.is-fail {
      color: var(--color-warning);
    }
  }

  &__list {
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 5px 0;
  }

  &__icon {
    margin-top: 2px;
    flex-shrink: 0;
    font-size: 14px;

    &.is-pass {
      color: var(--color-success);
    }

    &.is-fail {
      color: var(--color-warning);
    }
  }

  &__label {
    color: var(--color-text-body);
    font-size: 13px;
    line-height: 1.5;
  }

  &__empty {
    color: var(--color-text-secondary);
    font-size: 12px;
  }
}
</style>