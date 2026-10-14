<!--
  分页 —— 由 iot-cockpit pagination 改造
  逻辑（v-model:page / v-model:pageSize / total / @change）100% 保留
  SCSS 全改浅色；默认 pageSize 由 10 改 20（PRD 3.5）
-->
<template>
  <div class="hi-pagination">
    <div class="hi-pagination__info">
      共 {{ total }} 条
    </div>
    <div class="hi-pagination__right">
      <el-pagination
        class="hi-pagination__pager"
        :layout="layout"
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="pageSizes"
        :total="total"
        :pager-count="pagerCount"
        popper-class="hi-pagination-size-popper"
        background
        @current-change="onPageChange"
        @size-change="onPageSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts" name="HiPagination">
import { computed } from 'vue';

interface Props {
  /** 当前页码 */
  page?: number;
  /** 每页条数（默认 20，PRD 规范） */
  pageSize?: number;
  /** 总记录数 */
  total?: number;
  /** 每页条数可选项 */
  pageSizes?: number[];
  /** 页码按钮数量（奇数） */
  pagerCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  page: 1,
  pageSize: 20,
  total: 0,
  pageSizes: () => [10, 20, 50, 100],
  pagerCount: 7,
});

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [pageSize: number];
  change: [page: number, pageSize: number];
}>();

/** 每页条数可选项多于 1 个时显示内置 sizes 下拉 */
const layout = computed(() =>
  props.pageSizes.length > 1 ? 'total, sizes, prev, pager, next, jumper' : 'total, prev, pager, next, jumper',
);

const onPageChange = (page: number): void => {
  emit('update:page', page);
  emit('change', page, props.pageSize);
};

const onPageSizeChange = (pageSize: number): void => {
  emit('update:pageSize', pageSize);
  // 切换每页条数后回到第一页（架构文档 A10.3 假设 A-9）
  emit('update:page', 1);
  emit('change', 1, pageSize);
};
</script>

<style scoped lang="scss">
.hi-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 4px 0;

  &__info {
    display: none;
  }

  &__right {
    display: flex;
    align-items: center;
  }

  &__pager {
    --el-pagination-bg-color: transparent;
    --el-pagination-button-bg-color: var(--color-bg-container);
    --el-pagination-text-color: var(--color-text-body);
    --el-pagination-button-color: var(--color-text-body);
    --el-pagination-button-disabled-bg-color: transparent;
    --el-pagination-hover-color: var(--color-primary-text);
    --el-pagination-hover-button-color: var(--color-primary-text);

    font-size: 13px;
  }
}
</style>

<style lang="scss">
// 每页条数下拉面板挂在 body 下，需非 scoped 样式
.hi-pagination-size-popper.el-select__popper {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);

  .el-select-dropdown__item {
    color: var(--color-text-body);

    &:hover,
    &.is-hovering {
      background: var(--color-fill-light);
    }

    &.is-selected {
      color: var(--color-primary-text);
      font-weight: 600;
    }
  }
}
</style>