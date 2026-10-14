<template>
  <section
    :class="['item', size]"
    @click="handleClick"
  >
    <p class="item-name">
      {{ name }}
    </p>
    <div :class="['item-num-box', { clickable: isClickable }]">
      <span :class="['item-num', type]">
        {{ num }}
      </span>
      <span class="item-unit">{{ unit }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useAppStore } from '@/store/app';

const props = defineProps<{
  name: string
  num: number | string
  unit: string
  type?: string
  size?: string
  clickable?: boolean
}>();

const emit = defineEmits(['itemClick']);

const appStore = useAppStore();

const isClickable = computed(() => props.clickable && appStore.isGroupDashboard);

const handleClick = () => {
  if (isClickable.value) {
    emit('itemClick', props.name);
  }
};
</script>

<style scoped lang="scss">
.item {
  display: flex;
  flex-direction: column;
  color: #fff;
  font-weight: 400;
  flex: 1;
  gap: 6px;

  .item-name {
    font-size: 12px;
    line-height: 12px;
  }

  .item-num {
    font-size: 18px;
    line-height: 22px;
    color: #0FC0FF;

    &.danger {
      color: #FF0F0F;
    }

    &.success {
      color: #1BF034;
    }
  }

  .item-unit {
    font-size: 12px;
    // line-height: 10px;
    margin-left: 4px;
  }

  .item-num-box {
    &.clickable {
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }

      .item-num {
        text-decoration: underline;
        text-decoration-style: dashed;
        text-underline-offset: 3px;
      }
    }
  }

  &.large {
    gap: 12px;
    .item-name {
      font-size: 14px;
    }

    .item-num {
      font-size: 24px;
      line-height: 24px;
    }

    .item-unit {
      font-size: 14px;
    }
  }
}
</style>