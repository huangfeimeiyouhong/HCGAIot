<!--
  演示数据提示条 —— 常驻含状态流转的页面顶部（PRD 3.5 要求）
-->
<template>
  <div class="hi-demo-tip">
    <el-icon class="hi-demo-tip__icon"><InfoFilled /></el-icon>
    <span class="hi-demo-tip__text">{{ text }}</span>
    <slot />
  </div>
</template>

<script setup lang="ts" name="DemoTipBar">
interface Props {
  /** 提示文案 */
  text?: string;
}

withDefaults(defineProps<Props>(), {
  text: '本页为演示数据，状态变更仅在当前页面内存生效，刷新页面即复位；不做跨入口联动。',
});
</script>

<style scoped lang="scss">
.hi-demo-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 16px;
  border-radius: var(--layout-card-radius);
  background: var(--badge-waiting-bg);
  color: var(--badge-waiting-text);
  font-size: 13px;
  line-height: 1.5;

  &__icon {
    flex-shrink: 0;
  }

  &__text {
    flex: 1;
  }
}
</style>