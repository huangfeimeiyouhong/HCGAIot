<!--
  接单弹窗 —— 必填接单说明 + 预计到场时间
-->
<template>
  <FormDialog
    v-model="visible"
    :title="`接单 · ${orderCode}`"
    :model="form"
    :loading="submitting"
    confirm-text="确认接单"
    @confirm="onConfirm"
  >
    <el-form-item
      label="接单说明"
      required
    >
      <el-input
        v-model="form.remark"
        type="textarea"
        :rows="3"
        placeholder="必填，如：已电话联系客户，约定明日 09:00 上门"
      />
    </el-form-item>
    <el-form-item
      label="预计到场时间"
      required
    >
      <el-date-picker
        v-model="form.etaAt"
        type="datetime"
        value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
        class="full"
        placeholder="选择预计到场时间"
      />
    </el-form-item>
    <el-alert
      type="info"
      :closable="false"
      title="接单后工单状态变为「处理中」，可多次更新进展，客户侧会同步看到"
    />
  </FormDialog>
</template>

<script setup lang="ts" name="AcceptDialog">
import { reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import FormDialog from '@/components/form/FormDialog.vue';

import { vendorApi } from '@/api/vendor';

const emit = defineEmits<{
  /** 接单成功 */
  accepted: [];
}>();

const visible = defineModel<boolean>('modelValue', { required: true });

const props = defineProps<{
  orderCode: string;
}>();

const submitting = ref(false);
/** 预计到场默认「4 小时后」：演示环境一键可提交，但清空后仍会被必填校验拦下 */
const form = reactive({ remark: '', etaAt: new Date(Date.now() + 4 * 3_600_000).toISOString() });

watch(visible, (open) => {
  if (open) {
    form.remark = '';
    form.etaAt = new Date(Date.now() + 4 * 3_600_000).toISOString();
  }
});

const onConfirm = async (): Promise<void> => {
  if (!form.remark.trim()) {
    ElMessage.warning('接单说明为必填项');
    return;
  }
  if (!form.etaAt) {
    ElMessage.warning('预计到场时间为必填项');
    return;
  }
  submitting.value = true;
  try {
    await vendorApi.acceptWorkOrder(props.orderCode, { remark: form.remark, etaAt: form.etaAt });
    visible.value = false;
    emit('accepted');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '接单失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="scss">
.full {
  width: 100%;
}
</style>