<!--
  商务条件确认表单 —— SLA 三段时限（数值来自 constants/sla.ts 的默认值）
-->
<template>
  <el-form
    :model="form"
    label-width="100px"
    label-position="right"
  >
    <el-form-item label="优先级">
      <el-radio-group
        v-model="current"
        size="small"
      >
        <el-radio-button
          v-for="p in priorities"
          :key="p"
          :label="p"
        >
          {{ priorityLabel[p] }}
        </el-radio-button>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="接单时限">
      <el-input-number
        v-model="form[current].acceptHours"
        :min="0.5"
        :step="0.5"
        :controls="false"
        size="small"
      />
      <span class="unit">小时</span>
    </el-form-item>

    <el-form-item label="处理时限">
      <el-input-number
        v-model="form[current].handleHours"
        :min="1"
        :step="1"
        :controls="false"
        size="small"
      />
      <span class="unit">小时</span>
    </el-form-item>

    <el-form-item label="待验收时限">
      <el-input-number
        v-model="form[current].confirmHours"
        :min="1"
        :step="1"
        :controls="false"
        size="small"
      />
      <span class="unit">小时</span>
    </el-form-item>

    <el-form-item label="SLA 预览">
      <span class="preview">{{ preview }}</span>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts" name="BusinessTermsForm">
import { computed, ref } from 'vue';

import { PRIORITY_LABEL, formatHours } from '@/constants/sla';

import type { Priority, SlaCommitment } from '@/types';

const props = defineProps<{ modelValue: Record<Priority, SlaCommitment> }>();

// 表单直接改 prop 对象内部字段（纯编辑区），无需整对象 emit

const priorities: Priority[] = ['URGENT', 'HIGH', 'NORMAL', 'LOW'];
const priorityLabel = PRIORITY_LABEL;

/** 当前编辑的优先级 */
const current = ref<Priority>('NORMAL');

const form = props.modelValue;

const preview = computed(() => {
  const s = form[current.value];
  return `${priorityLabel[current.value]}：接单 ${formatHours(s.acceptHours)} / 处理 ${formatHours(s.handleHours)} / 待验收 ${formatHours(s.confirmHours)}`;
});
</script>

<style scoped lang="scss">
.unit {
  margin-left: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.preview {
  color: var(--color-primary-text);
  font-size: 13px;
}
</style>