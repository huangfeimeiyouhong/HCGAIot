/**
 * 切换 Tab 组件
 * 用于看板左、右侧 panel-card 内的内容切换
 * - 均分宽度的分段切换器，激活项带蓝色渐变高亮 + 发光投影
 * - 支持 v-model 绑定当前选中值
 */
<template>
  <div class="switch-tab">
    <div
      class="switch-tab__indicator"
      :style="indicatorStyle"
    />
    <div
      v-for="item in options"
      :key="item.value"
      class="switch-tab__item"
      :class="{ 'switch-tab__item--active': item.value === modelValue }"
      @click="handleSelect(item.value)"
    >
      <span class="switch-tab__label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" name="SwitchTab">
import { computed } from 'vue';

export interface SwitchTabOption {
  /** 选项值 */
  value: string | number;
  /** 选项文案 */
  label: string;
}

interface Props {
  /** 当前选中值 */
  modelValue: string | number;
  /** 选项列表 */
  options: SwitchTabOption[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  change: [value: string | number];
}>();

const activeIndex = computed(() => {
  const index = props.options.findIndex((item) => item.value === props.modelValue);
  return index === -1 ? 0 : index;
});

// 容器左右各 4px 内边距，指示器宽度 = (容器宽 - 8px) / 选项数，与选项严格等宽
const indicatorStyle = computed(() => ({
  width: `calc((100% - 8px) / ${props.options.length})`,
  transform: `translateX(${activeIndex.value * 100}%)`,
}));

const handleSelect = (value: string | number) => {
  if (value === props.modelValue) return;
  emit('update:modelValue', value);
  emit('change', value);
};
</script>

<style lang="scss" scoped>
.switch-tab {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 4px;
  background: rgba(0, 50, 78, 0.12);
  border: 1px solid rgba(143, 188, 255, 0.1);
  border-radius: 4px;

  &__indicator {
    position: absolute;
    top: 4px;
    left: 4px;
    height: 24px;
    background:
      linear-gradient(120deg, rgba(13, 116, 255, 0) 20%, rgba(13, 116, 255, 0.1) 86%),
      linear-gradient(160deg, rgba(13, 116, 255, 0) 26%, rgba(13, 116, 255, 0.05) 100%),
      rgba(61, 169, 251, 0.15);
    border-radius: 2px;
    box-shadow: 0 0 4px rgba(0, 84, 223, 0.18);
    transition: transform 0.25s ease;
    pointer-events: none;
  }

  &__item {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    cursor: pointer;
    user-select: none;
  }

  &__label {
    font-size: 12px;
    line-height: 1;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.65);
    transition: color 0.2s ease;
    pointer-events: none;
  }

  &__item:hover &__label {
    color: rgba(255, 255, 255, 0.85);
  }

  &__item--active &__label,
  &__item--active:hover &__label {
    color: #ffffff;
  }
}
</style>
