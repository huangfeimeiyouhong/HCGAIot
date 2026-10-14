<!--
  通用下拉框选择组件（暗色科技风）
  封装 el-select，支持前置标签（如"省域公司"）、选项搜索、清空
  使用示例：
    <HiSelect v-model="company" label="省域公司" :options="companyOptions" placeholder="全部省域公司" />
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
export interface HiSelectOption {
  /** 显示文案（默认取 label 字段，可用 labelKey 覆盖） */
  label?: string | number;
  /** 选项值（默认取 value 字段，可用 valueKey 覆盖） */
  value?: string | number | boolean;
  /** 是否禁用 */
  disabled?: boolean;
  [key: string]: unknown;
}

interface Props {
  /** 绑定的值（单选为 value，多选为 value 数组） */
  modelValue?: string | number | boolean | Array<string | number | boolean> | null;
  /** 前置标签，如"省域公司" */
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

const onUpdate = (val: Props['modelValue']) => {
  emit('update:modelValue', val);
};

const onChange = (val: Props['modelValue']) => {
  emit('change', val);
};
</script>

<style lang="scss" scoped>
.hi-select {
  display: inline-flex;
  align-items: center;

  &__label {
    flex-shrink: 0;
    margin-right: 12px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
  }

  &__inner {
    min-width: 180px;

    // 全局样式 src/styles/index.scss 里 .el-select .el-select__wrapper 用 !important
    // 设了亮边 + 内发光，这里必须 !important 才能压回去，与 HiCascader 触发器保持一致
    :deep(.el-select__wrapper) {
      min-height: 36px;
      background: rgba(3, 20, 45, 0.6);
      border: 1px solid rgba(15, 184, 255, 0.5) !important;
      border-radius: 4px;
      box-shadow: none !important;
      font-size: 16px;

      &:hover {
        border-color: rgba(15, 184, 255, 0.88) !important;
      }

      &.is-focused {
        border-color: rgba(15, 184, 255, 0.88) !important;
        box-shadow: 0 0 8px rgba(15, 184, 255, 0.25) !important;
      }
    }

    :deep(.el-select__selected-item) {
      color: #e8f7ff;
    }

    // 选中值：亮色；placeholder（is-transparent）：弱化色，两者区分
    :deep(.el-select__placeholder) {
      color: #e8f7ff;
      font-size: 16px;

      &.is-transparent {
        color: rgba(232, 247, 255, 0.45);
      }
    }

    :deep(.el-select__caret) {
      color: rgba(15, 184, 255, 0.88);
    }

    :deep(.el-select__clear) {
      color: rgba(15, 184, 255, 0.88);

      &:hover {
        color: #fff;
      }
    }
  }
}
</style>

<style lang="scss">
// 下拉面板挂在 body 下，需非 scoped 样式
.hi-select-popper.el-select__popper {
  background: rgba(3, 20, 45, 0.98);
  border: 1px solid rgba(15, 184, 255, 0.5);

  .el-popper__arrow::before {
    background: rgba(3, 20, 45, 0.98);
    border-color: rgba(15, 184, 255, 0.5);
  }

  .el-select-dropdown__item {
    color: #e8f7ff;
    font-size: 16px;

    &:hover,
    &.is-hovering {
      background: rgba(24, 144, 255, 0.15);
    }

    &.is-selected {
      color: #0fb8ff;
      font-weight: 600;
      background: rgba(24, 144, 255, 0.1);
    }

    &.is-disabled {
      color: rgba(232, 247, 255, 0.3);
    }
  }

  .el-select-dropdown__empty {
    color: rgba(232, 247, 255, 0.45);
  }
}
</style>
