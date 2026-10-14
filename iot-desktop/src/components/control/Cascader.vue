<!--
  级联选择 —— 逻辑从 iot-cockpit cascader 100% 保留，SCSS 与面板全改浅色
-->
<template>
  <div class="hi-cascader">
    <span
      v-if="label"
      class="hi-cascader__label"
    >{{ label }}</span>
    <el-cascader
      :model-value="modelValue"
      class="hi-cascader__inner"
      :options="options"
      :placeholder="placeholder"
      :clearable="clearable"
      :filterable="filterable"
      :disabled="disabled"
      :multiple="multiple"
      :check-strictly="checkStrictly"
      :emit-path="emitPath"
      :props="cascaderProps"
      :popper-class="`hi-cascader-popper ${popperClass}`"
      v-bind="$attrs"
      @update:model-value="onUpdate"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts" name="HiCascader">
import { computed } from 'vue';

/** 级联项结构 */
export interface HiCascaderOption {
  label?: string | number;
  value?: string | number;
  disabled?: boolean;
  children?: HiCascaderOption[];
  [key: string]: unknown;
}

interface Props {
  modelValue?: string | number | Array<string | number> | null;
  label?: string;
  options?: HiCascaderOption[];
  placeholder?: string;
  clearable?: boolean;
  filterable?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  /** 允许选择任意层级 */
  checkStrictly?: boolean;
  /** 是否返回完整路径数组 */
  emitPath?: boolean;
  labelKey?: string;
  valueKey?: string;
  childrenKey?: string;
  popperClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: '',
  options: () => [],
  placeholder: '全部',
  clearable: true,
  filterable: false,
  disabled: false,
  multiple: false,
  checkStrictly: false,
  emitPath: true,
  labelKey: 'label',
  valueKey: 'value',
  childrenKey: 'children',
  popperClass: '',
});

const cascaderProps = computed(() => ({
  label: props.labelKey,
  value: props.valueKey,
  children: props.childrenKey,
  multiple: props.multiple,
  checkStrictly: props.checkStrictly,
  emitPath: props.emitPath,
}));

const emit = defineEmits<{
  'update:modelValue': [value: Props['modelValue']];
  change: [value: Props['modelValue']];
}>();

const onUpdate = (val: Props['modelValue']): void => emit('update:modelValue', val);
const onChange = (val: Props['modelValue']): void => emit('change', val);
</script>

<style scoped lang="scss">
.hi-cascader {
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
    min-width: 180px;
  }
}
</style>

<style lang="scss">
// 级联面板挂在 body 下，需非 scoped 样式
.hi-cascader-popper.el-cascader__dropdown {
  --el-cascader-menu-fill: #FFFFFF;
  --el-cascader-menu-text-color: var(--color-text-body);
  --el-cascader-menu-selected-text-color: var(--color-primary-text);
  --el-cascader-node-background-hover: var(--color-primary-bg);
  --el-cascader-node-color-disabled: var(--color-text-disabled);
  --el-cascader-color-empty: var(--color-text-secondary);
  --el-cascader-tag-background: var(--color-primary-bg);

  background: var(--color-bg-container);
  border: 1px solid var(--color-border);

  .el-popper__arrow::before {
    background: var(--color-bg-container);
    border-color: var(--color-border);
  }

  .el-cascader-menu {
    color: var(--color-text-body);
    border-right: 1px solid var(--color-border-light);
  }

  .el-cascader-node {
    color: var(--color-text-body);
    font-size: 13px;

    &:hover,
    &.is-hovering,
    &:focus {
      background: var(--color-primary-bg);
      color: var(--color-text-title);
    }

    &.is-active,
    &.in-active-path {
      color: var(--color-primary-text);
      font-weight: 600;
    }

    &.is-disabled {
      color: var(--color-text-disabled);
    }
  }
}
</style>