<template>
  <div
    class="hi-tree"
    :style="{ '--hi-tree-gap': `${gap}px` }"
  >
    <HiTreeNode
      v-for="node in data"
      :key="node[nodeKey]"
      :node="node"
      :level="0"
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
</template>

<script setup lang="ts" name="HiTree">
import { provide, ref, watch } from 'vue';

import HiTreeNode from './tree-node.vue';
import { TREE_CONTEXT_KEY } from './types';

import type { TreeNodeData } from './types';

interface Props {
  /** 树数据 */
  data: TreeNodeData[];
  /** 节点唯一标识字段名 */
  nodeKey?: string;
  /** 子节点字段名 */
  childrenKey?: string;
  /** 每层缩进(px) */
  indent?: number;
  /** 节点之间的间距(px) */
  gap?: number;
  /** 是否默认展开全部节点 */
  defaultExpandAll?: boolean;
  /** 默认展开的节点 key 列表 */
  defaultExpandedKeys?: Array<string | number>;
}

const props = withDefaults(defineProps<Props>(), {
  nodeKey: 'id',
  childrenKey: 'children',
  indent: 20,
  gap: 0,
  defaultExpandAll: false,
  defaultExpandedKeys: () => [],
});

const emit = defineEmits<{
  /** 点击节点行 */
  nodeClick: [node: TreeNodeData];
  /** 节点展开/收起 */
  toggle: [node: TreeNodeData, expanded: boolean];
}>();

const collectAllKeys = (list: TreeNodeData[]): Array<string | number> => {
  const keys: Array<string | number> = [];
  const walk = (nodes: TreeNodeData[]) => {
    nodes.forEach((node) => {
      const children = node[props.childrenKey];
      if (Array.isArray(children) && children.length) {
        keys.push(node[props.nodeKey]);
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

// 数据整体替换时(如 tab 切换),defaultExpandAll 下保持全部展开
watch(
  () => props.data,
  (next) => {
    if (props.defaultExpandAll) {
      expandedKeys.value = new Set(collectAllKeys(next));
    }
  },
);

const toggle = (node: TreeNodeData) => {
  const key = node[props.nodeKey];
  const next = new Set(expandedKeys.value);
  const expanded = !next.has(key);
  if (expanded) {
    next.add(key);
  } else {
    next.delete(key);
  }
  expandedKeys.value = next;
  emit('toggle', node, expanded);
};

const nodeClick = (node: TreeNodeData) => {
  emit('nodeClick', node);
};

provide(TREE_CONTEXT_KEY, {
  nodeKey: props.nodeKey,
  childrenKey: props.childrenKey,
  indent: props.indent,
  expandedKeys,
  toggle,
  nodeClick,
});
</script>

<style lang="scss" scoped>
.hi-tree {
  width: 100%;
}
</style>
