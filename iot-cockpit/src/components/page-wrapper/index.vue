<template>
  <div class="page-wrapper">
    <slot name="title" />
    <div class="page-wrapper__content">
      <div class="page-wrapper__content-inner">
        <slot name="content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="PageWrapper"></script>

<style lang="scss" scoped>
.page-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__content {
    flex: 1;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    background: linear-gradient(to right, rgba(109, 228, 253, 0.8), rgba(255, 255, 255, 0));
    border-bottom-left-radius: 8px;

    &::before {
      content: "";
      box-sizing: border-box;
      width: calc(100% - 2px);
      height: calc(100% - 2px);
      position: absolute;
      top: 1px;
      left: 1px;
      background-color: #041234;
      border-bottom-left-radius: 8px;
      z-index: 0;
    }
  }

  &__content-inner {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }
}
</style>
