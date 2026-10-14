<!--
  无图占位 —— 由 iot-cockpit no-image-placeholder 改造（底色/边框/图标全换浅色）
-->
<template>
  <span
    class="hi-no-image"
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
    <span class="hi-no-image__text">{{ text }}</span>
  </span>
</template>

<script setup lang="ts" name="NoImagePlaceholder">
import { computed } from 'vue';

interface Props {
  width?: number;
  height?: number;
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: 87,
  height: 55,
  text: '暂无图片',
});

const boxStyle = computed(() => ({
  width: `${props.width}px`,
  height: `${props.height}px`,
}));
</script>

<style scoped lang="scss">
.hi-no-image {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  background: var(--color-fill-light);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1;
  vertical-align: middle;
}
</style>