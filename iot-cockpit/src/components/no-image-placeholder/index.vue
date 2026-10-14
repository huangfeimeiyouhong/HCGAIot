<!--
  通用无图占位框(#082747 底 + #155074 边 + 相机图标 + 文案):
  表格 render 用 h(NoImagePlaceholder) 挂载,模板里直接 <NoImagePlaceholder />,勿在使用处自画 SVG
-->
<template>
  <span
    class="no-image-placeholder"
    :style="boxStyle"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.2"
    ><rect
      x="1.5"
      y="2.5"
      width="13"
      height="11"
      rx="1.5"
    /><circle
      cx="5.5"
      cy="6.5"
      r="1.2"
    /><path d="M2.5 12l3.5-3.5 2.5 2.5 3-3 2 2" /></svg>
    <span class="no-image-placeholder__text">{{ text }}</span>
  </span>
</template>

<script setup lang="ts" name="NoImagePlaceholder">
import { computed } from 'vue';

interface Props {
  /** 占位框宽度(px) */
  width?: number;
  /** 占位框高度(px) */
  height?: number;
  /** 占位文案 */
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: 87,
  height: 55,
  text: '暂无图片',
});

// 宽高走内联样式,其余观感收在 scoped;表格单元格内与相邻 <img> 对齐依赖 inline-flex + vertical-align
const boxStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));
</script>

<style lang="scss" scoped>
.no-image-placeholder {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: #082747;
  border: 1px solid #155074;
  border-radius: 2px;
  color: #88acc5;
  font-size: 12px;
  line-height: 1;
  vertical-align: middle;
}
</style>
