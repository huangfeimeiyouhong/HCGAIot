<!--
  详情抽屉 —— 右侧 720px
  由 iot-cockpit dialog 改造：删 resizeStore scale 补偿、模板从居中弹窗改抽屉
-->
<template>
  <el-drawer
    v-model="visible"
    class="hi-drawer"
    :title="title"
    :size="size"
    :destroy-on-close="true"
    append-to-body
    @closed="onClosed"
  >
    <template
      v-if="$slots.extra"
      #header
    >
      <div class="hi-drawer__header">
        <span class="hi-drawer__title">{{ title }}</span>
        <slot name="extra" />
      </div>
    </template>

    <div
      v-loading="loading"
      class="hi-drawer__body"
    >
      <slot />
    </div>

    <template
      v-if="$slots.footer"
      #footer
    >
      <div class="hi-drawer__footer">
        <slot name="footer" />
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts" name="DetailDrawer">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  title: string;
  /** 抽屉宽度（默认 720px） */
  size?: string | number;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 720,
  loading: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  closed: [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const onClosed = (): void => emit('closed');
</script>

<style scoped lang="scss">
.hi-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.hi-drawer__title {
  color: var(--color-text-title);
  font-size: 16px;
  font-weight: 600;
}

.hi-drawer__body {
  min-height: 120px;
}

.hi-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style lang="scss">
.hi-drawer.el-drawer {
  border-radius: var(--layout-card-radius) 0 0 var(--layout-card-radius);

  .el-drawer__header {
    padding: 16px 20px;
    margin-bottom: 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .el-drawer__body {
    padding: 20px;
    overflow-y: auto;
  }

  .el-drawer__footer {
    padding: 12px 20px;
    border-top: 1px solid var(--color-border-light);
  }
}
</style>