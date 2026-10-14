<!--
  通用级联选择器组件（暗色科技风）
  封装 el-cascader，支持前置标签（如"组织架构"）、树形结构数据、搜索、清空、多选
  使用示例：
    <HiCascader v-model="orgId" label="组织架构" :options="orgTree" placeholder="全部组织" />
    checkStrictly 可允许选择任意层级；emitPath=false 时只返回叶子值，否则返回完整路径数组
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

export interface HiCascaderOption {
  /** 显示文案（默认取 label 字段，可用 labelKey 覆盖） */
  label?: string | number;
  /** 选项值（默认取 value 字段，可用 valueKey 覆盖） */
  value?: string | number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 子节点（默认取 children 字段，可用 childrenKey 覆盖） */
  children?: HiCascaderOption[];
  [key: string]: unknown;
}

interface Props {
  /** 绑定的值（单选为 value 或路径数组，多选为其数组） */
  modelValue?: string | number | Array<string | number> | null;
  /** 前置标签，如"组织架构" */
  label?: string;
  /** 树形结构选项数据 */
  options?: HiCascaderOption[];
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
  /** 是否允许选择任意层级（父节点可选） */
  checkStrictly?: boolean;
  /** 是否返回完整路径数组（false 时仅返回叶子值，仅单选 + 非严格模式下生效） */
  emitPath?: boolean;
  /** 选项文案字段名 */
  labelKey?: string;
  /** 选项值字段名 */
  valueKey?: string;
  /** 子节点字段名 */
  childrenKey?: string;
  /** 附加的下拉面板类名 */
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

const onUpdate = (val: Props['modelValue']) => {
  emit('update:modelValue', val);
};

const onChange = (val: Props['modelValue']) => {
  emit('change', val);
};
</script>

<style lang="scss" scoped>
.hi-cascader {
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
  }
}
</style>

<style lang="scss">
// 触发器：EP 2.14 cascader 内部用 el-input（wrapper 类名 .el-input__wrapper）
// 用非 scoped + .hi-cascader 范围限定，避免 :deep() 在某些情况下失效
.hi-cascader .el-input__wrapper {
  min-height: 36px !important;
  padding: 4px 11px !important;
  background: rgba(3, 20, 45, 0.6) !important;
  border: 1px solid rgba(15, 184, 255, 0.5) !important;
  border-radius: 4px !important;
  box-shadow: none !important;
  font-size: 16px !important;
  line-height: 28px !important;
}

.hi-cascader .el-input__wrapper:hover {
  border-color: rgba(15, 184, 255, 0.88) !important;
  box-shadow: none !important;
}

.hi-cascader .el-input__wrapper.is-focus,
.hi-cascader .el-input__wrapper:focus,
.hi-cascader .el-input__wrapper:focus-within {
  border-color: rgba(15, 184, 255, 0.88) !important;
  box-shadow: 0 0 8px rgba(15, 184, 255, 0.25) !important;
}

.hi-cascader .el-input__inner {
  color: #e8f7ff !important;
  font-size: 16px !important;
  height: 28px !important;
  line-height: 28px !important;
}

.hi-cascader .el-input__placeholder {
  color: #e8f7ff !important;
  font-size: 16px !important;
  opacity: 1 !important;
}

.hi-cascader .el-input__placeholder.is-transparent {
  color: rgba(232, 247, 255, 0.65) !important;
  opacity: 1 !important;
}

.hi-cascader .el-input__suffix {
  color: rgba(15, 184, 255, 0.88) !important;
}

// 后缀图标宽度必须恒定:EP 只把 icon-arrow-down 定为 14px,icon-circle-close(清空)无规则
// 会继承上方 wrapper 的 16px——有值时 hover 箭头(22px)↔清空(24px)互换,触发器
// inline-block 宽度随之 22↔24 抖动,并推移同行后续控件。统一钉回 14px(EP 原生图标尺寸)
.hi-cascader .el-input__suffix .el-icon {
  font-size: 14px !important;
}

.hi-cascader .el-input__clear {
  color: rgba(15, 184, 255, 0.88) !important;
}

.hi-cascader .el-input__clear:hover {
  color: #fff !important;
}

// 多选已选标签
.hi-cascader .el-cascader__tags .el-tag {
  color: #e8f7ff;
  background: rgba(24, 144, 255, 0.15);
  border-color: rgba(15, 184, 255, 0.5);
}

.hi-cascader .el-cascader__tags .el-tag .el-tag__close {
  color: rgba(15, 184, 255, 0.88);
}

.hi-cascader .el-cascader__tags .el-tag .el-tag__close:hover {
  color: #fff;
  background: transparent;
}

.hi-cascader .el-cascader__search-input {
  color: #e8f7ff;
}
</style>

<style lang="scss">
// 下拉面板挂在 body 下，需非 scoped 样式
// EP 2.14 的 .el-cascader__dropdown 主题用 CSS 变量驱动，必须覆盖变量才能换肤
.hi-cascader-popper.el-cascader__dropdown {
  // 覆盖 EP CSS 变量（panel / menu / node / tag 全部引用这些）
  --el-cascader-menu-fill: rgb(3, 20, 45);
  --el-cascader-menu-text-color: #e8f7ff;
  --el-cascader-menu-selected-text-color: #0fb8ff;
  --el-cascader-menu-border: 1px solid rgba(15, 184, 255, 0.7);
  --el-cascader-menu-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  --el-cascader-node-background-hover: rgba(24, 144, 255, 0.15);
  --el-cascader-node-color-disabled: rgba(232, 247, 255, 0.3);
  --el-cascader-color-empty: rgba(232, 247, 255, 0.45);
  --el-cascader-tag-background: rgba(24, 144, 255, 0.15);

  // 直设兜底（防止某些环境下变量没生效）
  background: rgb(3, 20, 45);
  border: 1px solid rgba(15, 184, 255, 0.7);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);

  // EP 在 .el-cascader-panel 上会重新声明这些变量，覆盖掉下拉根节点上的自定义值，
  // 导致节点 :focus（点击后鼠标移开仍保留焦点）等走 var() 的样式取回 EP 默认浅色，出现白色色块。
  // 必须在 panel 上再覆盖一次。
  .el-cascader-panel {
    --el-cascader-menu-text-color: #e8f7ff;
    --el-cascader-menu-selected-text-color: #0fb8ff;
    --el-cascader-node-background-hover: rgba(24, 144, 255, 0.15);
    --el-cascader-node-color-disabled: rgba(232, 247, 255, 0.3);
    --el-cascader-color-empty: rgba(232, 247, 255, 0.45);
    --el-cascader-tag-background: rgba(24, 144, 255, 0.15);
  }

  .el-popper__arrow::before {
    background: rgb(3, 20, 45);
    border: 1px solid rgba(15, 184, 255, 0.7);
  }

  .el-cascader-panel,
  .el-cascader-menus,
  .el-cascader-menu {
    background: transparent;
  }

  .el-cascader-menu {
    min-width: 200px;
    color: #e8f7ff;
    border-right: 1px solid rgba(15, 184, 255, 0.3);

    &:last-child {
      border-right: none;

      .el-cascader-node {
        padding-right: 20px;
      }
    }
  }

  .el-cascader-node {
    color: #e8f7ff;
    font-size: 16px;
    height: 36px;
    line-height: 36px;
    padding: 0 30px 0 20px;

    &:hover,
    &.is-hovering,
    &:focus {
      background: rgba(24, 144, 255, 0.15);
      color: #fff;
    }

    &.is-active {
      color: #0fb8ff;
      font-weight: 600;
      background: rgba(24, 144, 255, 0.2);
    }

    &.in-active-path {
      color: #0fb8ff;
      font-weight: 600;
    }

    &.is-disabled {
      color: rgba(232, 247, 255, 0.3);
    }

    .el-cascader-node__label {
      color: inherit;
    }

    .el-cascader-node__prefix {
      .el-radio,
      .el-checkbox {
        margin-right: 0;
        color: rgba(15, 184, 255, 0.88);

        .el-radio__label,
        .el-checkbox__label {
          display: none;
        }

        .el-radio__inner,
        .el-checkbox__inner {
          width: 14px;
          height: 14px;
          border-color: rgba(15, 184, 255, 0.5);
          background: transparent;
        }

        &.is-checked {
          .el-radio__inner {
            background: #0fb8ff;
            border-color: #0fb8ff;

            &::after {
              width: 6px;
              height: 6px;
              background: rgb(3, 20, 45);
            }
          }

          .el-checkbox__inner {
            background: #0fb8ff;
            border-color: #0fb8ff;

            &::after {
              border-color: rgb(3, 20, 45);
            }
          }
        }
      }
    }
  }

  .el-cascader-node__postfix {
    color: rgba(15, 184, 255, 0.88);
  }

  .el-cascader__suggestion-list {
    color: var(--el-cascader-menu-text-color);

    .el-cascader__suggestion-item {
      color: var(--el-cascader-menu-text-color);
      font-size: 16px;

      &:hover,
      &.is-hovering {
        background: var(--el-cascader-node-background-hover);
      }

      &.is-checked {
        color: var(--el-cascader-menu-selected-text-color);
        font-weight: 600;
      }
    }
  }

  .el-cascader__empty-text {
    color: var(--el-cascader-color-empty);
  }

  .el-cascader__tags .el-tag {
    color: #e8f7ff;
    background: var(--el-cascader-tag-background);
    border-color: rgba(15, 184, 255, 0.5);
  }
}
</style>
