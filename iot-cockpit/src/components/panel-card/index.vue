/**
 * 通用面板卡片组件
 * 统一卡片外框（PageWrapper）+ 标题栏（PanelTitle）
 * - 右侧操作区通过 #action 插槽注入，不传则不渲染
 * - 内容区通过默认插槽注入
 */
<template>
  <div class="panel-card">
    <PageWrapper>
      <template #title>
        <PanelTitle :title="title">
          <slot name="action" />
        </PanelTitle>
      </template>
      <template #content>
        <div class="panel-card__body">
          <BorderBox13>
            <slot />
          </BorderBox13>
        </div>
      </template>
    </PageWrapper>
  </div>
</template>

<script setup lang="ts" name="PanelCard">
import BorderBox13 from '@/components/border-box-13/index.vue';
import PageWrapper from '@/components/page-wrapper/index.vue';
import PanelTitle from '@/components/panel-title/index.vue';

interface Props {
  /** 标题文案 */
  title: string;
}

defineProps<Props>();
</script>

<style lang="scss" scoped>
.panel-card {
  width: 100%;
  height: 100%;
  color: #ffffff;

  // 外层与内层边框之间 16px 内边距
  &__body {
    box-sizing: border-box;
    height: 100%;
    padding: 14px 8px 14px 14px;
  }
}
</style>
