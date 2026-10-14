/**
 * 本文件是用于租赁盘面Tab组件的实现
 */
<template>
  <div
    :class="['tab-item', { active: active }]"
    @click="handleClick"
  >
    <img
      :src="tabImage"
      alt=""
      class="tab-bg"
    >
    <slot>
      <span class="tab-text font-title">{{ title }}</span>
    </slot>
  </div>
</template>

<script setup lang="ts" name="NavTab">
import { computed } from 'vue';

import Active from '@/assets/images/components/nav-tab/tab-active.png';
import Inactive from '@/assets/images/components/nav-tab/tab-inactive.png';

interface Props {
  title: string;
  /** 是否激活状态 */
  active?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
});

const emit = defineEmits(['click']);

// 根据类型和激活状态计算对应的图片
const tabImage = computed(() => props.active ? Active : Inactive);

// 处理点击事件
const handleClick = () => {
  emit('click');
};
</script>

<style lang="scss" scoped>
.tab-item {
  position: relative;
  width: 449px;
  height: 80px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: block;
  user-select: none;
  opacity: 0.3;

  .tab-bg {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  .tab-text {
    position: absolute;
    top: -5px;
    left: 0;
    width: 100%;
    height: 100%;
    text-align: center;
    line-height: 36px;
    font-size: 36px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &.active {
    opacity: 1;
    .tab-text {
      font-size: 40px;
    }
  }
}
</style>
