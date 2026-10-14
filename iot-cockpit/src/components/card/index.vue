<template>
  <div class="card-container">
    <slot />
    <img
      draggable="false"
      src="@/assets/images/components/card/corner-lt.svg"
      class="left-top-corner"
    >
    <img
      draggable="false"
      src="@/assets/images/components/card/corner-lt.svg"
      class="right-top-corner"
    >
    <img
      draggable="false"
      src="@/assets/images/components/card/corner-lb.svg"
      class="left-bottom-corner"
    >
    <img
      draggable="false"
      src="@/assets/images/components/card/corner-lb.svg"
      class="right-bottom-corner"
    >
    <div class="bottom-line" />
  </div>
</template>

<script setup lang="ts" name="Card"></script>

<style lang="scss" scoped>
.card-container {
  min-height: 0;
  position: relative;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  background: linear-gradient(90deg, rgba(0, 163, 255, 0.1) 60%, rgba(0, 98, 153, 0.06) 100%);

  .bottom-line {
    position: absolute;
    width: 100%;
    height: 1px;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
    background: linear-gradient(
        to right,
        rgba(24, 144, 255, 0) 0%,
        rgba(128, 147, 238, 0.8) 10%,
        rgba(128, 147, 238, 0.8) 90%,
        rgba(24, 144, 255, 0) 100%
      );
  }
  &::before,
  &::after {
    content: '';
    display: inline-block;
    position: absolute;
    z-index: 1;
    top: 20%;
    width: 1px;
    height: 60%;
    background: linear-gradient(
      to bottom,
      rgba(24, 144, 255, 0) 0%,
      rgba(100, 114, 186, 0.8) 10%,
      rgba(100, 114, 186, 0.8) 90%,
      rgba(24, 144, 255, 0) 100%
    );
  }
  &::before {
    left: 0;
  }
  &::after {
    right: 0;
  }
}
.left-top-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 22px;
  height: 23px;
  transform: rotateY(0deg);
}
.right-top-corner {
  position: absolute;
  top: 0;
  right: 0;
  width: 22px;
  height: 23px;
  transform: rotateY(180deg);
}
.left-bottom-corner {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 22px;
  height: 23px;
  transform: rotateY(0);
}
.right-bottom-corner {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 22px;
  height: 23px;
  transform: rotateY(180deg);
}
</style>
