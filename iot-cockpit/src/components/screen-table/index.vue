<!--
 * 大屏展示表格组件（原生 table 轻量实现）
 * - 列数不固定，通过 columns 配置
 * - 支持自定义列宽（px 数字或百分比字符串），未设置宽度的列平分剩余宽度
 * - 内容左对齐，超出省略号，hover 展示 tooltip
 * - 仅纵向滚动，表头固定
 -->
<template>
  <div
    class="screen-table"
    :style="{ fontSize: `${fontSize}px`, '--screen-table-cell-padding': `${cellPadding}px` }"
  >
    <!-- 表头（固定不滚动），padding-right 动态补偿表体滚动条宽度，保证列对齐 -->
    <div
      class="screen-table__header"
      :style="{ paddingRight: `${scrollbarWidth}px` }"
    >
      <table>
        <colgroup>
          <col
            v-for="(column, index) in columns"
            :key="index"
            :style="getColStyle(column)"
          >
        </colgroup>
        <thead>
          <tr :style="{ height: `${headerHeight}px` }">
            <th
              v-for="(column, index) in columns"
              :key="index"
            >
              <div class="screen-table__cell">
                {{ column.label }}
              </div>
            </th>
          </tr>
        </thead>
      </table>
    </div>
    <!-- 表体（纵向滚动） -->
    <div
      ref="bodyRef"
      class="screen-table__body"
    >
      <table v-if="data.length > 0">
        <colgroup>
          <col
            v-for="(column, index) in columns"
            :key="index"
            :style="getColStyle(column)"
          >
        </colgroup>
        <tbody>
          <tr
            v-for="(row, rowIndex) in data"
            :key="rowIndex"
            :class="rowIndex % 2 === 0 ? 'is-odd' : 'is-even'"
            :style="{ height: `${rowHeight}px` }"
          >
            <td
              v-for="(column, colIndex) in columns"
              :key="colIndex"
            >
              <div
                v-if="column.slot"
                class="screen-table__cell"
              >
                <slot
                  :name="column.slot"
                  :row="row"
                  :row-index="rowIndex"
                />
              </div>
              <TableCell
                v-else
                :text="getCellText(row, column)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-else
        class="screen-table__empty"
      >
        暂无数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="ScreenTable">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import TableCell from './table-cell.vue';

export interface ScreenTableColumn {
  /** 列字段名 */
  prop: string;
  /** 列标题 */
  label: string;
  /** 列宽：数字为 px，字符串支持 px/%；不设置则平分剩余宽度 */
  width?: number | string;
  /** 自定义单元格插槽名；传入则以 #插槽名="{ row, row-index }" 渲染自定义内容 */
  slot?: string;
}

interface Props {
  /** 列配置 */
  columns: ScreenTableColumn[];
  /** 表格数据 */
  data: Record<string, unknown>[];
  /** 数据行高（px） */
  rowHeight?: number;
  /** 表头行高（px） */
  headerHeight?: number;
  /** 字号（px） */
  fontSize?: number;
  /** 单元格水平内边距（px） */
  cellPadding?: number;
}

const props = withDefaults(defineProps<Props>(), {
  columns: () => [],
  data: () => [],
  rowHeight: 40,
  headerHeight: 40,
  fontSize: 12,
  cellPadding: 12,
});

const getColStyle = (column: ScreenTableColumn) => {
  if (column.width === undefined || column.width === null || column.width === '') {
    return undefined;
  }
  return { width: typeof column.width === 'number' ? `${column.width}px` : column.width };
};

const getCellText = (row: Record<string, unknown>, column: ScreenTableColumn) => {
  const value = row[column.prop];
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

// 实测表体滚动条宽度，动态补偿表头 padding（macOS overlay 滚动条下 scrollbar-gutter 不生效，不能用纯 CSS 方案）
const bodyRef = ref<HTMLElement>();
const scrollbarWidth = ref(0);

const updateScrollbarWidth = () => {
  const el = bodyRef.value;
  scrollbarWidth.value = el ? el.offsetWidth - el.clientWidth : 0;
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateScrollbarWidth();
  resizeObserver = new ResizeObserver(updateScrollbarWidth);
  if (bodyRef.value) {
    resizeObserver.observe(bodyRef.value);
  }
});

watch(() => props.data.length, async () => {
  await nextTick();
  updateScrollbarWidth();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style lang="scss" scoped>
// 自定义滚动条宽度；表头 padding-right 由 JS 实测滚动条宽度动态补偿
$scrollbar-width: 6px;

.screen-table {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: #ffffff;

  table {
    width: 100%;
    table-layout: fixed;
    border-collapse: collapse;
    border-spacing: 0;
  }

  &__cell {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: left;
    padding: 0 var(--screen-table-cell-padding, 12px);
  }

  &__header {
    flex-shrink: 0;

    th {
      padding: 0;
      font-weight: normal;
      vertical-align: middle;
      // 表头背景：#0662BE 纵向渐变，40% 透明度（中间 83% 不透明度）
      background: linear-gradient(
        180deg,
        rgba(6, 98, 190, 0.4) 0%,
        rgba(6, 98, 190, 0.33) 50%,
        rgba(6, 98, 190, 0.4) 100%
      );
      // 上下渐变边线：#01C1FE -> #01E0FE，12% 透明度
      border-top: 1px solid transparent;
      border-bottom: 1px solid transparent;
      border-image: linear-gradient(90deg, rgba(1, 193, 254, 0.12), rgba(1, 224, 254, 0.12)) 1;
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
      width: $scrollbar-width;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(1, 193, 254, 0.3);
      border-radius: 3px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    td {
      padding: 0;
      border: none;
      vertical-align: middle;
    }

    // 奇数行渐变：#0994EE -> #0FF5FF -> #0994EE，12% 透明度
    tr.is-odd {
      background: linear-gradient(
        0deg,
        rgba(9, 148, 238, 0.12) 0%,
        rgba(15, 245, 255, 0.12) 50%,
        rgba(9, 148, 238, 0.12) 100%
      );
    }

    // 偶数行渐变：#0066A8 -> #0FA9FF -> #005186，12% 透明度
    tr.is-even {
      background: linear-gradient(
        0deg,
        rgba(0, 102, 168, 0.12) 0%,
        rgba(15, 169, 255, 0.12) 50%,
        rgba(0, 81, 134, 0.12) 100%
      );
    }

    tr:hover td {
      background-color: rgba(24, 144, 255, 0.12);
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgba(255, 255, 255, 0.45);
  }
}
</style>
