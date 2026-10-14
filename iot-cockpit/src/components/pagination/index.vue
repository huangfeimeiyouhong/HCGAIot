<!--
  通用分页组件（暗色科技风，设计稿版式）
  左侧：共 X 条
  右侧：[Y条/页 ▾] ‹ 1 2 3 4 … 19 ›（每页条数可配置为下拉切换）
  使用示例：
    <HiPagination v-model:page="page" v-model:page-size="pageSize" :total="128" @change="loadData" />
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
        :page-count="pageCount"
        :pager-count="pagerCount"
        popper-class="hi-pagination-size-popper"
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
  /** 每页条数 */
  pageSize?: number;
  /** 总记录数 */
  total?: number;
  /** 每页条数可选项；多于 1 个时左侧显示下拉切换 */
  pageSizes?: number[];
  /** 页码按钮数量（奇数，>=5，<=21），默认 7 时超长自动折叠为省略号 */
  pagerCount?: number;
  /** 显式指定总页数（树形分组分页等 total/pageSize 算不准的场景）；不传则按 total/pageSize 计算 */
  pageCount?: number;
}

const props = withDefaults(defineProps<Props>(), {
  page: 1,
  pageSize: 10,
  total: 0,
  pageSizes: () => [],
  pagerCount: 7,
  pageCount: undefined,
});

const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [pageSize: number];
  change: [page: number, pageSize: number];
}>();

// 每页条数可选项多于 1 个时显示内置 sizes 下拉
const layout = computed(() =>
  props.pageSizes.length > 1 ? 'sizes, prev, pager, next' : 'prev, pager, next',
);

const onPageChange = (page: number) => {
  emit('update:page', page);
  emit('change', page, props.pageSize);
};

const onPageSizeChange = (pageSize: number) => {
  emit('update:pageSize', pageSize);
  // 切换每页条数后回到第一页
  emit('update:page', 1);
  emit('change', 1, pageSize);
};
</script>

<style lang="scss" scoped>
.hi-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__info {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #e8f7ff;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  &__pager {
    flex-shrink: 0;
    --el-pagination-bg-color: transparent;
    --el-pagination-button-disabled-bg-color: transparent;
    --el-pagination-text-color: #88acc5;
    --el-pagination-button-color: #88acc5;
    --el-pagination-hover-color: #0fb8ff;

    // 设计稿:119×35 盒式选择器(#082747 底 + #155074 边);全局 index.scss 的 select 亮边发光带 !important,覆盖必须 !important
    :deep(.el-pagination__sizes) {
      .el-select {
        width: 119px;
      }

      .el-select__wrapper {
        min-height: 35px !important;
        background: #082747 !important;
        border: 1px solid #155074 !important;
        border-radius: 3px !important;
        box-shadow: none !important;
        font-size: 14px;
      }

      .el-select__selected-item {
        color: #fff;
      }

      .el-select__caret {
        color: #fff;
      }
    }

    :deep(.el-pager li) {
      min-width: 32px;
      height: 32px;
      line-height: 32px;
      margin: 0 6px;
      padding: 0;
      background: transparent;
      color: #88acc5;
      // 全局 poc.scss 的 .number 会把文字填充设为透明做渐变字并倾斜，页码 li 正好带 number 类，需显式覆盖
      -webkit-text-fill-color: #88acc5;
      font-style: normal;
      font-size: 16px;
      border-radius: 3px;

      &:hover {
        color: #0fb8ff;
        -webkit-text-fill-color: #0fb8ff;
      }

      // 设计稿当前页:#066DAD 底 + #0FB8FF 边 + #F0FBFF 字
      &.is-active {
        color: #f0fbff;
        -webkit-text-fill-color: #f0fbff;
        background: #066dad;
        border: 1px solid #0fb8ff;
      }
    }

    :deep(.btn-prev),
    :deep(.btn-next) {
      width: 32px;
      height: 32px;
      margin: 0 6px;
      padding: 0;
      background: transparent;
      color: #88acc5;

      &:hover:not(:disabled) {
        color: #0fb8ff;
      }

      &:disabled {
        color: rgba(136, 172, 197, 0.25);
      }
    }
  }
}
</style>

<style lang="scss">
// 每页条数下拉面板挂在 body 下，需非 scoped 样式
.hi-pagination-size-popper.el-select__popper {
  background: rgba(3, 20, 45, 0.98);
  border: 1px solid rgba(15, 184, 255, 0.5);

  // 设计稿无指向箭头，隐藏 el-popper 默认的白色菱形箭头
  .el-popper__arrow {
    display: none;
  }

  .el-select-dropdown__item {
    color: #e8f7ff;

    &:hover,
    &.is-hovering {
      background: rgba(24, 144, 255, 0.15);
    }

    &.is-selected {
      color: #0fb8ff;
      background: rgba(24, 144, 255, 0.1);
    }
  }
}
</style>
