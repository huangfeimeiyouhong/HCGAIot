<!--
  批量导入弹窗 —— 模板下载占位 → 模拟选择文件 → 解析 → 调 api 导入
-->
<template>
  <FormDialog
    v-model="visible"
    title="批量导入设备"
    width="680"
    :model="formModel"
    confirm-text="开始导入"
    :loading="importing"
    @confirm="onImport"
  >
    <el-steps
      :active="step"
      simple
      class="import-steps"
    >
      <el-step title="下载模板" />
      <el-step title="选择文件" />
      <el-step title="导入结果" />
    </el-steps>

    <!-- 步骤 1：模板 -->
    <div
      v-if="step === 0"
      class="import-body"
    >
      <p class="import-tip">
        请先下载标准模板，按模板格式填写后再导入。模板包含以下必填列：
      </p>
      <ul class="import-columns">
        <li><code>sn</code> 设备 SN（唯一，重复会失败）</li>
        <li><code>modelCode</code> 产品型号（必须已存在于型号档案）</li>
        <li><code>name</code> 设备名称（必填）</li>
        <li><code>manufactureDate</code> 出厂日期（选填，格式须合法）</li>
        <li><code>location</code> 安装位置（选填）</li>
      </ul>
      <div class="import-actions">
        <el-button @click="onDownloadTemplate">下载模板（占位）</el-button>
        <el-button
          type="primary"
          plain
          @click="step = 1"
        >
          我已准备好文件，下一步
        </el-button>
      </div>
    </div>

    <!-- 步骤 2：选择文件 -->
    <div
      v-else-if="step === 1"
      class="import-body"
    >
      <p class="import-tip">
        演示环境不提供真实文件上传，可直接使用内置示例数据模拟导入
        （含 3 类错误：SN 重复 / 型号不存在 / 必填为空）。
      </p>
      <div class="import-actions">
        <el-button @click="step = 0">上一步</el-button>
        <el-button
          type="primary"
          @click="useSample"
        >
          使用示例数据（5 行，2 行错误）
        </el-button>
      </div>
      <el-alert
        v-if="fileName"
        class="import-file"
        type="success"
        :closable="false"
        :title="`已选择：${fileName}（共 ${rows.length} 行）`"
      />
    </div>

    <!-- 步骤 3：结果 -->
    <div
      v-else
      class="import-body"
    >
      <ImportResultTable
        :success-count="result?.successCount ?? 0"
        :errors="result?.errors ?? []"
      />
      <div class="import-actions">
        <el-button @click="step = 1">重新选择文件</el-button>
        <el-button
          v-if="result && result.errors.length"
          type="primary"
          @click="step = 1"
        >
          修正后重新导入
        </el-button>
        <el-button
          v-if="result"
          @click="close"
        >
          完成
        </el-button>
      </div>
    </div>
  </FormDialog>
</template>

<script setup lang="ts" name="ImportDialog">
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

import ImportResultTable from './ImportResultTable.vue';

import FormDialog from '@/components/form/FormDialog.vue';

import { vendorApi } from '@/api/vendor';
import { getDb } from '@/mock/db';

import type { ImportErrorRow, ParsedRows } from '@/types';

const emit = defineEmits<{
  /** 导入完成（父组件刷新列表） */
  imported: [];
}>();

const visible = defineModel<boolean>('modelValue', { required: true });

/** FormDialog 要求一个 model 对象（分步向导自身管理数据，这里给空壳满足契约） */
const formModel = reactive<Record<string, never>>({});

const step = ref(0);
const fileName = ref('');
const rows = ref<Array<Record<string, string>>>([]);
const importing = ref(false);
const result = ref<{ successCount: number; errors: ImportErrorRow[] } | null>(null);

/** 每次打开重置 */
watch(visible, (open) => {
  if (open) {
    step.value = 0;
    fileName.value = '';
    rows.value = [];
    result.value = null;
  }
});

const close = (): void => {
  visible.value = false;
  emit('imported');
};

/** 模板下载（占位） */
const onDownloadTemplate = (): void => {
  ElMessage.info('演示环境不提供真实模板文件下载，正式环境将导出 Excel 模板');
};

/** 使用示例数据：从内存库取真实 SN 以制造「SN 重复」错误 */
const useSample = (): void => {
  const db = getDb();
  const existing = db.devices.slice(0, 2);
  rows.value = [
    // 1：正常行
    { sn: 'CK-XA-2026-9001', modelCode: 'CK-XA-2026', name: '新导入炒炉 A', manufactureDate: '2026-09-01', location: '福州一号灶档' },
    // 2：SN 重复
    { sn: existing[0]?.sn ?? 'CK-XA-2026-0001', modelCode: 'CK-XA-2026', name: '重复 SN 行', location: '福州二号灶档' },
    // 3：型号不存在
    { sn: 'CK-ZZ-2026-9002', modelCode: 'CK-NOT-EXIST', name: '型号不存在行', location: '福州三号灶档' },
    // 4：必填为空
    { sn: 'CK-XA-2026-9003', modelCode: '', name: '', location: '福州四号灶档' },
    // 5：正常行
    { sn: 'CK-RF-2026-9004', modelCode: 'CK-RF-2026', name: '新导入冷柜 B', manufactureDate: '2026-08-15', location: '福州冷藏库' },
  ];
  fileName.value = '设备导入示例.xlsx';
  step.value = 2;
  importing.value = false;
};

/** 执行导入 */
const onImport = async (): Promise<void> => {
  if (step.value !== 2) {
    step.value += 1;
    return;
  }
  importing.value = true;
  try {
    const payload: ParsedRows = { fileName: fileName.value, rows: rows.value };
    result.value = await vendorApi.batchImportDevices(payload);
    if (result.value.errors.length === 0) {
      ElMessage.success(`导入成功 ${result.value.successCount} 条`);
    } else {
      ElMessage.warning(`成功 ${result.value.successCount} 条，失败 ${result.value.errors.length} 条，请查看逐行原因`);
    }
    emit('imported');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导入失败');
  } finally {
    importing.value = false;
  }
};

/** 确认按钮文案随步骤变化 */
const confirmLabel = computed(() => (step.value < 2 ? '下一步' : '确定'));
void confirmLabel;
</script>

<style scoped lang="scss">
.import-steps {
  margin-bottom: 18px;
}

.import-body {
  min-height: 180px;
}

.import-tip {
  color: var(--color-text-body);
  font-size: 13px;
  line-height: 1.8;
}

.import-columns {
  margin: 10px 0 0;
  padding-left: 20px;

  li {
    color: var(--color-text-secondary);
    font-size: 12px;
    line-height: 1.9;
  }

  code {
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--color-fill-light);
    color: var(--color-primary-text);
  }
}

.import-actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.import-file {
  margin-top: 14px;
}
</style>