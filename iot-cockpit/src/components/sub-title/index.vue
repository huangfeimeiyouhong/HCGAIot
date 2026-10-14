<template>
  <div
    class="sub-title"
    :class="{ 'sub-title--large': large }"
  >
    <img
      :src="TitleBg"
      alt=""
      class="sub-title-bg-img"
    >
    <span class="sub-title-content font-title">
      {{ title }}
    </span>
    <div style="margin-left: auto;">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts" name="SubTitle">
import TitleBg from '@/assets/images/components/title/sub-title-bg.png';

interface Props {
  /** 标题文案 */
  title?: string;
  /** 大号规格(项目详情页安全指标等区块标题:24px,默认 18px) */
  large?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: '',
  large: false,
});
</script>

<style lang="scss" scoped>
.sub-title {
  position: relative;
  width: 100%;
  height: 26px;
  display: flex;
  align-items: center;
  user-select: none;

  .sub-title-bg-img {
    position: absolute;
    top: 6px;
    left: -8px;
    width: 164px;
    height: 26px;
    object-fit: cover;
    z-index: 0;
  }

  .sub-title-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex: 1;
    height: 100%;
    font-size: 18px;
    line-height: 24px;
    padding-left: 24px;
    background: linear-gradient(180deg, #dff0fa 19%, #e0f0ff 46%, #a8d4f9 82%);
    background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 2px 2px rgba(0, 0, 0, 0.25);
  }

  // 大号规格:字号 24px,背景图等比放大
  &--large {
    height: 34px;

    .sub-title-bg-img {
      height: 58px;
      bottom: -16px;
    }

    .sub-title-content {
      font-size: 24px;
      line-height: 30px;
    }
  }
}
</style>
