<!--
  申报绑定弹窗 —— 2 类系统校验（服务范围 / 重复绑定）
  ⚠️ 服务范围校验放前端是为了演示「阻断」，正式环境应由后端再校验一次
-->
<template>
  <FormDialog
    v-model="visible"
    :title="`申报绑定 · ${deviceSn}`"
    :model="form"
    :loading="submitting"
    confirm-text="提交申报"
    @confirm="onSubmit"
  >
    <el-form-item label="设备 SN">
      <el-input
        :model-value="deviceSn"
        disabled
      />
    </el-form-item>

    <el-form-item label="绑定类型">
      <el-radio-group v-model="form.type">
        <el-radio label="OWNERSHIP">产权绑定</el-radio>
        <el-radio label="ASSEMBLY">装配绑定</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="客户">
      <el-select
        v-model="form.customerId"
        class="full"
        filterable
        placeholder="选择客户"
      >
        <el-option
          v-for="c in inScopeCustomers"
          :key="c.id"
          :label="`${c.shortName}（服务范围内）`"
          :value="c.id"
        />
        <el-option
          v-for="c in outScopeCustomers"
          :key="c.id"
          :label="`${c.shortName}（不在服务范围内）`"
          :value="c.id"
        />
      </el-select>
    </el-form-item>

    <ServiceScopeCheck
      :has-customer="Boolean(form.customerId)"
      :in-scope="checkResult.inScope"
      :has-active-same-type="checkResult.hasActiveSameType"
      :conflict-info="checkResult.conflictInfo"
    />

    <el-alert
      class="declare-hint"
      type="info"
      :closable="false"
      title="申报后进入「待客户确认」，7 天内客户未响应将自动生效"
    />
  </FormDialog>
</template>

<script setup lang="ts" name="DeclareBindingDialog">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import ServiceScopeCheck from './ServiceScopeCheck.vue';

import FormDialog from '@/components/form/FormDialog.vue';

import { vendorApi } from '@/api/vendor';
import { getDb } from '@/mock/db';

import type { BindingType, Tenant } from '@/types';

const emit = defineEmits<{
  /** 申报成功 */
  declared: [];
}>();

const visible = defineModel<boolean>('modelValue', { required: true });

const props = defineProps<{
  /** 待申报的设备 SN */
  deviceSn: string;
}>();

const submitting = ref(false);
const inScopeCustomers = ref<Tenant[]>([]);
const outScopeCustomers = ref<Tenant[]>([]);

const form = reactive({ type: 'OWNERSHIP' as BindingType, customerId: '' });

/** 校验结果（本地预校验，用于即时反馈；api 层会再校验一次） */
const checkResult = computed(() => {
  const db = getDb();
  const customer = [...inScopeCustomers.value, ...outScopeCustomers.value].find((c) => c.id === form.customerId);
  const inScope = Boolean(customer && inScopeCustomers.value.some((c) => c.id === customer.id));
  const active = db.bindings.find(
    (b) =>
      b.deviceSn === props.deviceSn &&
      b.type === form.type &&
      b.status === 'ACTIVE',
  );
  return {
    inScope,
    hasActiveSameType: Boolean(active),
    conflictInfo: active
      ? `已存在生效的${form.type === 'OWNERSHIP' ? '产权' : '装配'}绑定（客户 ${active.customerId}），需先申请解除`
      : '',
  };
});

const onSubmit = async (): Promise<void> => {
  if (!form.customerId) {
    ElMessage.warning('请选择客户');
    return;
  }
  submitting.value = true;
  try {
    const res = await vendorApi.declareBinding({
      deviceSn: props.deviceSn,
      customerId: form.customerId,
      type: form.type,
    });
    if (!res.ok) {
      ElMessage.error(res.message ?? '申报失败');
      return;
    }
    ElMessage.success('绑定申报已提交，等待客户确认（7 天倒计时已开始）');
    visible.value = false;
    emit('declared');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '申报失败');
  } finally {
    submitting.value = false;
  }
};

// 打开时加载客户列表
watch(visible, async (open) => {
  if (!open) return;
  form.customerId = '';
  inScopeCustomers.value = await vendorApi.getServiceScopeCustomers();
  const all = await vendorApi.getAllCustomers();
  const inScopeIds = new Set(inScopeCustomers.value.map((c) => c.id));
  outScopeCustomers.value = all.filter((c) => !inScopeIds.has(c.id));
});
</script>

<style scoped lang="scss">
.full {
  width: 100%;
}

.declare-hint {
  margin-top: 12px;
}
</style>