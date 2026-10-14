<!--
  数据表格 —— 由 iot-cockpit data-table 改造而来
  模板与列配置逻辑 100% 保留；SCSS 整段重写为浅色（架构文档 A8.3）
  新增：loading 透传、toolbar / empty / expand 插槽
-->
<template>
  <div class="hi-table-wrapper">
    <div
      v-if="$slots.toolbar"
      class="hi-table__toolbar"
    >
      <slot name="toolbar" />
    </div>

    <el-table
      v-loading="loading"
      :data="data"
      class="hi-table"
      :border="false"
      :row-class-name="rowClassName"
      :height="height"
      :max-height="maxHeight"
      :row-key="rowKey"
      :tree-props="treeProps"
      :default-expand-all="defaultExpandAll"
      :expand-row-keys="expandRowKeys"
      :empty-text="emptyText"
      v-bind="computedDefaultSort ? { 'default-sort': computedDefaultSort } : {}"
      @row-click="(row: any, column: any) => emit('rowClick', row, column)"
    >
      <TableColumn
        v-for="(column, index) in columns"
        :key="index"
        :column="column"
        :get-render-content="getRenderContent"
        :format-value="formatValue"
      />
      <template #empty>
        <slot name="empty">
          <EmptyState
            :text="emptyText"
            :actionable="false"
          />
        </slot>
      </template>
    </el-table>
  </div>
</template>

<script setup lang="ts" name="DataTable">
import { computed, h } from 'vue';

import EmptyState from './EmptyState.vue';
import TableColumn from './TableColumn.vue';

import { formatValue as formatValueFn } from '@/utils/format';

/** 列配置（页面只做列配置 + render，不自己写表格） */
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
  /** 内容溢出省略并悬浮提示 */
  showOverflowTooltip?: boolean;
  /** 列类型：序号 / 数字（千分位） */
  type?: 'index' | 'number';
  /** 自定义渲染：返回 VNode / 字符串 / 数字 */
  render?: (row: TableRow, rowIndex: number, scope: unknown) => unknown;
  /** 子列（多级表头） */
  children?: DataTableColumn[];
  /** 固定列：操作列常用 fixed: 'right' */
  fixed?: boolean | 'left' | 'right';
  /** 默认排序：true 为降序，或直接传 'ascending' / 'descending' */
  defaultSort?: boolean | 'ascending' | 'descending';
  [key: string]: unknown;
}

/** 表格行：领域对象均可直接传入（渲染层只按 prop 名读取） */
export type TableRow = Record<string, any>;

interface RowClassNameContext {
  row: Record<string, unknown>;
  rowIndex: number;
}

interface Props {
  /** 表格数据 */
  data: TableRow[];
  /** 列配置 */
  columns: DataTableColumn[];
  /** 行类名函数（默认按索引给斑马纹） */
  rowClassName?: (context: RowClassNameContext) => string;
  height?: string | number;
  maxHeight?: string | number;
  /** 默认排序配置；不传则自动查找第一个设置了 defaultSort 的列 */
  defaultSort?: { prop: string; order: 'ascending' | 'descending' } | null;
  /** 行唯一标识字段 */
  rowKey?: string;
  /** 树形数据配置 */
  treeProps?: { children: string; hasChildren?: string };
  /** 是否默认展开所有树形节点 */
  defaultExpandAll?: boolean;
  /** 默认展开的行 key 数组 */
  expandRowKeys?: Array<string | number>;
  /** loading 遮罩 */
  loading?: boolean;
  /** 空态文案 */
  emptyText?: string;
  /** 斑马纹 */
  stripe?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  columns: () => [],
  rowClassName: ({ rowIndex }: RowClassNameContext) => (rowIndex % 2 === 0 ? 'even-row' : 'odd-row'),
  height: '100%',
  maxHeight: undefined,
  defaultSort: null,
  rowKey: undefined,
  treeProps: () => ({ children: 'children' }),
  defaultExpandAll: false,
  expandRowKeys: undefined,
  loading: false,
  emptyText: '暂无数据',
  stripe: true,
});

const emit = defineEmits<{
  /** 行点击（打开抽屉等） */
  rowClick: [row: TableRow, column: unknown];
  /** 排序变化 */
  sortChange: [payload: { prop: string; order: string | null }];
}>();

/** 默认排序：优先 props，否则递归查找第一个设置了 defaultSort 的列 */
const computedDefaultSort = computed(() => {
  if (props.defaultSort) return props.defaultSort;
  const find = (cols: DataTableColumn[]): { prop: string; order: string } | null => {
    for (const col of cols) {
      if (col.children?.length) {
        const hit = find(col.children);
        if (hit) return hit;
      }
      if (col.defaultSort && col.prop) {
        return { prop: col.prop, order: col.defaultSort === true ? 'descending' : col.defaultSort };
      }
    }
    return null;
  };
  return find(props.columns);
});

/** render 结果归一：VNode / 字符串 / 数字 → VNode | 字符串 */
const getRenderContent = (
  column: DataTableColumn,
  scope: { row: Record<string, unknown>; $index: number },
): ReturnType<typeof h> | string => {
  const result = column.render!(scope.row, scope.$index, scope);
  if (result && typeof result === 'object' && (result as { __v_isVNode?: boolean }).__v_isVNode) {
    return result as ReturnType<typeof h>;
  }
  if (typeof result === 'string') return result;
  if (typeof result === 'number') return String(result);
  return '';
};

const formatValue = formatValueFn;
</script>

<style scoped lang="scss">
.hi-table-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.hi-table__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
}

.hi-table {
  width: 100%;
  font-size: 14px;
  color: var(--color-text-body);
  background: var(--color-bg-container);

  --data-table-cell-padding: 12px;
  // PRD 规范：数据行 44px（iot-cockpit 原为 48px）
  --data-table-row-height: 44px;
  // 固定列不透底：浅色主题下必须用容器白
  --data-table-fixed-underlay: #FFFFFF;
  --el-table-border-color: var(--color-border);
  --el-table-header-bg-color: var(--color-fill-light);
  --el-table-header-text-color: var(--color-text-title);
  --el-table-row-hover-bg-color: var(--color-primary-bg);
  --el-table-fixed-left-column: inset 6px 0 6px -6px rgba(29, 33, 41, 0.06);
  --el-table-fixed-right-column: inset -6px 0 6px -6px rgba(29, 33, 41, 0.06);

  :deep(.caret-wrapper) {
    width: 12px;
  }

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }

  // 表头：浅灰底 + 深色字
  :deep(.el-table__header-wrapper) {
    .el-table__header th.el-table__cell {
      height: 44px;
      padding: 0;
      vertical-align: middle;
      background: var(--color-fill-light) !important;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text-title);
      font-weight: 500;

      .cell {
        padding: 0 var(--data-table-cell-padding);
        line-height: 22px;
        color: var(--color-text-title);
        font-weight: 500;
      }
    }

    .ascending .sort-caret.ascending {
      border-bottom-color: var(--color-primary-text);
    }

    .descending .sort-caret.descending {
      border-top-color: var(--color-primary-text);
    }
  }

  :deep(.el-table__body-wrapper) {
    .el-table__body {
      border-spacing: 0;

      tr {
        --el-table-tr-bg-color: var(--color-bg-container);

        &.odd-row {
          --el-table-tr-bg-color: #FAFBFC;
        }

        &:hover {
          --el-table-tr-bg-color: var(--color-primary-bg);
        }
      }

      tr > td.el-table__cell {
        height: var(--data-table-row-height);
        padding: 0;
        vertical-align: middle;
        background-color: var(--el-table-tr-bg-color) !important;

        .cell {
          padding: 4px var(--data-table-cell-padding);
          line-height: 22px;
          font-size: 14px;
        }
      }

      tr:last-child td.el-table__cell {
        border-bottom: none;
      }
    }
  }

  // 竖向列分割线（border=false 下 EP 不画，手动补浅色）
  :deep(.el-table__header th.el-table__cell:not(:last-child)),
  :deep(.el-table__body td.el-table__cell:not(:last-child)) {
    border-right: 1px solid #EBEDF0;
  }

  // 固定列不透明底色，横向滚动时不穿透
  :deep(.el-table__body tr > td.el-table__cell.el-table-fixed-column--left),
  :deep(.el-table__body tr > td.el-table__cell.el-table-fixed-column--right) {
    background-color: var(--data-table-fixed-underlay) !important;
    background-image: linear-gradient(var(--el-table-tr-bg-color), var(--el-table-tr-bg-color)) !important;
  }

  :deep(.el-table__header th.el-table__cell.el-table-fixed-column--left),
  :deep(.el-table__header th.el-table__cell.el-table-fixed-column--right) {
    background: var(--color-fill-light) !important;
  }

  :deep(.el-table__empty-block) {
    background: transparent;
    min-height: 160px;
  }

  :deep(.el-scrollbar__bar) {
    opacity: 0.3;
  }

  :deep(.el-table__expand-icon) {
    color: var(--color-text-secondary);

    &:hover {
      color: var(--color-primary-text);
    }
  }

  :deep(.el-table__placeholder) {
    background: transparent;
  }
}

.hi-table__serial {
  color: var(--color-text-secondary);
  font-weight: 500;
}
</style>