<!--
  C-07 发起报修 —— 客户视角
  经 customerApi.getDeviceList 取设备下拉；createWorkOrder 发起（责任厂家由产权绑定派生）
-->
<template>
  <PageContainer
    title="发起报修"
    desc="选择故障设备并提交描述，系统按生效产权绑定自动派单给责任厂家"
  >
    <template #extra>
      <el-button @click="router.back()">返回</el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="order-form"
      >
        <el-form-item
          label="报修设备"
          prop="deviceSn"
        >
          <el-select
            v-model="form.deviceSn"
            filterable
            placeholder="选择故障设备"
            class="full"
          >
            <el-option
              v-for="d in deviceOptions"
              :key="d.sn"
              :label="`${d.name}（${d.sn}）`"
              :value="d.sn"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          v-if="form.alarmId"
          label="关联告警"
        >
          <el-tag type="warning">
            {{ form.alarmId }}
          </el-tag>
          <span class="form-tip">由告警转单带入，提交后工单将回写该告警</span>
        </el-form-item>

        <el-form-item
          label="问题类型"
          prop="problemType"
        >
          <el-select
            v-model="form.problemType"
            placeholder="选择问题类型"
            class="full"
          >
            <el-option
              v-for="p in problemOptions"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item
          label="优先级"
          prop="priority"
        >
          <el-radio-group v-model="form.priority">
            <el-radio
              v-for="p in priorityOptions"
              :key="p.value"
              :value="p.value"
            >
              {{ p.label }}
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          label="故障描述"
          prop="description"
        >
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请描述故障现象，如：3 号冷柜温度持续偏高至 12℃ 以上，已持续 1 小时"
          />
        </el-form-item>

        <el-form-item label="现场照片">
          <UploadField v-model="form.attachments" />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            @click="onSubmit"
          >
            提交报修
          </el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerWorkOrderCreate">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';

import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import UploadField from '@/components/form/UploadField.vue';

import { PROBLEM_TYPE_OPTIONS, PRIORITY_OPTIONS } from '@/constants/dict';
import { customerApi } from '@/api/customer';

import type { Attachment, CustomerDeviceView, Priority, ProblemType } from '@/types';

const route = useRoute();
const router = useRouter();

const problemOptions = PROBLEM_TYPE_OPTIONS;
const priorityOptions = PRIORITY_OPTIONS;

const deviceOptions = ref<CustomerDeviceView[]>([]);
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive({
  deviceSn: (route.query.deviceSn as string) ?? '',
  alarmId: (route.query.alarmId as string) ?? '',
  problemType: 'DEVICE_FAULT' as ProblemType,
  description: '',
  priority: 'NORMAL' as Priority,
  attachments: [] as Attachment[],
});

const rules: FormRules = {
  deviceSn: [{ required: true, message: '请选择报修设备', trigger: 'change' }],
  problemType: [{ required: true, message: '请选择问题类型', trigger: 'change' }],
  description: [{ required: true, message: '请填写故障描述', trigger: 'blur' }],
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
    const order = await customerApi.createWorkOrder({
      deviceSn: form.deviceSn,
      alarmId: form.alarmId || undefined,
      problemType: form.problemType,
      description: form.description,
      priority: form.priority,
      attachments: form.attachments,
    });
    ElMessage.success(`报修已提交，工单号 ${order.code}`);
    void router.replace(`/customer/work-orders/${order.code}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '提交失败');
  } finally {
    submitting.value = false;
  }
};

onMounted(async () => {
  try {
    const res = await customerApi.getDeviceList({ page: 1, pageSize: 300 });
    deviceOptions.value = res.list;
  } catch {
    deviceOptions.value = [];
  }
});
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.order-form {
  max-width: 720px;
  padding: 8px 4px;
}

.full {
  width: 100%;
}

.form-tip {
  margin-left: 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
