<template>
  <div class="panel-title">
    <img
      draggable="false"
      :src="H1"
      alt=""
      class="title-bg-img"
    >
    <div
      class="title-content font-title"
    >
      <span>{{ title }}</span>
      <!-- 紧跟标题文字的缀标(如 ⓘ 提示图标) -->
      <slot name="suffix" />
    </div>
    <div class="title-action">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts" name="PanelTitle">
import H1 from '@/assets/images/components/title/h1.png';

interface Props {
  /** 标题文案，用于映射到对应的标题图片 */
  title?: string;
}

withDefaults(defineProps<Props>(), {
  title: '',
});
</script>

<style lang="scss" scoped>
.panel-title {
  position: relative;
  width: 100%;
  height: 40px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  .title-bg-img {
    position: absolute;
    bottom: 0;
    left: 0;
    width: auto;
    height: 40px;
    object-fit: cover;
    z-index: 0;
  }

  .title-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
    top: 0;
    font-size: 24px;
    padding-left: 40px;
    color: #fff;
    user-select: none;
  }

  .title-action {
    position: relative;
    z-index: 1;
    margin-left: auto;
  }
}
</style>
