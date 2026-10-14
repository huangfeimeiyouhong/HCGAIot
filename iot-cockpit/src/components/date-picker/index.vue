<!--
  通用日期选择组件（暗色科技风）
  封装 el-date-picker，支持前置标签（如"起始日期"）、单日期 / 日期范围选择
  使用示例：
    <HiDatePicker
      v-model="range"
      label="起始日期"
      type="daterange"
      value-format="YYYY-MM-DD"
    />
  value-format / unlink-panels / range-separator / shortcuts 等未列属性经 $attrs 透传
-->
<template>
  <div class="hi-date-picker">
    <span
      v-if="label"
      class="hi-date-picker__label"
    >{{ label }}</span>
    <el-date-picker
      :model-value="modelValue"
      class="hi-date-picker__inner"
      :popper-class="`hi-date-picker-popper ${popperClass}`"
      :type="type"
      :placeholder="placeholder"
      :start-placeholder="startPlaceholder"
      :end-placeholder="endPlaceholder"
      :clearable="clearable"
      :disabled="disabled"
      v-bind="$attrs"
      @update:model-value="onUpdate"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts" name="HiDatePicker">
interface Props {
  /** 绑定的值（单日期为值，范围为 [start, end] 二元组） */
  modelValue?: string | number | Date | Array<string | number | Date> | null;
  /** 前置标签，如"起始日期" */
  label?: string;
  /** 选择类型（date/daterange/datetimerange 等） */
  type?: string;
  /** 非范围型占位文案 */
  placeholder?: string;
  /** 范围型开始占位文案 */
  startPlaceholder?: string;
  /** 范围型结束占位文案 */
  endPlaceholder?: string;
  /** 是否可清空 */
  clearable?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 附加的面板类名 */
  popperClass?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: '',
  type: 'daterange',
  placeholder: '选择日期',
  startPlaceholder: '开始日期',
  endPlaceholder: '结束日期',
  clearable: true,
  disabled: false,
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
.hi-date-picker {
  display: inline-flex;
  align-items: center;

  &__label {
    flex-shrink: 0;
    margin-right: 12px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
  }
}
</style>

<style lang="scss">
// 触发器：非 scoped + .hi-date-picker 范围限定（面板挂 body，样式与页面 scoped 无关）
// 范围型（daterange 等）根节点即 .el-date-editor，直接命中
.hi-date-picker .el-date-editor {
  width: 260px;
  height: 36px;
  background: rgba(3, 20, 45, 0.6);
  border: 1px solid rgba(15, 184, 255, 0.5);
  border-radius: 4px;
  box-shadow: none;

  &:hover {
    border-color: rgba(15, 184, 255, 0.88);
  }

  &.is-active {
    border-color: rgba(15, 184, 255, 0.88);
    box-shadow: 0 0 8px rgba(15, 184, 255, 0.25);
  }

  .el-range-input {
    background: transparent;
    color: #e8f7ff;
    font-size: 14px;

    &::placeholder {
      color: rgba(232, 247, 255, 0.45);
    }
  }

  .el-range-separator {
    color: #e8f7ff;
  }

  .el-range__icon,
  .el-range__close-icon {
    color: rgba(15, 184, 255, 0.88);
  }
}

// 单日期型（date 等）触发器走 el-input wrapper，须 !important 压全局亮边（与 HiCascader 同法）
.hi-date-picker .el-input__wrapper {
  min-height: 36px !important;
  background: rgba(3, 20, 45, 0.6) !important;
  border: 1px solid rgba(15, 184, 255, 0.5) !important;
  border-radius: 4px !important;
  box-shadow: none !important;
  font-size: 16px !important;

  &:hover {
    border-color: rgba(15, 184, 255, 0.88) !important;
  }

  &.is-focus {
    border-color: rgba(15, 184, 255, 0.88) !important;
    box-shadow: 0 0 8px rgba(15, 184, 255, 0.25) !important;
  }

  .el-input__inner {
    color: #e8f7ff !important;
    font-size: 16px !important;
  }

  .el-input__prefix,
  .el-input__suffix {
    color: rgba(15, 184, 255, 0.88) !important;
  }
}
</style>

<style lang="scss">
// 日历面板挂在 body 下，需非 scoped 样式
.hi-date-picker-popper.el-picker__popper {
  background: rgba(3, 20, 45, 0.98);
  border: 1px solid rgba(15, 184, 255, 0.5);

  .el-popper__arrow::before {
    background: rgba(3, 20, 45, 0.98);
    border-color: rgba(15, 184, 255, 0.5);
  }

  .el-date-range-picker,
  .el-date-picker {
    background: transparent;
  }

  .el-date-range-picker__header,
  .el-date-picker__header-label {
    color: #e8f7ff;
  }

  .el-picker-panel__icon-btn {
    color: rgba(232, 247, 255, 0.65);

    &:hover {
      color: #0fb8ff;
    }
  }

  .el-date-table th {
    color: rgba(232, 247, 255, 0.55);
    border-bottom: 1px solid rgba(109, 134, 197, 0.22);
  }

  .el-date-table td {
    .el-date-table-cell {
      color: #e8f7ff;
    }

    &.available:hover .el-date-table-cell {
      color: #0fb8ff;
    }

    &.prev-month .el-date-table-cell,
    &.next-month .el-date-table-cell {
      color: rgba(232, 247, 255, 0.3);
    }

    &.in-range .el-date-table-cell {
      background-color: rgba(24, 144, 255, 0.12);
    }

    &.start-date .el-date-table-cell__text,
    &.end-date .el-date-table-cell__text,
    &.current .el-date-table-cell__text {
      background-color: #0fb8ff;
      color: #03142d;
    }

    &.disabled .el-date-table-cell {
      background: none;
      color: rgba(232, 247, 255, 0.2);
    }
  }

  .el-picker-panel__footer {
    background: transparent;

    .el-button {
      background: transparent;
      border-color: rgba(15, 184, 255, 0.5);
      color: #0fb8ff;

      &:hover {
        background: rgba(24, 144, 255, 0.12);
        border-color: rgba(15, 184, 255, 0.88);
        color: #0fb8ff;
      }
    }

    .el-picker-panel__link-btn {
      border: none;
    }
  }
}
</style>
