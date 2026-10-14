<!--
 * 表格单元格：内容超出时省略号展示，hover 出现 tooltip（类似 el-table 的 show-overflow-tooltip）
 -->
<template>
  <el-tooltip
    :content="text"
    placement="top"
    effect="dark"
    :disabled="!isTruncated"
    :show-after="100"
    popper-class="screen-table-tooltip"
  >
    <div
      class="screen-table__cell"
      @mouseenter="checkTruncated"
    >
      {{ text }}
    </div>
  </el-tooltip>
</template>

<script setup lang="ts" name="ScreenTableCell">
import { ref } from 'vue';

interface Props {
  text: string;
}

defineProps<Props>();

const isTruncated = ref(false);

// 仅在内容确实被截断时才启用 tooltip
const checkTruncated = (event: MouseEvent) => {
  const el = event.currentTarget as HTMLElement;
  isTruncated.value = el.scrollWidth > el.clientWidth;
};
</script>

<style lang="scss" scoped>
// 单元格基础样式需在本组件内声明：scoped 样式无法稳定穿透 el-tooltip 落到子组件根节点
.screen-table__cell {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
  padding: 0 var(--screen-table-cell-padding, 12px);
}
</style>
