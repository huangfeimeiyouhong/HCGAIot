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
      <!-- 序号/排名列 -->
      <span
        v-if="['index', 'rank'].includes(column.type)"
        :class="['font-digital', 'serial-no', column.type === 'rank' ? `rank rank-${scope.$index + 1}` : '']"
      >
        {{ scope.$index + 1 }}
      </span>
      <!-- 自定义渲染函数:支持返回 VNode 或字符串 -->
      <RenderContent
        v-else-if="column.render"
        :content="getRenderContent(column, scope)"
      />
      <!-- 默认显示:数字类型使用千分位指令格式化 -->
      <span
        v-else-if="column.type === 'number' || (typeof scope.row[column.prop] === 'number')"
        v-thousand="scope.row[column.prop]"
      />
      <!-- 其他类型使用原有格式化 -->
      <span v-else>{{ formatValue(scope.row[column.prop]) }}</span>
    </template>
    <!-- 递归渲染子列;父级设置了 fixed 时向子列传递,保证多级表头下固定列对齐 -->
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

import RenderContent from './render-content';

import type { DataTableColumn } from './data-table.vue';

interface Props {
  /** 列配置 */
  column: DataTableColumn;
  /** 从父级列继承的 fixed 配置(多级表头场景) */
  inheritedFixed?: boolean | 'left' | 'right';
  /** 渲染内容提取函数(归一为 VNode 或 HTML 字符串,由 DataTable 注入) */
  // eslint-disable-next-line no-unused-vars -- 参数名仅作类型签名文档
  getRenderContent: (column: DataTableColumn, scope: { row: Record<string, unknown>; $index: number }) => VNode | string;
  /** 取值格式化函数(由 DataTable 注入) */
  // eslint-disable-next-line no-unused-vars -- 参数名仅作类型签名文档
  formatValue: (value: unknown) => string;
}

defineProps<Props>();
</script>
