import { defineComponent, h, isVNode, type PropType, type VNode } from 'vue';

/** 表格列内渲染组件:内容为 VNode 时直接渲染,为字符串时按 HTML 渲染(等价 v-html 行为) */
export default defineComponent({
  name: 'RenderContent',
  props: {
    content: {
      type: [Object, String] as PropType<VNode | string>,
      required: true,
    },
  },
  setup(props) {
    return () => (isVNode(props.content) ? props.content : h('span', { innerHTML: props.content }));
  },
});
