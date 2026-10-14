<!--
  进展表单 —— 可多次提交，不改变工单主状态
-->
<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="90px"
  >
    <el-form-item
      label="进展内容"
      prop="content"
    >
      <el-input
        v-model="form.content"
        type="textarea"
        :rows="4"
        placeholder="如：工程师已到场，正在拆卸压缩机"
      />
    </el-form-item>
    <el-form-item label="附件">
      <UploadField v-model="form.attachments" />
    </el-form-item>
    <el-form-item>
      <el-button
        type="primary"
        :loading="submitting"
        @click="onSubmit"
      >
        提交进展
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts" name="ProgressForm">
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';

import UploadField from '@/components/form/UploadField.vue';

import { vendorApi } from '@/api/vendor';

import type { Attachment } from '@/types';

const props = defineProps<{
  orderCode: string;
}>();

const emit = defineEmits<{
  submitted: [];
}>();

const formRef = ref<FormInstance>();
const submitting = ref(false);
const form = reactive<{ content: string; attachments: Attachment[] }>({ content: '', attachments: [] });

const rules: FormRules = {
  content: [{ required: true, message: '请填写进展内容', trigger: 'blur' }],
};

const onSubmit = async (): Promise<void> => {
  if (!formRef.value) return;
  try {
    await formRef.value.validate();
  } catch {
    return;
  }
  submitting.value = true;
  try {
    await vendorApi.addProgress(props.orderCode, { ...form });
    ElMessage.success('进展已提交');
    form.content = '';
    form.attachments = [];
    emit('submitted');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped lang="scss"></style>