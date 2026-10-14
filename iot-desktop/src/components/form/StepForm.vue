<!--
  分步表单 —— 入驻申请 4 步用
  locked 时所有表单项置灰（提交审核后关键字段锁定）
-->
<template>
  <div class="hi-step-form">
    <el-steps
      :active="active"
      align-center
      finish-status="success"
      class="hi-step-form__steps"
    >
      <el-step
        v-for="s in steps"
        :key="s.key"
        :title="s.title"
        :description="s.description"
      />
    </el-steps>

    <div
      v-if="locked"
      class="hi-step-form__locked"
    >
      <el-icon><Lock /></el-icon>
      申请已提交，关键字段已锁定。如需修改请联系平台运营退回。
    </div>

    <el-form
      ref="formRef"
      :model="model"
      :disabled="locked"
      label-width="120px"
      label-position="right"
    >
      <slot
        :step="active"
        :step-key="steps[active]?.key"
        :locked="locked"
      />
    </el-form>

    <div class="hi-step-form__footer">
      <el-button
        :disabled="active === 0"
        @click="active -= 1"
      >
        上一步
      </el-button>
      <el-button
        v-if="active < steps.length - 1"
        type="primary"
        @click="next"
      >
        下一步
      </el-button>
      <el-button
        v-else
        type="primary"
        :loading="submitting"
        @click="onSubmit"
      >
        提交
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts" name="StepForm">
import { ref } from 'vue';
import type { FormInstance } from 'element-plus';

/** 步骤定义 */
export interface StepDef {
  key: string;
  title: string;
  description?: string;
}

interface Props {
  steps: StepDef[];
  model: Record<string, any>;
  /** 锁定态：提交后关键字段不可编辑 */
  locked?: boolean;
  submitting?: boolean;
  initialStep?: number;
}

const props = withDefaults(defineProps<Props>(), {
  locked: false,
  submitting: false,
  initialStep: 0,
});

const emit = defineEmits<{
  submit: [];
}>();

const active = ref(props.initialStep);
const formRef = ref<FormInstance>();

/** 下一步：先校验当前步再前进 */
const next = async (): Promise<void> => {
  if (!formRef.value) {
    active.value += 1;
    return;
  }
  try {
    await formRef.value.validate();
    active.value += 1;
  } catch {
    // 当前步校验失败，停留在本步
  }
};

/** 提交：全量校验后 emit */
const onSubmit = async (): Promise<void> => {
  if (!formRef.value) {
    emit('submit');
    return;
  }
  try {
    await formRef.value.validate();
    emit('submit');
  } catch {
    // 校验失败，错误由 el-form 展示
  }
};
</script>

<style scoped lang="scss">
.hi-step-form {
  &__steps {
    margin-bottom: 20px;
  }

  &__locked {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    margin-bottom: 16px;
    border-radius: var(--layout-card-radius);
    background: var(--badge-closed-bg);
    color: var(--badge-closed-text);
    font-size: 13px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
}
</style>