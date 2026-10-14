<template>
  <div class="header-tab">
    <div
      v-for="item in options"
      :key="item.value"
      class="header-tab__item"
      :class="{ 'header-tab__item--active': item.value === modelValue }"
      @click="handleSelect(item.value)"
    >
      <span class="header-tab__label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" name="HeaderTab">
export interface HeaderTabOption {
  value: string;
  label: string;
}

interface Props {
  /** 当前选中值 */
  modelValue?: string;
  /** tab 选项 */
  options?: HeaderTabOption[];
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  options: () => [],
});

const emit = defineEmits(['update:modelValue', 'change']);

const handleSelect = (value: string) => {
  emit('update:modelValue', value);
  emit('change', value);
};
</script>

<style lang="scss" scoped>
.header-tab {
  display: inline-flex;

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: 0 6px;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    user-select: none;
    box-sizing: border-box;

    & + & {
      margin-left: -1px;
    }

    .header-tab__label {
      text-shadow: 0 2px 3px rgba(0, 0, 0, 0.37);
    }

    &:hover {
      background: rgba(0, 0, 0, 0.12);
    }
  }

  &__item--active {
    position: relative;
    z-index: 1;
    background: rgba(70, 177, 211, 0.16);
    border-color: rgba(255, 255, 255, 0.6);
    cursor: default;

    .header-tab__label {
      text-shadow: 0 4px 7px rgba(0, 0, 0, 0.56);
    }

    &:hover {
      background: rgba(70, 177, 211, 0.16);
    }
  }

  &__label {
    font-family: var(--cockpit-title-font, sans-serif);
    font-size: 12px;
    font-weight: 400;
    line-height: 1;
    color: #ffffff;
    pointer-events: none;
    white-space: nowrap;
  }
}
</style>
