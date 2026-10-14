<template>
  <div
    class="link-tag"
    @click="emit('click')"
  >
    <img
      v-if="showIcon"
      class="link-tag__icon"
      :src="iconFocus"
      alt=""
    >
    <span class="link-tag__text">{{ text }}</span>
    <img
      v-if="showArrow"
      class="link-tag__arrow"
      :src="iconArrow"
      alt=""
    >
  </div>
</template>

<script setup lang="ts" name="LinkTag">
import { computed } from 'vue';

import defaultIcon from '../../assets/ic-focus.png';
import defaultArrow from '../../assets/ledger-arrow.svg';

interface Props {
  /** 文字内容 */
  text: string;
  /** 是否显示左侧图标 */
  showIcon?: boolean;
  /** 是否显示右侧箭头 */
  showArrow?: boolean;
  /** 自定义左侧图标地址 */
  iconSrc?: string;
  /** 自定义右侧箭头地址 */
  arrowSrc?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: false,
  showArrow: true,
  iconSrc: '',
  arrowSrc: '',
});

const iconFocus = computed(() => props.iconSrc || defaultIcon);
const iconArrow = computed(() => props.arrowSrc || defaultArrow);

const emit = defineEmits<{
  click: [];
}>();
</script>

<style lang="scss" scoped>
.link-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 8px;
  box-sizing: border-box;
  border-radius: 2px;
  cursor: pointer;
  background:
    radial-gradient(
      414.02% 162.38% at 100% 53%,
      rgba(0, 48, 99, 0.07) 0%,
      rgba(0, 44, 53, 0.28) 25.32%,
      rgba(18, 97, 175, 0.53) 71.66%,
      #1261af 100%
    );
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 2px;
    padding: 1px;
    background: linear-gradient(
      90deg,
      rgba(57, 217, 250, 0.31) 0%,
      rgba(35, 204, 239, 0.1) 48.63%,
      rgba(35, 204, 239, 0.04) 100%
    );
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  &__icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &__text {
    font-size: 12px;
    line-height: 1;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__arrow {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    object-fit: contain;
  }
}
</style>
