<!--
  加载动画 —— 从 iot-cockpit loading 零改动复制（纯 SVG 动画，颜色在浅底仍可见）
-->
<template>
  <section class="hi-loading">
    <svg
      width="50px"
      height="50px"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        fill="transparent"
        stroke-width="3"
        stroke-dasharray="31.415, 31.415"
        stroke="#02bcfe"
        stroke-linecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0, 25 25;360, 25 25"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke"
          values="#02bcfe;#3be6cb;#02bcfe"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>

      <circle
        cx="25"
        cy="25"
        r="10"
        fill="transparent"
        stroke-width="3"
        stroke-dasharray="15.7, 15.7"
        stroke="#3be6cb"
        stroke-linecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="360, 25 25;0, 25 25"
          dur="1.5s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="stroke"
          values="#3be6cb;#02bcfe;#3be6cb"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>

    <section
      v-if="tip"
      class="hi-loading__tip"
    >
      {{ tip }}
    </section>
  </section>
</template>

<script setup lang="ts" name="Loading">
interface Props {
  /** 提示文案；传空字符串则不显示 */
  tip?: string;
}

withDefaults(defineProps<Props>(), {
  tip: '加载中...',
});
</script>

<style scoped lang="scss">
.hi-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  &__tip {
    margin-top: 10px;
    color: var(--color-text-secondary);
    font-size: 13px;
  }
}
</style>