<!--
  筛选区容器 —— 默认展开 3 项 + 展开/收起 + 清除筛选 + 右侧批量/新增插槽
-->
<template>
  <section class="hi-filter-bar">
    <div
      class="hi-filter-bar__fields"
      :class="{ 'is-collapsed': collapsed }"
    >
      <slot name="fields" />
    </div>
    <div class="hi-filter-bar__actions">
      <slot name="actions" />
      <el-button
        text
        type="primary"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '展开' : '收起' }}
        <el-icon>
          <ArrowUp v-if="collapsed" />
          <ArrowDown v-else />
        </el-icon>
      </el-button>
      <el-button
        text
        :disabled="!hasFilter"
        @click="emit('clear')"
      >
        清除筛选
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts" name="FilterBar">
import { ref } from 'vue';

interface Props {
  /** 是否有筛选条件（控制「清除筛选」可用态） */
  hasFilter?: boolean;
  /** 是否默认收起（收起时只显示前 3 项） */
  defaultCollapsed?: boolean;
}

withDefaults(defineProps<Props>(), {
  hasFilter: true,
  defaultCollapsed: true,
});

const emit = defineEmits<{
  /** 点击「清除筛选」 */
  clear: [];
}>();

/** 收起态：CSS max-height 控制只显示前若干项 */
const collapsed = ref(true);
</script>

<style scoped lang="scss">
.hi-filter-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: var(--layout-card-gap);
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);

  &__fields {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 12px 16px;
    min-width: 0;

    // 收起态：只显示前 3 项，其余隐藏（PRD 3.5）
    &.is-collapsed {
      max-height: 36px;
      overflow: hidden;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
}
</style>