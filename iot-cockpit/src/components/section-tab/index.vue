/**
 * 本文件是用于资产模块Tab组件的实现
 */
<template>
  <div class="tab-container">
    <div
      v-for="tab in tabs"
      :key="tab.value"
      :class="['tab-item', { active: activeTab === tab.value }]"
      @click="handleTabClick(tab.value)"
    >
      {{ tab.label }}
    </div>
  </div>
</template>

<script setup lang="ts" name="SectionTab">
export interface SectionTabItem {
  label: string;
  value: string;
}

interface Props {
  /** Tab 选项数组 */
  tabs: SectionTabItem[];
  /** 当前激活的 Tab 值 */
  activeTab: string;
}

const props = defineProps<Props>();

const emit = defineEmits(['tab-change']);

// 处理 Tab 点击
const handleTabClick = (value: string) => {
  if (value !== props.activeTab) {
    emit('tab-change', value);
  }
};
</script>

<style lang="scss" scoped>
.tab-container {
  display: inline-flex;
  align-items: center;
  background: #0f2854;
  border-radius: 2px;
  padding: 2px;
  gap: 0;
  border: 2px solid #1b3465;
}

.tab-item {
  padding: 2px 8px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
  border-radius: 2px;
  white-space: nowrap;
  position: relative;

  &.active {
    background: #1e4480;
    font-weight: bolder;
  }
}
</style>
