/* eslint-disable no-unused-vars */
import type { Ref } from 'vue';

/** 树节点数据(除节点标识/子节点字段外,其余字段完全由业务自定义) */
export interface TreeNodeData {
  [key: string]: any;
}

export interface TreeContext {
  /** 节点唯一标识字段名 */
  nodeKey: string;
  /** 子节点字段名 */
  childrenKey: string;
  /** 每层缩进(px) */
  indent: number;
  /** 当前展开的节点 key 集合 */
  expandedKeys: Ref<Set<string | number>>;
  /** 切换节点展开/收起 */
  toggle: (n: TreeNodeData) => void;
  /** 节点行点击 */
  nodeClick: (n: TreeNodeData) => void;
}

export const TREE_CONTEXT_KEY = 'hi-tree-context';
