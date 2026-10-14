/** * 本文件是用于数据表格组件的实现，支持通过配置传入列和数据，支持多级表头、树形数据（row-key + tree-props）、固定列（fixed） */
<template>
  <el-table
    :data="data"
    class="custom-data-table"
    :border="false"
    :row-class-name="rowClassName"
    :height="height"
    :max-height="maxHeight"
    :row-key="rowKey"
    :tree-props="treeProps"
    :default-expand-all="defaultExpandAll"
    :expand-row-keys="expandRowKeys"
    v-bind="computedDefaultSort ? { 'default-sort': computedDefaultSort } : {}"
    style="width: 100%"
  >
    <TableColumn
      v-for="(column, index) in columns"
      :key="index"
      :column="column"
      :get-render-content="getRenderContent"
      :format-value="formatValue"
    />
  </el-table>
</template>

<script setup lang="ts" name="DataTable">
import { computed } from 'vue';

import TableColumn from './table-column.vue';

import { formatValue } from '@/utils/format';

export interface DataTableColumn {
  /** 列字段名 */
  prop?: string;
  /** 列标题 */
  label: string;
  /** 列宽 */
  width?: string | number;
  /** 最小列宽 */
  minWidth?: string | number;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean | 'custom';
  /** 内容溢出时省略号截断并悬浮提示(el-table-column 的 show-overflow-tooltip) */
  showOverflowTooltip?: boolean;
  /** 列类型：序号/排名/数字 */
  type?: 'index' | 'rank' | 'number' | string;
  /** 自定义渲染函数 */
  // eslint-disable-next-line no-unused-vars -- 参数名仅作类型签名文档
  render?: (row: Record<string, unknown>, rowIndex: number, scope: unknown) => unknown;
  /** 子列（多级表头） */
  children?: DataTableColumn[];
  /** 固定列：'left' / 'right' / true（等同 left），操作列常用 fixed: 'right' */
  fixed?: boolean | 'left' | 'right';
  /** 默认排序：true 为降序，或直接传 'ascending' | 'descending' */
  defaultSort?: boolean | 'ascending' | 'descending';
  [key: string]: unknown;
}

interface RowClassNameContext {
  row: Record<string, unknown>;
  rowIndex: number;
}

interface Props {
  /** 表格数据 */
  data: Record<string, unknown>[];
  /** 列配置 */
  columns: DataTableColumn[];
  /** 行类名函数 */
  // eslint-disable-next-line no-unused-vars -- 参数名仅作类型签名文档
  rowClassName?: (context: RowClassNameContext) => string;
  height?: string | number;
  maxHeight?: string | number;
  /** 默认排序配置；不提供时自动查找 columns 中第一个设置了 defaultSort 的列 */
  defaultSort?: { prop: string; order: 'ascending' | 'descending' } | null;
  /** 行数据唯一标识字段（树形数据必须提供） */
  rowKey?: string;
  /** 树形数据配置，如 { children: 'children' } */
  treeProps?: { children: string; hasChildren?: string };
  /** 是否默认展开所有树形节点 */
  defaultExpandAll?: boolean;
  /** 默认展开的行 key 数组（需配合 rowKey 使用） */
  expandRowKeys?: Array<string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  columns: () => [],
  rowClassName: ({ rowIndex }) => rowIndex % 2 === 0 ? 'even-row' : 'odd-row',
  height: '100%',
  maxHeight: undefined,
  defaultSort: null,
  rowKey: undefined,
  treeProps: () => ({ children: 'children' }),
  defaultExpandAll: false,
  expandRowKeys: undefined,
});

// 计算默认排序配置
const computedDefaultSort = computed(() => {
  // 如果直接提供了 defaultSort，优先使用
  if (props.defaultSort) {
    return props.defaultSort;
  }

  // 否则查找 columns 中第一个设置了 defaultSort 的列
  const findDefaultSortColumn = (cols: DataTableColumn[]): { prop: string; order: string } | null => {
    for (const col of cols) {
      // 如果有子列，递归查找
      if (col.children && col.children.length > 0) {
        const found = findDefaultSortColumn(col.children);
        if (found) return found;
      }
      // 如果当前列有 defaultSort 配置且有 prop
      if (col.defaultSort && col.prop) {
        return {
          prop: col.prop,
          order: col.defaultSort === true ? 'descending' : col.defaultSort,
        };
      }
    }
    return null;
  };

  return findDefaultSortColumn(props.columns);
});

// 获取渲染内容
const getRenderContent = (column: DataTableColumn, scope: { row: Record<string, unknown>; $index: number }) => {
  const result = column.render!(scope.row, scope.$index, scope);
  // 如果返回的是 VNode（对象且有 __v_isVNode 属性），直接返回 VNode
  if (result && typeof result === 'object' && (result as { __v_isVNode?: boolean }).__v_isVNode) {
    return result;
  }
  // 如果返回的是字符串，直接返回字符串（TableColumn 会用 v-html 渲染）
  if (typeof result === 'string') {
    return result;
  }
  // 如果返回的是数字，转换为字符串
  if (typeof result === 'number') {
    return String(result);
  }
  // 其他情况返回空字符串
  return '';
};
</script>

<style lang="scss" scoped>
// 表格样式(设计稿:AI事件台账表格):表头 48px 纯色底 + 斑马纹行 + 全表网格线 + 外框
.custom-data-table {
  width: 100%;
  box-sizing: border-box;
  background: transparent;
  font-size: 16px;
  color: #f0fbff;
  // 外框(设计稿整表 1px 描边)
  border: 1px solid #155074;

  :deep(.caret-wrapper) {
    width: 12px;
  }

  // 行间横向分割线走 Element Plus 边框变量
  --el-table-border-color: #0b2b47;
  // 单元格水平内边距(设计稿 20px,窄卡片场景可在使用处覆盖)
  --data-table-cell-padding: 12px;
  // 数据行最小行高(通用默认 48px,大行距台账(如设计稿 82px 带缩略图行)在使用处覆盖)
  --data-table-row-height: 48px;
  // 固定列(如右侧操作列)不透明底色:横向滚动时底层内容不穿透,页面底色差异较大时可覆盖
  --data-table-fixed-underlay: #03142d;
  // 加深 Element Plus 自带的固定列分隔阴影(默认黑色 15% 在深色背景下不可见)
  --el-table-fixed-left-column: inset 10px 0 10px -10px rgba(0, 0, 0, 0.55);
  --el-table-fixed-right-column: inset -10px 0 10px -10px rgba(0, 0, 0, 0.55);

  :deep(.el-table__inner-wrapper) {
    width: 100%;

    // el-table 自带的表底 1px 线与外框贴边重复,去掉
    &::before {
      display: none;
    }
  }

  // 表头:48px 高、纯色底、次级色文字
  :deep(.el-table__header-wrapper) {
    .el-table__header th.el-table__cell {
      height: 48px;
      padding: 0;
      vertical-align: middle;
      background: #082747 !important;
      border-bottom: none;
      color: #88acc5;
      font-weight: 400;

      .cell {
        padding: 0 var(--data-table-cell-padding);
        line-height: 22px;
        color: #88acc5;
        font-weight: 400;
      }
    }

    // 排序激活态箭头高亮
    .ascending .sort-caret.ascending {
      border-bottom-color: #0fb8ff;
    }

    .descending .sort-caret.descending {
      border-top-color: #0fb8ff;
    }
  }

  :deep(.el-table__body-wrapper) {
    // Element Plus 的行底色主要由 td.el-table__cell 渲染(而不是 tr)。
    // 仅设置 tr 的 background 在部分场景下会出现“初始渲染某一行底色不一致,hover 后才恢复”的重绘问题。
    // 用 CSS 变量统一驱动,明确落到 td 上,保证首次渲染一致。
    .el-table__body {
      border-spacing: 0;

      tr {
        --el-table-tr-bg-color: transparent;

        &.even-row {
          --el-table-tr-bg-color: #051d34;
        }

        &.odd-row {
          --el-table-tr-bg-color: #03142d;
        }

        &:hover {
          --el-table-tr-bg-color: rgba(15, 184, 255, 0.12);
        }
      }

      tr > td.el-table__cell {
        // td 的 height 即最小行高:单行内容恒默认行高,多行/图片内容随内容增高
        height: var(--data-table-row-height);
        padding: 0;
        vertical-align: middle;
        background-color: var(--el-table-tr-bg-color) !important;

        .cell {
          padding: 4px var(--data-table-cell-padding);
          line-height: 22px;
        }
      }

      // 末行底部分割线与外框贴边重复,去掉
      tr:last-child td.el-table__cell {
        border-bottom: none;
      }
    }
  }

  // 竖向列分割线(border=false 下 Element Plus 不画,手动补)
  :deep(.el-table__header th.el-table__cell:not(:last-child)),
  :deep(.el-table__body td.el-table__cell:not(:last-child)) {
    border-right: 1px solid #0b2b47;
  }

  // 固定列单元格:底色用不透明 underlay,行色(含 hover,走 --el-table-tr-bg-color)叠加在上层
  :deep(.el-table__body tr > td.el-table__cell.el-table-fixed-column--left),
  :deep(.el-table__body tr > td.el-table__cell.el-table-fixed-column--right) {
    background-color: var(--data-table-fixed-underlay) !important;
    background-image: linear-gradient(var(--el-table-tr-bg-color), var(--el-table-tr-bg-color)) !important;
  }

  // 固定列表头:纯色表头直接铺满
  :deep(.el-table__header th.el-table__cell.el-table-fixed-column--left),
  :deep(.el-table__header th.el-table__cell.el-table-fixed-column--right) {
    background: #082747 !important;
  }

  // 空数据
  :deep(.el-table__empty-block) {
    background: transparent;

    .el-table__empty-text {
      color: #88acc5;
    }
  }

  :deep(.el-scrollbar__bar) {
    opacity: 0.3;
  }

  // 树形数据展开/收起图标
  :deep(.el-table__expand-icon) {
    color: rgba(15, 184, 255, 0.88);

    &:hover {
      color: #fff;
    }
  }

  :deep(.el-table__placeholder) {
    background: transparent;
  }

  .serial-no {
    display: inline-block;
    text-align: center;
    font-weight: 600;
    color: #f0fbff;
    font-size: 16px;
  }

  .rank {
    &.rank-1 {
      width: 51px;
      height: 24px;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center center;
      color: transparent;
      background-image: url('@/assets/images/rank/rank-1.png');
    }

    &.rank-2 {
      width: 51px;
      height: 24px;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center center;
      color: transparent;
      background-image: url('@/assets/images/rank/rank-2.png');
    }

    &.rank-3 {
      width: 51px;
      height: 24px;
      background-size: 100% 100%;
      background-repeat: no-repeat;
      background-position: center center;
      color: transparent;
      background-image: url('@/assets/images/rank/rank-3.png');
    }
  }
}
</style>
