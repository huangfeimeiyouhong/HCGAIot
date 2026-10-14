<!--
  日期选择 —— 逻辑从 iot-cockpit date-picker 100% 保留，SCSS 与日历面板全改浅色
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
      :value-format="valueFormat"
      v-bind="$attrs"
      @update:model-value="onUpdate"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts" name="HiDatePicker">
interface Props {
  /** 绑定的值（范围为 [start, end]） */
  modelValue?: string | number | Date | Array<string | number | Date> | null;
  /** 前置标签 */
  label?: string;
  /** 选择类型 */
  type?: string;
  /** 值格式（默认 'YYYY-MM-DD'，范围型用 'YYYY-MM-DD' 即可） */
  valueFormat?: string;
  /** 非范围型占位文案 */
  placeholder?: string;
  /** 范围型开始占位 */
  startPlaceholder?: string;
  /** 范围型结束占位 */
  endPlaceholder?: string;
  /** 是否可清空 */
  clearable?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 面板类名 */
  popperClass?: string;
}

withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  label: '',
  type: 'daterange',
  valueFormat: 'YYYY-MM-DD',
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

const onUpdate = (val: Props['modelValue']): void => emit('update:modelValue', val);
const onChange = (val: Props['modelValue']): void => emit('change', val);
</script>

<style scoped lang="scss">
.hi-date-picker {
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
    width: 240px;
  }
}
</style>

<style lang="scss">
// 日历面板挂在 body 下，需非 scoped 样式
.hi-date-picker-popper.el-picker__popper {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);

  .el-popper__arrow::before {
    background: var(--color-bg-container);
    border-color: var(--color-border);
  }

  .el-date-table th {
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border-light);
  }

  .el-date-table td .el-date-table-cell {
    color: var(--color-text-body);
  }

  .el-date-table td.available:hover .el-date-table-cell {
    color: var(--color-primary-text);
  }

  .el-date-table td.prev-month .el-date-table-cell,
  .el-date-table td.next-month .el-date-table-cell {
    color: var(--color-text-disabled);
  }

  .el-date-table td.in-range .el-date-table-cell {
    background-color: var(--color-primary-bg);
  }

  .el-date-table td.start-date .el-date-table-cell__text,
  .el-date-table td.end-date .el-date-table-cell__text,
  .el-date-table td.current .el-date-table-cell__text {
    background-color: var(--color-primary-text);
    color: #FFFFFF;
  }

  .el-picker-panel__footer .el-button {
    background: transparent;
    border-color: var(--color-border);
    color: var(--color-primary-text);
  }
}
</style>