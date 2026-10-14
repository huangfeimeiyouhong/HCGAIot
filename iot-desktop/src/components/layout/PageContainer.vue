<!--
  页面容器 —— 内容区内边距 + max-width 居中 + 24 栅格
-->
<template>
  <section class="hi-page">
    <header
      v-if="title || desc || $slots.extra"
      class="hi-page__header"
    >
      <div class="hi-page__title-group">
        <h2
          v-if="title"
          class="hi-page__title"
        >
          {{ title }}
        </h2>
        <p
          v-if="desc"
          class="hi-page__desc"
        >
          {{ desc }}
        </p>
      </div>
      <div class="hi-page__extra">
        <slot name="extra" />
      </div>
    </header>
    <slot />
  </section>
</template>

<script setup lang="ts" name="PageContainer">
interface Props {
  /** 页面标题 */
  title?: string;
  /** 页面描述 */
  desc?: string;
}

withDefaults(defineProps<Props>(), {
  title: '',
  desc: '',
});
</script>

<style scoped lang="scss">
.hi-page {
  max-width: var(--layout-content-max-width);
  margin: 0 auto;
  padding: var(--layout-content-padding);

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  &__title {
    color: var(--color-text-title);
    font-size: 20px;
    font-weight: 600;
    line-height: 1.4;
  }

  &__desc {
    margin-top: 4px;
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  &__extra {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}
</style>