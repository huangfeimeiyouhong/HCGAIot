<!--
  表格列 —— 递归渲染（多级表头），支持 render 返回 VNode / 字符串 / 数字
  （由 iot-cockpit data-table/table-column.vue 复制，逻辑 100% 保留）
-->
<template>
  <el-table-column
    :prop="column.children ? undefined : column.prop"
    :label="column.label"
    :width="column.width"
    :min-width="column.minWidth"
    :align="column.align || 'left'"
    :sortable="column.sortable"
    :show-overflow-tooltip="column.showOverflowTooltip"
    :fixed="column.fixed ?? inheritedFixed"
  >
    <template #header>
      <RenderContent :content="column.label" />
    </template>
    <template
      v-if="!column.children"
      #default="scope"
    >
      <!-- 序号列 -->
      <span
        v-if="column.type === 'index'"
        class="hi-table__serial"
      >
        {{ scope.$index + 1 }}
      </span>
      <!-- 自定义渲染函数：支持返回 VNode 或字符串 -->
      <RenderContent
        v-else-if="column.render"
        :content="getRenderContent(column, scope)"
      />
      <!-- 数字类型使用千分位格式化 -->
      <span
        v-else-if="column.type === 'number' || typeof rowValue(scope.row, column.prop) === 'number'"
        v-thousand="rowValue(scope.row, column.prop)"
      />
      <!-- 其他类型使用通用格式化 -->
      <span v-else>{{ formatValue(rowValue(scope.row, column.prop)) }}</span>
    </template>
    <!-- 递归渲染子列；父级设置了 fixed 时向子列传递 -->
    <template v-if="column.children && column.children.length > 0">
      <TableColumn
        v-for="(childColumn, childIndex) in column.children"
        :key="childIndex"
        :column="childColumn"
        :inherited-fixed="column.fixed ?? inheritedFixed"
        :get-render-content="getRenderContent"
        :format-value="formatValue"
      />
    </template>
  </el-table-column>
</template>

<script setup lang="ts" name="TableColumn">
import type { VNode } from 'vue';

import RenderContent from './RenderContent';

import type { DataTableColumn } from './DataTable.vue';

interface Props {
  column: DataTableColumn;
  /** 从父级列继承的 fixed 配置（多级表头场景） */
  inheritedFixed?: boolean | 'left' | 'right';
  /** 渲染内容提取函数（归一为 VNode 或 HTML 字符串，由 DataTable 注入） */
  getRenderContent: (column: DataTableColumn, scope: { row: Record<string, unknown>; $index: number }) => VNode | string;
  /** 取值格式化函数（由 DataTable 注入） */
  formatValue: (value: unknown) => string;
}

defineProps<Props>();

/** 安全取值：column.prop 可能为 undefined（多级表头父列） */
const rowValue = (row: Record<string, unknown>, prop?: string): unknown =>
  prop ? row[prop] : undefined;
</script>