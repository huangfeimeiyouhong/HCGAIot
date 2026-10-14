<!--
  树形选择 —— 逻辑从 iot-cockpit tree-select 100% 保留，SCSS 与面板全改浅色
-->
<template>
  <div class="hi-tree-select">
    <span
      v-if="label"
      class="hi-tree-select__label"
    >{{ label }}</span>
    <el-tree-select
      :model-value="modelValue"
      class="hi-tree-select__inner"
      :popper-class="`hi-tree-select-popper ${popperClass}`"
      :data="data"
      :node-key="nodeKey"
      :props="treeProps"
      :placeholder="placeholder"
      :clearable="clearable"
      :filterable="filterable"
      :disabled="disabled"
      :multiple="multiple"
      :show-checkbox="showCheckbox"
      :check-on-click-node="checkOnClickNode"
      :collapse-tags="collapseTags"
      :max-collapse-tags="maxCollapseTags"
      :render-after-expand="false"
      v-bind="$attrs"
      @update:model-value="onUpdate"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts" name="HiTreeSelect">
import { computed } from 'vue';

/** 树节点结构 */
export interface HiTreeNode {
  label?: string | number;
  value?: string | number;
  disabled?: boolean;
  children?: HiTreeNode[];
  [key: string]: unknown;
}

interface Props {
  modelValue?: string | number | Array<string | number> | null;
  label?: string;
  data?: HiTreeNode[];
  placeholder?: string;
  clearable?: boolean;
  filterable?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  showCheckbox?: boolean;
  checkOnClickNode?: boolean;
  collapseTags?: boolean;
  maxCollapseTags?: number;
  nodeKey?: string;
  labelKey?: string;
  childrenKey?: string;
  popperClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: '',
  data: () => [],
  placeholder: '全部',
  clearable: true,
  filterable: false,
  disabled: false,
  multiple: false,
  showCheckbox: false,
  checkOnClickNode: false,
  collapseTags: false,
  maxCollapseTags: 1,
  nodeKey: 'value',
  labelKey: 'label',
  childrenKey: 'children',
  popperClass: '',
});

const treeProps = computed(() => ({
  label: props.labelKey,
  children: props.childrenKey,
}));

const emit = defineEmits<{
  'update:modelValue': [value: Props['modelValue']];
  change: [value: Props['modelValue']];
}>();

const onUpdate = (val: Props['modelValue']): void => emit('update:modelValue', val);
const onChange = (val: Props['modelValue']): void => emit('change', val);
</script>

<style scoped lang="scss">
.hi-tree-select {
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
    flex: 1;
    min-width: 180px;
  }
}
</style>

<style lang="scss">
// 树选择面板挂在 body 下，需非 scoped 样式
.hi-tree-select-popper.el-popper {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);

  .el-popper__arrow::before {
    background: var(--color-bg-container);
    border-color: var(--color-border);
  }

  .el-tree {
    background: transparent;
    color: var(--color-text-body);
    --el-tree-node-hover-bg-color: var(--color-primary-bg);

    .el-tree-node__content {
      height: 32px;
      color: var(--color-text-body);

      &:hover {
        background: var(--color-primary-bg);
      }
    }
  }

  .el-select-dropdown__item {
    height: 32px;
    line-height: 32px;
    font-size: 13px;
    color: var(--color-text-body);

    &.hover,
    &:hover {
      background: var(--color-primary-bg);
    }

    &.selected {
      color: var(--color-primary-text);
      font-weight: 600;
    }
  }

  .el-tree__empty-text {
    color: var(--color-text-secondary);
  }
}
</style>