<!--
  C-11 阈值设置 —— 客户视角
  管理本租户自定义告警阈值；支持启停与新增。
-->
<template>
  <PageContainer
    title="阈值设置"
    desc="为您的设备设定自定义告警阈值，超出阈值时将触发告警提醒。"
  >
    <template #extra>
      <el-button
        type="primary"
        @click="openCreate"
      >
        新增阈值
      </el-button>
    </template>

    <DemoTipBar />

    <section class="card">
      <DataTable
        :data="list"
        :columns="columns"
        :loading="loading"
        row-key="id"
      />
      <EmptyState
        v-if="!loading && !list.length"
        text="暂无自定义阈值"
        desc="点击右上角「新增阈值」为设备设定告警条件"
      />
    </section>

    <!-- 新增阈值弹窗 -->
    <el-dialog
      v-model="createVisible"
      title="新增阈值"
      width="480"
      align-center
      append-to-body
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item
          label="设备 SN"
          prop="deviceSn"
        >
          <el-input
            v-model="form.deviceSn"
            placeholder="请输入设备 SN"
          />
        </el-form-item>
        <el-form-item
          label="监测指标"
          prop="metricKey"
        >
          <el-select
            v-model="form.metricKey"
            placeholder="请选择指标"
            style="width: 100%"
          >
            <el-option
              v-for="m in metricOptions"
              :key="m.value"
              :label="m.label"
              :value="m.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="阈值"
          prop="threshold"
        >
          <el-input-number
            v-model="form.threshold"
            :min="0"
            :step="0.1"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="告警等级"
          prop="level"
        >
          <el-select
            v-model="form.level"
            placeholder="请选择等级"
            style="width: 100%"
          >
            <el-option
              label="紧急"
              value="URGENT"
            />
            <el-option
              label="重要"
              value="IMPORTANT"
            />
            <el-option
              label="普通"
              value="NORMAL"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="onCreate"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerThresholdList">
import { h, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElSwitch } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { METRIC_LABEL, METRIC_OPTIONS } from '@/constants/dict';

import { customerApi } from '@/api/customer';

import type { CustomerThreshold, StatusTone } from '@/types';

const list = ref<CustomerThreshold[]>([]);
const loading = ref(false);
const createVisible = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const metricOptions = METRIC_OPTIONS;

const LEVEL_LABEL: Record<string, string> = { URGENT: '紧急', IMPORTANT: '重要', NORMAL: '普通' };
/** 告警等级 → 徽标色调（与 constants/statusMap.ts 的 URGENT/IMPORTANT/NORMAL 全局映射一致） */
const LEVEL_TONE: Record<string, StatusTone> = {
  URGENT: 'reject',
  IMPORTANT: 'notice',
  NORMAL: 'info',
};

const form = reactive<{ deviceSn: string; metricKey: string; threshold: number; level: 'URGENT' | 'IMPORTANT' | 'NORMAL' }>(
  { deviceSn: '', metricKey: 'temperature', threshold: 0, level: 'IMPORTANT' },
);

const rules: FormRules = {
  deviceSn: [{ required: true, message: '请输入设备 SN', trigger: 'blur' }],
  metricKey: [{ required: true, message: '请选择指标', trigger: 'change' }],
  level: [{ required: true, message: '请选择等级', trigger: 'change' }],
};

/** 表格列 */
const columns: DataTableColumn[] = [
  { prop: 'deviceSn', label: '设备 SN', width: 160 },
  {
    prop: 'metricKey',
    label: '监测指标',
    width: 130,
    render: (row) => METRIC_LABEL[row.metricKey as string] ?? row.metricKey,
  },
  { prop: 'threshold', label: '阈值', width: 120, align: 'right', type: 'number' },
  {
    prop: 'level',
    label: '告警等级',
    width: 100,
    render: (row) =>
      h(StatusBadge, {
        label: LEVEL_LABEL[row.level as string] ?? String(row.level),
        tone: LEVEL_TONE[row.level as string] ?? 'success',
      }),
  },
  {
    prop: 'enabled',
    label: '启用',
    width: 90,
    align: 'center',
    render: (row) => {
      const r = row as CustomerThreshold;
      return h(ElSwitch, {
        modelValue: r.enabled,
        'before-change': () => Promise.resolve(true),
        onChange: (val: string | number | boolean) => void onToggle(r, val === true),
      });
    },
  },
];

/** 加载阈值 */
const load = async (): Promise<void> => {
  loading.value = true;
  try {
    list.value = await customerApi.getThresholds();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '加载失败');
  } finally {
    loading.value = false;
  }
};

/** 启停阈值 */
const onToggle = async (row: CustomerThreshold, val: boolean): Promise<void> => {
  const prev = row.enabled;
  row.enabled = val; // 乐观更新
  try {
    await customerApi.toggleThreshold(row.id, val);
    ElMessage.success(val ? '已启用' : '已停用');
  } catch (error) {
    row.enabled = prev; // 回滚
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

/** 打开新增弹窗 */
const openCreate = (): void => {
  form.deviceSn = '';
  form.metricKey = 'temperature';
  form.threshold = 0;
  form.level = 'IMPORTANT';
  createVisible.value = true;
  formRef.value?.clearValidate();
};

/** 新增阈值 */
const onCreate = async (): Promise<void> => {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    submitting.value = true;
    try {
      await customerApi.saveThreshold({ ...form });
      ElMessage.success('阈值已保存');
      createVisible.value = false;
      await load();
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '保存失败');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(load);
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}
</style>
