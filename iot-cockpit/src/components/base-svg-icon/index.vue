<template>
  <div
    v-if="isLinkUrl"
    class="svg-icon svg-external-icon"
    :style="styleExternalIcon"
    v-bind="$attrs"
  />
  <svg
    v-else
    :class="svgClass"
    aria-hidden="true"
    v-bind="$attrs"
  >
    <use :xlink:href="iconName" />
  </svg>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';

import { isExternal } from '@/utils/validate';

export default defineComponent({
  name: 'SvgIcon',
  inheritAttrs: false, // 组件上的$attrs不自动添加到组件根元素上 默认添加到组件根元素上
  props: {
    /**
       * @description: 图标链接
       */
    iconClass: {
      type: String,
      require: true,
      default: '',
    },
    /**
       * @description: 自定义类名
       */
    className: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const isLinkUrl = computed(() => isExternal(props.iconClass || ''));

    // 拼接成symbolId 在loader配置中指定了symbolId格式 icon-图标名称
    const iconName = computed(() => `#icon-${props.iconClass}`);

    // 添加类名 props.className外部传入自定义类名
    const svgClass = computed(() => (props.className ? `svg-icon ${props.className}` : 'svg-icon'));

    // 如果iconClass是带协议的图标链接 则通过style css属性方式渲染
    const styleExternalIcon = computed(() => ({
      mask: `url(${props.iconClass}) no-repeat 50% 50%`,
      '-webkit-mask': `url(${props.iconClass}) no-repeat 50% 50%`,
    }));

    return {
      isLinkUrl,
      iconName,
      svgClass,
      styleExternalIcon,
    };
  },
});
</script>

<style scoped>
  .svg-icon {
    width: 1em;
    height: 1em;
    overflow: hidden;
    vertical-align: -0.15em;
    /* fill: #fff; */
  }

  .svg-external-icon {
    display: inline-block;
    /* background-color: currentcolor; */
    mask-size: cover !important;
  }
</style>
