<!--
  表单弹窗骨架 —— 标题 + el-form + 底部取消/确定（确定走 loading 防重复提交）
-->
<template>
  <el-dialog
    v-model="visible"
    class="hi-form-dialog"
    :title="title"
    :width="width"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    append-to-body
    @close="onClose"
  >
    <el-form
      ref="formRef"
      :model="model"
      :rules="rules"
      :label-width="labelWidth"
      :disabled="disabled"
      label-position="right"
      @submit.prevent
    >
      <slot />
    </el-form>
    <template #footer>
      <div class="hi-form-dialog__footer">
        <slot name="footer">
          <el-button @click="close">取消</el-button>
          <el-button
            type="primary"
            :loading="loading"
            @click="onConfirm"
          >
            {{ confirmText }}
          </el-button>
        </slot>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="HiFormDialog">
import { computed, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

interface Props {
  modelValue: boolean;
  title: string;
  width?: string | number;
  loading?: boolean;
  /** 表单数据（v-model 由父组件双向绑定） */
  model: Record<string, any>;
  rules?: FormRules;
  labelWidth?: string | number;
  disabled?: boolean;
  confirmText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: 640,
  loading: false,
  rules: () => ({}),
  labelWidth: 110,
  disabled: false,
  confirmText: '确定',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
}>();

const formRef = ref<FormInstance>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

/** 全量校验 → 通过则 emit confirm */
const onConfirm = async (): Promise<void> => {
  if (!formRef.value) {
    emit('confirm');
    return;
  }
  try {
    await formRef.value.validate();
    emit('confirm');
  } catch {
    // 校验失败：保持弹窗打开，由 el-form 展示逐项错误
  }
};

const close = (): void => {
  visible.value = false;
  emit('cancel');
};

const onClose = (): void => {
  formRef.value?.resetFields();
  emit('update:modelValue', false);
};

defineExpose({ formRef, close });
</script>

<style scoped lang="scss">
.hi-form-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style lang="scss">
.hi-form-dialog {
  border-radius: var(--layout-card-radius);

  .el-dialog__header {
    padding: 16px 20px;
    margin-right: 0;
    border-bottom: 1px solid var(--color-border-light);
  }

  .el-dialog__title {
    color: var(--color-text-title);
    font-size: 16px;
    font-weight: 600;
  }

  .el-dialog__body {
    padding: 20px;
    max-height: 60vh;
    overflow-y: auto;
  }
}
</style>