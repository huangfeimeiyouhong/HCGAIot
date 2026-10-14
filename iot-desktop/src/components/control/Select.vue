<!--
  下拉选择 —— 逻辑从 iot-cockpit select 100% 保留，SCSS 与 popper 全改浅色
-->
<template>
  <div class="hi-select">
    <span
      v-if="label"
      class="hi-select__label"
    >{{ label }}</span>
    <el-select
      :model-value="modelValue"
      class="hi-select__inner"
      :placeholder="placeholder"
      :clearable="clearable"
      :filterable="filterable"
      :disabled="disabled"
      :multiple="multiple"
      :popper-class="`hi-select-popper ${popperClass}`"
      v-bind="$attrs"
      @update:model-value="onUpdate"
      @change="onChange"
    >
      <el-option
        v-for="item in options"
        :key="String(item[valueKey])"
        :label="item[labelKey]"
        :value="item[valueKey]"
        :disabled="item.disabled"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts" name="HiSelect">
/** 下拉项结构 */
export interface HiSelectOption {
  /** 显示文案 */
  label?: string | number;
  /** 选项值 */
  value?: string | number | boolean;
  /** 是否禁用 */
  disabled?: boolean;
  [key: string]: unknown;
}

interface Props {
  /** 绑定的值（多选为数组） */
  modelValue?: string | number | boolean | Array<string | number | boolean> | null;
  /** 前置标签 */
  label?: string;
  /** 选项列表 */
  options?: HiSelectOption[];
  /** 占位文案 */
  placeholder?: string;
  /** 是否可清空 */
  clearable?: boolean;
  /** 是否可搜索 */
  filterable?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否多选 */
  multiple?: boolean;
  /** 选项文案字段名 */
  labelKey?: string;
  /** 选项值字段名 */
  valueKey?: string;
  /** 附加的下拉面板类名 */
  popperClass?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: '',
  options: () => [],
  placeholder: '全部',
  clearable: true,
  filterable: false,
  disabled: false,
  multiple: false,
  labelKey: 'label',
  valueKey: 'value',
  popperClass: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: Props['modelValue']];
  change: [value: Props['modelValue']];
}>();

const onUpdate = (val: Props['modelValue']): void => emit('update:modelValue', val);
const onChange = (val: Props['modelValue']): void => emit('change', val);
</script>

<style scoped lang="scss">
.hi-select {
  display: inline-flex;
  align-items: center;

  &__label {
    flex-shrink: 0;
    margin-right: 8px;
    color: var(--color-text-body);
    font-size: 13px;
    white-space: nowrap;
  }

  &__inner {
    min-width: 160px;
  }
}
</style>

<style lang="scss">
// 下拉面板挂在 body 下，需非 scoped 样式
.hi-select-popper.el-select__popper {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);

  .el-select-dropdown__item {
    color: var(--color-text-body);
    font-size: 13px;

    &:hover,
    &.is-hovering {
      background: var(--color-fill-light);
    }

    &.is-selected {
      color: var(--color-primary-text);
      font-weight: 600;
    }

    &.is-disabled {
      color: var(--color-text-disabled);
    }
  }

  .el-select-dropdown__empty {
    color: var(--color-text-secondary);
  }
}
</style>