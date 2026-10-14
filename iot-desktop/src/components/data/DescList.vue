<!--
  详情描述列表 —— label: value 栅格
  思路来自 iot-cockpit name-value-item，去掉业务耦合后重写
-->
<template>
  <dl
    class="hi-desc-list"
    :style="gridStyle"
  >
    <div
      v-for="item in items"
      :key="item.label"
      class="hi-desc-list__item"
      :style="{ gridColumn: `span ${item.span ?? 1}` }"
    >
      <dt class="hi-desc-list__label">
        {{ item.label }}
      </dt>
      <dd class="hi-desc-list__value">
        <slot
          :name="item.label"
          :item="item"
        >
          {{ item.value ?? '-' }}
        </slot>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts" name="DescList">
import { computed } from 'vue';

interface DescItem {
  label: string;
  value?: string | number | null;
  /** 跨列数（默认 1） */
  span?: number;
}

interface Props {
  items: DescItem[];
  /** 栅格列数 */
  columns?: number;
}

const props = withDefaults(defineProps<Props>(), {
  columns: 2,
});

/** 栅格列数（inline style 驱动，支持响应式覆写） */
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
}));
</script>

<style scoped lang="scss">
.hi-desc-list {
  display: grid;
  gap: 12px 24px;
  margin: 0;

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
  }

  &__label {
    flex-shrink: 0;
    width: 96px;
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 22px;
  }

  &__value {
    flex: 1;
    min-width: 0;
    margin: 0;
    color: var(--color-text-title);
    font-size: 13px;
    line-height: 22px;
    word-break: break-all;
  }
}
</style>