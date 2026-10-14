/**
 * 表格单元格渲染：内容为 VNode 时直接渲染，为字符串时按 HTML 渲染
 * （由 iot-cockpit 零改动复制）
 */
import { defineComponent, h, isVNode, type PropType, type VNode } from 'vue';

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