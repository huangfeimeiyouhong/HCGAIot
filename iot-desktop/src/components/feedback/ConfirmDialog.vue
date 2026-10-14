<!--
  危险操作二次确认 —— 动宾标题 + 必填原因 + 默认焦点在取消
-->
<template>
  <el-dialog
    v-model="visible"
    class="hi-confirm"
    :width="width"
    :title="title"
    align-center
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <p class="hi-confirm__message">
      {{ message }}
    </p>
    <div
      v-if="requireReason"
      class="hi-confirm__reason"
    >
      <div class="hi-confirm__reason-label">
        {{ reasonLabel }}<span class="hi-confirm__required">*</span>
      </div>
      <el-input
        ref="reasonRef"
        v-model="reason"
        type="textarea"
        :rows="3"
        :maxlength="200"
        show-word-limit
        :placeholder="reasonPlaceholder"
      />
    </div>
    <template #footer>
      <div class="hi-confirm__footer">
        <!-- 默认焦点在取消（危险操作不诱导误点） -->
        <el-button
          ref="cancelRef"
          @click="close"
        >
          取消
        </el-button>
        <el-button
          :type="confirmButtonType"
          :disabled="!canConfirm"
          @click="onConfirm"
        >
          确定
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts" name="ConfirmDialog">
import { computed, nextTick, ref, watch } from 'vue';

interface Props {
  modelValue: boolean;
  /** 动宾结构标题，如「驳回入驻申请」 */
  title: string;
  message: string;
  /** 是否必填原因（驳回 / 标记整改 / 撤单等） */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** danger=破坏性确认 / warning=需留意（主色按钮）/ success=正向确认 */
  tone?: 'danger' | 'warning' | 'success';
  width?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  requireReason: false,
  reasonLabel: '原因',
  reasonPlaceholder: '请填写原因（必填）',
  tone: 'danger',
  width: 460,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [reason: string];
}>();

const reason = ref('');
const reasonRef = ref();
const cancelRef = ref();

/**
 * 确认按钮色调映射
 * warning 保持主色（与既有平台/厂家页视觉一致），
 * danger 用红色、success 用绿色，便于一眼区分「确认生效」与「破坏性操作」。
 */
const CONFIRM_BUTTON_TONE: Record<'danger' | 'warning' | 'success', 'primary' | 'danger' | 'success'> = {
  danger: 'danger',
  warning: 'primary',
  success: 'success',
};

const confirmButtonType = computed(() => CONFIRM_BUTTON_TONE[props.tone]);

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

/** 必填原因时未填则确定按钮 disabled */
const canConfirm = computed(() => !props.requireReason || reason.value.trim().length > 0);

// 每次打开清空原因并把焦点放到取消按钮
watch(
  () => props.modelValue,
  async (open) => {
    if (!open) return;
    reason.value = '';
    await nextTick();
    cancelRef.value?.$el?.focus?.();
  },
);

const close = (): void => {
  visible.value = false;
  reason.value = '';
};

const onConfirm = (): void => {
  if (!canConfirm.value) return;
  emit('confirm', reason.value.trim());
  visible.value = false;
  reason.value = '';
};
</script>

<style scoped lang="scss">
.hi-confirm__message {
  color: var(--color-text-body);
  font-size: 14px;
  line-height: 1.6;
}

.hi-confirm__reason {
  margin-top: 16px;
}

.hi-confirm__reason-label {
  margin-bottom: 6px;
  color: var(--color-text-body);
  font-size: 13px;
}

.hi-confirm__required {
  color: var(--color-danger);
}

.hi-confirm__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>

<style lang="scss">
.hi-confirm {
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
  }
}
</style>