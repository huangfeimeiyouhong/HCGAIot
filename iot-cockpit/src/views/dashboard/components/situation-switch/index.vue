<template>
  <div class="situation-switch">
    <div
      v-for="item in OPTIONS"
      :key="item.value"
      class="situation-switch__item"
      :class="{'situation-switch__item--active': item.value === view}"
      @click="handleSelect(item.value)"
    >
      <span class="situation-switch__label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts" name="SituationSwitch">
import type { SituationView } from '../../situation-data';

interface Props {
  /** 当前视角 */
  view?: SituationView;
}

withDefaults(defineProps<Props>(), {
  view: 'security',
});

const emit = defineEmits(['change']);

const OPTIONS: { value: SituationView; label: string }[] = [
  { value: 'security', label: '安全环保' },
  { value: 'emergency', label: '应急态势' },
];

const handleSelect = (value: SituationView) => {
  emit('change', value);
};
</script>

<style lang="scss" scoped>
.situation-switch {
  display: flex;
  justify-content: center;
  gap: 12px;
  position: relative;
  top: 40px;

  &__item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 142px;
    height: 54px;
    background: url('@/assets/svg/top-header-button.svg') no-repeat center / 100% 100%;
    cursor: pointer;
    user-select: none;
    opacity: 0.6;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  &__item--active {
    z-index: 1;
    opacity: 1;

    &:hover {
      opacity: 1;
    }

    .situation-switch__label {
      color: #ffffff;
      text-shadow: -1px 2px 2px rgba(0, 20, 81, 0.5);
    }
  }

  &__label {
    font-family: var(--cockpit-title-font, sans-serif);
    font-size: 24px;
    font-weight: 400;
    line-height: 1;
    text-align: center;
    color: rgba(255, 255, 255, 0.85);
    pointer-events: none;
  }
}
</style>
