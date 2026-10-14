<!--
  树 —— 递归组件（3 文件合 1：node 内联，逻辑从 iot-cockpit tree 保留，SCSS 换浅色）
  展开状态用本组件自管，不依赖全局 store
-->
<template>
  <div
    class="hi-tree"
    :style="{ '--hi-tree-gap': `${gap}px`, '--hi-tree-indent': `${indent}px` }"
  >
    <div
      v-for="node in data"
      :key="node[nodeKey]"
      class="hi-tree__branch"
    >
      <div
        class="hi-tree__row"
        :class="{ 'is-leaf': !childrenOf(node).length }"
        :style="{ paddingLeft: `${levelOf(node) * indent}px` }"
        @click="onNodeClick(node)"
      >
        <span
          class="hi-tree__arrow"
          :class="{ 'is-placeholder': !childrenOf(node).length }"
          @click.stop="toggle(node)"
        >
          <el-icon v-if="childrenOf(node).length">
            <ArrowRight v-if="!expandedKeys.has(node[nodeKey])" />
            <ArrowDown v-else />
          </el-icon>
        </span>
        <div class="hi-tree__content">
          <slot
            :node="node"
            :level="levelOf(node)"
            :expanded="expandedKeys.has(node[nodeKey])"
            :has-children="childrenOf(node).length > 0"
          />
        </div>
        <div
          v-if="$slots.actions"
          class="hi-tree__actions"
          @click.stop
        >
          <slot
            name="actions"
            :node="node"
            :level="levelOf(node)"
          />
        </div>
      </div>

      <div
        v-show="expandedKeys.has(node[nodeKey]) && childrenOf(node).length"
        class="hi-tree__children"
      >
        <div
          v-for="child in childrenOf(node)"
          :key="child[nodeKey]"
          class="hi-tree__branch"
        >
          <div
            class="hi-tree__row"
            :style="{ paddingLeft: `${(levelOf(node) + 1) * indent}px` }"
            @click="onNodeClick(child)"
          >
            <span
              class="hi-tree__arrow"
              :class="{ 'is-placeholder': !childrenOf(child).length }"
              @click.stop="toggle(child)"
            >
              <el-icon v-if="childrenOf(child).length">
                <ArrowRight v-if="!expandedKeys.has(child[nodeKey])" />
                <ArrowDown v-else />
              </el-icon>
            </span>
            <div class="hi-tree__content">
              <slot
                :node="child"
                :level="levelOf(node) + 1"
                :expanded="expandedKeys.has(child[nodeKey])"
                :has-children="childrenOf(child).length > 0"
              />
            </div>
          </div>
          <!-- 第三层及以下不再展开（本原型无深层树需求） -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="HiTree">
import { ref, watch } from 'vue';

/** 树节点数据 */
export type TreeNodeData = Record<string, any>;

interface Props {
  data: TreeNodeData[];
  /** 节点唯一标识字段 */
  nodeKey?: string;
  /** 子节点字段 */
  childrenKey?: string;
  /** 每层缩进（px） */
  indent?: number;
  /** 节点间距（px） */
  gap?: number;
  /** 默认展开全部 */
  defaultExpandAll?: boolean;
  /** 默认展开的节点 key */
  defaultExpandedKeys?: Array<string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  nodeKey: 'id',
  childrenKey: 'children',
  indent: 18,
  gap: 2,
  defaultExpandAll: false,
  defaultExpandedKeys: () => [],
});

const emit = defineEmits<{
  nodeClick: [node: TreeNodeData];
  toggle: [node: TreeNodeData, expanded: boolean];
}>();

/** 取子节点 */
const childrenOf = (node: TreeNodeData): TreeNodeData[] => (node[props.childrenKey] as TreeNodeData[]) ?? [];

/** 计算层级（自根向下数，仅两级） */
const depthOf = (node: TreeNodeData, level: number): number => {
  let depth = level;
  let current: TreeNodeData | undefined = node;
  while (current) {
    const parent = props.data.find((d) => childrenOf(d).some((c) => c === current));
    if (!parent) break;
    depth += 1;
    current = parent;
  }
  return depth;
};

const levelOf = (node: TreeNodeData): number => depthOf(node, 0);

/** 递归收集含子节点的 key */
const collectAllKeys = (list: TreeNodeData[]): Array<string | number> => {
  const keys: Array<string | number> = [];
  const walk = (nodes: TreeNodeData[]): void => {
    nodes.forEach((n) => {
      const children = childrenOf(n);
      if (children.length) {
        keys.push(n[props.nodeKey]);
        walk(children);
      }
    });
  };
  walk(list);
  return keys;
};

const expandedKeys = ref<Set<string | number>>(
  new Set(props.defaultExpandAll ? collectAllKeys(props.data) : props.defaultExpandedKeys),
);

// 数据整体替换时（如 Tab 切换）保持展开状态一致
watch(
  () => props.data,
  (next) => {
    if (props.defaultExpandAll) expandedKeys.value = new Set(collectAllKeys(next));
  },
);

/** 切换展开 */
const toggle = (node: TreeNodeData): void => {
  const key = node[props.nodeKey];
  const next = new Set(expandedKeys.value);
  const expanded = !next.has(key);
  if (expanded) next.add(key);
  else next.delete(key);
  expandedKeys.value = next;
  emit('toggle', node, expanded);
};

const onNodeClick = (node: TreeNodeData): void => emit('nodeClick', node);
</script>

<style scoped lang="scss">
.hi-tree {
  width: 100%;
  font-size: 13px;

  &__row {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 30px;
    padding: 2px 8px 2px 0;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: var(--color-fill-light);
    }

    &.is-leaf {
      cursor: default;
    }
  }

  &__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--color-text-secondary);
    font-size: 12px;

    &.is-placeholder {
      visibility: hidden;
    }
  }

  &__content {
    flex: 1;
    min-width: 0;
  }

  &__children {
    margin-top: var(--hi-tree-gap, 2px);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}
</style>