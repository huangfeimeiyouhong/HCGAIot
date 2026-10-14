<!--
  图表卡 —— 标题 + 右侧筛选插槽 + 图表内容
-->
<template>
  <section class="hi-chart-card">
    <header class="hi-chart-card__header">
      <h3 class="hi-chart-card__title">
        {{ title }}
        <span
          v-if="subTitle"
          class="hi-chart-card__sub"
        >{{ subTitle }}</span>
      </h3>
      <div class="hi-chart-card__extra">
        <slot name="extra" />
      </div>
    </header>
    <div
      class="hi-chart-card__body"
      :style="{ height: `${height}px` }"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts" name="ChartCard">
interface Props {
  title: string;
  subTitle?: string;
  /** 内容区高度 */
  height?: number;
}

withDefaults(defineProps<Props>(), {
  subTitle: '',
  height: 280,
});
</script>

<style scoped lang="scss">
.hi-chart-card {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px 0;
  }

  &__title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    color: var(--color-text-title);
    font-size: 15px;
    font-weight: 600;
  }

  &__sub {
    color: var(--color-text-secondary);
    font-size: 12px;
    font-weight: 400;
  }

  &__extra {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  &__body {
    // ⚠️ 不能写 flex: 1 —— 卡片在栅格里没有固定高度，flex-shrink 会把
    //    显式的 height 压成内容高度（表现为图表空白）。这里让 height 说话。
    flex: 0 0 auto;
    padding: 8px 8px 12px;
  }
}
</style>