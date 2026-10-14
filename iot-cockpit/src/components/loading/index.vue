<template>
  <section class="loading-wrap">
    <img
      v-if="icon"
      :src="icon"
      alt="loading"
      class="loading-img"
    >
    <svg
      v-else
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

    <section class="tip">
      {{ tip }}
    </section>
  </section>
</template>

<script setup lang="ts">
defineProps({
  icon: {
    type: String,
    default: ''
  },
  tip: {
    type: String,
    default: '加载中...'
  },
});
</script>

<style lang="scss" scoped>
.loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  .loading-img {
    width: 50px;
    height: 50px;
  }

  .tip {
    color: #fff;
    margin-top: 10px;
    font-size: 14px;
  }
}
</style>
