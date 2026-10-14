<!--
  通用树形选择组件（暗色科技风）
  封装 el-tree-select，支持前置标签（如"工单大类"）、树形结构数据、多选复选、搜索、清空
  使用示例：
    <HiTreeSelect
      v-model="codes"
      label="工单大类"
      :data="tree"
      node-key="dataCode"
      label-key="dataValue"
      multiple
      show-checkbox
    />
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
      :render-after-expand="renderAfterExpand"
      v-bind="$attrs"
      @update:model-value="onUpdate"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts" name="HiTreeSelect">
import { computed } from 'vue';

export interface HiTreeNode {
  /** 显示文案（默认取 label 字段，可用 labelKey 覆盖） */
  label?: string | number;
  /** 节点值（默认取 value 字段，可用 nodeKey 覆盖） */
  value?: string | number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 子节点（默认取 children 字段，可用 childrenKey 覆盖） */
  children?: HiTreeNode[];
  [key: string]: unknown;
}

interface Props {
  /** 绑定的值（单选为节点值，多选为其数组） */
  modelValue?: string | number | Array<string | number> | null;
  /** 前置标签，如"工单大类" */
  label?: string;
  /** 树形结构选项数据 */
  data?: HiTreeNode[];
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
  /** 多选时是否显示复选框 */
  showCheckbox?: boolean;
  /** 点击节点即勾选（配合 show-checkbox） */
  checkOnClickNode?: boolean;
  /** 多选时折叠已选标签 */
  collapseTags?: boolean;
  /** 折叠后最多直显的标签数 */
  maxCollapseTags?: number;
  /** 是否等展开后再渲染子节点（false=进面板即挂全树，已勾选状态立即可见） */
  renderAfterExpand?: boolean;
  /** 节点值字段名（el-tree-select 的 node-key） */
  nodeKey?: string;
  /** 节点文案字段名 */
  labelKey?: string;
  /** 子节点字段名 */
  childrenKey?: string;
  /** 附加的下拉面板类名 */
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
  renderAfterExpand: false,
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

const onUpdate = (val: Props['modelValue']) => {
  emit('update:modelValue', val);
};

const onChange = (val: Props['modelValue']) => {
  emit('change', val);
};
</script>

<style lang="scss" scoped>
.hi-tree-select {
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
    // flex:1 占 label 之外的剩余宽（width:100% 在 root 定宽时会取父全宽，叠加 label 溢出遮右侧控件）；
    // 不控宽时随内容自适应，min-width 兜底（容器窄于 label+180 时仍会溢出，属容器宽度不足）
    flex: 1;
    min-width: 180px;
  }
}
</style>

<style lang="scss">
// 触发器：全局 styles/index.scss 的 .el-select .el-select__wrapper 带 !important，
// 须用非 scoped + .hi-tree-select 范围限定 + 同级 !important 压回（与 HiCascader 同法）
.hi-tree-select .el-select__wrapper {
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

.hi-tree-select .el-select__selected-item {
  color: #e8f7ff;
}

// 多选标签/过滤输入恒单行:EP 默认 selection 与 selected-item 均 flex-wrap:wrap,
// 选中项多或聚焦输入过滤词时会换行把触发框撑高,固定高暗色框变形并顶开筛选条。
// 裁剪盒必须是 wrapper(定高36)——空选中态 selection 高度为0(input-wrapper/placeholder
// 均绝对定位越出绘制),在 selection 上 overflow:hidden 会把 placeholder 整体裁没
.hi-tree-select .el-select__wrapper {
  overflow: hidden;
}

.hi-tree-select .el-select__selection {
  flex-wrap: nowrap;

  .el-select__selected-item {
    flex-wrap: nowrap;
  }
}

// 选中节点小签（collapse-tags 折叠后）
.hi-tree-select .el-tag {
  background: rgba(24, 144, 255, 0.15);
  border-color: rgba(15, 184, 255, 0.5);
  color: #0fb8ff;
}

.hi-tree-select .el-tag__close {
  color: #0fb8ff;

  &:hover {
    background: #0fb8ff;
    color: #03142d;
  }
}

.hi-tree-select .el-select__caret {
  color: rgba(15, 184, 255, 0.88);
}

.hi-tree-select .el-select__placeholder {
  color: #e8f7ff;
  font-size: 16px;

  &.is-transparent {
    color: rgba(232, 247, 255, 0.45);
  }
}
</style>

<style lang="scss">
// 下拉面板挂在 body 下，需非 scoped 样式
.hi-tree-select-popper.el-popper {
  background: rgba(3, 20, 45, 0.98);
  border: 1px solid rgba(15, 184, 255, 0.5);

  .el-popper__arrow::before {
    background: rgba(3, 20, 45, 0.98);
    border-color: rgba(15, 184, 255, 0.5);
  }

  .el-tree {
    background: transparent;
    color: #e8f7ff;
    --el-tree-node-hover-bg-color: rgba(24, 144, 255, 0.15);

    // 树节点 label 是无 class 裸 span，须在节点层显式压色（仅靠 .el-tree 继承会被默认规则截断）
    .el-tree-node__content {
      height: 36px;
      font-size: 16px;
      color: #e8f7ff;

      &:hover {
        background: rgba(24, 144, 255, 0.15);
      }
    }
  }

  // 本版 EP 的 tree-select 每个节点外包一层 li.el-select-dropdown__item（自带 #606266 文字色与浅灰
  // hover 底，是 label 裸 span 的最近显式色祖先），须压回暗色口径；字号/行高对齐 HiCascader 节点（16px/36px）
  .el-select-dropdown__item {
    height: 36px;
    line-height: 36px;
    font-size: 16px;
    color: #e8f7ff;

    &.hover,
    &:hover {
      background: rgba(24, 144, 255, 0.15);
      color: #fff;
    }

    &.selected {
      color: #0fb8ff;
      font-weight: 600;
    }
  }

  .el-tree__empty-text {
    color: rgba(232, 247, 255, 0.45);
  }

  // 复选框：透明底 + 选中亮蓝
  .el-checkbox__inner {
    background: transparent;
    border-color: rgba(15, 184, 255, 0.6);
  }

  .el-checkbox__input.is-checked .el-checkbox__inner,
  .el-checkbox__input.is-indeterminate .el-checkbox__inner {
    background: #0fb8ff;
    border-color: #0fb8ff;
  }
}
</style>
