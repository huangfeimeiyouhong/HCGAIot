<template>
  <div class="hi-tree-node">
    <div
      class="hi-tree-node__row"
      :class="{ 'is-expanded': expanded, 'is-leaf': !hasChildren }"
      :style="{ paddingLeft: `${level * ctx.indent}px` }"
      @click="ctx.nodeClick(node)"
    >
      <span
        class="hi-tree-node__arrow"
        :class="{ 'hi-tree-node__arrow--placeholder': !hasChildren }"
        @click.stop="hasChildren && ctx.toggle(node)"
      >
        <img
          v-if="hasChildren"
          class="hi-tree-node__arrow-icon"
          :class="{ 'is-collapsed': !expanded }"
          :src="arrowIcon"
          alt=""
        >
      </span>
      <div class="hi-tree-node__content">
        <slot
          :node="node"
          :level="level"
          :expanded="expanded"
          :has-children="hasChildren"
        />
      </div>
      <div
        v-if="$slots.actions"
        class="hi-tree-node__actions"
        @click.stop
      >
        <slot
          name="actions"
          :node="node"
          :level="level"
        />
      </div>
    </div>
    <div
      v-if="hasChildren"
      v-show="expanded"
      class="hi-tree-node__children"
    >
      <HiTreeNode
        v-for="child in children"
        :key="child[ctx.nodeKey]"
        :node="child"
        :level="level + 1"
      >
        <template #default="slotProps">
          <slot
            :node="slotProps.node"
            :level="slotProps.level"
            :expanded="slotProps.expanded"
            :has-children="slotProps.hasChildren"
          />
        </template>
        <template
          v-if="$slots.actions"
          #actions="slotProps"
        >
          <slot
            name="actions"
            :node="slotProps.node"
            :level="slotProps.level"
          />
        </template>
      </HiTreeNode>
    </div>
  </div>
</template>

<script setup lang="ts" name="HiTreeNode">
import { computed, inject } from 'vue';

import { TREE_CONTEXT_KEY } from './types';

import type { TreeContext, TreeNodeData } from './types';

import arrowIcon from '@/views/dashboard/assets/ic-arrow.svg';

interface Props {
  /** 节点数据 */
  node: TreeNodeData;
  /** 节点层级,根节点为 0 */
  level: number;
}

const props = defineProps<Props>();

const ctx = inject<TreeContext>(TREE_CONTEXT_KEY)!;

const children = computed<TreeNodeData[]>(() => props.node[ctx.childrenKey] || []);
const hasChildren = computed(() => children.value.length > 0);
const expanded = computed(() => ctx.expandedKeys.value.has(props.node[ctx.nodeKey]));
</script>

<style lang="scss" scoped>
.hi-tree-node {
  & + & {
    margin-top: var(--hi-tree-gap, 0px);
  }

  &__children {
    margin-top: var(--hi-tree-gap, 0px);

    .hi-tree-node__row {
      font-size: 10px;
      // 预留透明边框,避免 hover 时布局抖动
      border: 1px solid transparent;

      &:hover {
        background:
          linear-gradient(rgba(17, 66, 131, 0.94), rgba(17, 66, 131, 0.94)) padding-box,
          linear-gradient(0deg, rgba(110, 135, 197, 0.55), rgba(110, 135, 197, 0.55)) border-box,
          linear-gradient(90deg, rgba(255, 255, 255, 0.28) 8.61%, rgba(255, 255, 255, 0.28) 90.61%) border-box;
        backdrop-filter: blur(12.96px);
        box-shadow: 0 0 10px rgba(37, 217, 255, 0.28);
      }
    }
  }

  &__row {
    position: relative;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    font-size: 12px;
    cursor: pointer;
  }

  &__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    margin-right: 8px;
    flex-shrink: 0;

    &--placeholder {
      visibility: hidden;
      pointer-events: none;
    }
  }

  &__arrow-icon {
    width: 14px;
    height: 14px;
    transition: transform 0.2s ease;

    &.is-collapsed {
      transform: rotate(-90deg);
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    flex: 1;
    min-width: 0;
  }

  &__actions {
    position: absolute;
    z-index: 2;
    top: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 48px;
    padding-right: 10px;
    background: linear-gradient(
      90deg,
      rgba(11, 31, 63, 0) 0%,
      rgba(11, 31, 63, 0.72) 32%,
      rgba(11, 31, 63, 0.98) 100%
    );
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  &__row:hover > &__actions {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
