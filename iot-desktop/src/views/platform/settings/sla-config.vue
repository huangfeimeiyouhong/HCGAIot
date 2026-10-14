<!--
  P-16 SLA 时限配置
-->
<template>
  <PageContainer
    title="SLA 时限配置"
    desc="四级优先级 × 三段时限（接单 / 处理 / 待验收），改一处全局生效"
  >
    <DemoTipBar />

    <el-alert
      class="notice"
      type="info"
      :closable="false"
      title="当前数值为架构阶段的假设值（待 Phil 确认），集中定义在 src/constants/sla.ts，修改后倒计时与 SLA 预览文案会同步变化"
    />

    <section class="card">
      <el-table
        :data="rows"
        border
      >
        <el-table-column
          prop="priority"
          label="优先级"
          width="120"
        >
          <template #default="{ row }">
            <StatusBadge :status="row.priority" />
          </template>
        </el-table-column>
        <el-table-column label="接单时限（小时）" min-width="220">
          <template #default="{ row }">
            <el-input-number
              v-model="row.acceptHours"
              :min="0.5"
              :step="0.5"
              :controls="false"
              size="small"
              class="cell-input"
            />
          </template>
        </el-table-column>
        <el-table-column label="处理时限（小时）" min-width="220">
          <template #default="{ row }">
            <el-input-number
              v-model="row.handleHours"
              :min="1"
              :step="1"
              :controls="false"
              size="small"
              class="cell-input"
            />
          </template>
        </el-table-column>
        <el-table-column label="待验收时限（小时）" min-width="220">
          <template #default="{ row }">
            <el-input-number
              v-model="row.confirmHours"
              :min="1"
              :step="1"
              :controls="false"
              size="small"
              class="cell-input"
            />
          </template>
        </el-table-column>
        <el-table-column label="SLA 预览文案" min-width="320">
          <template #default="{ row }">
            <span class="preview-text">{{ previewOf(row) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer">
        <el-button @click="onReset">恢复默认</el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="onSave"
        >
          保存配置
        </el-button>
      </div>
    </section>

    <section class="card">
      <h3 class="section-title">
        三级升级阈值
      </h3>
      <el-table
        :data="escalationRows"
        border
      >
        <el-table-column
          prop="level"
          label="级别"
          width="100"
        />
        <el-table-column
          prop="threshold"
          label="触发条件"
          width="180"
        />
        <el-table-column
          prop="action"
          label="升级动作"
          min-width="380"
        />
      </el-table>
    </section>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformSla">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';

import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { ESCALATION_TEXT, ESCALATION_THRESHOLD, PRIORITY_LABEL, SLA_DEFAULT, formatHours } from '@/constants/sla';

import { platformApi } from '@/api';

import type { Priority, SlaConfigRow } from '@/types';

const rows = ref<SlaConfigRow[]>([]);
const saving = ref(false);

/** 升级阈值说明（只读展示，阈值本身在 constants/sla.ts） */
const escalationRows = [
  { level: '一级', threshold: `≥ ${Math.round(ESCALATION_THRESHOLD.L1 * 100)}%`, action: `站内信提醒：${ESCALATION_TEXT[1]}` },
  { level: '二级', threshold: `≥ ${Math.round(ESCALATION_THRESHOLD.L2 * 100)}%`, action: `站内信 + 短信催办：${ESCALATION_TEXT[2]}` },
  { level: '三级', threshold: `≥ ${Math.round(ESCALATION_THRESHOLD.L3 * 100)}%`, action: `平台介入并标记争议：${ESCALATION_TEXT[3]}` },
];

/** SLA 预览文案 */
const previewOf = (row: SlaConfigRow): string =>
  `${PRIORITY_LABEL[row.priority as Priority]}：接单 ${formatHours(row.acceptHours)} / 处理 ${formatHours(row.handleHours)} / 待验收 ${formatHours(row.confirmHours)}`;

const load = async (): Promise<void> => {
  rows.value = await platformApi.getSlaConfig();
};

const onSave = async (): Promise<void> => {
  saving.value = true;
  try {
    rows.value = await platformApi.saveSlaConfig(rows.value);
    ElMessage.success('SLA 配置已保存，全局生效');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
};

const onReset = async (): Promise<void> => {
  rows.value = (Object.keys(SLA_DEFAULT) as Priority[]).map((priority) => ({
    priority,
    ...SLA_DEFAULT[priority],
  }));
  ElMessage.info('已恢复为默认值，点击「保存配置」生效');
};

onMounted(load);
</script>

<style scoped lang="scss">
.notice {
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
}

.section-title {
  margin-bottom: 14px;
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

.cell-input {
  width: 140px;
}

.preview-text {
  color: var(--color-primary-text);
  font-size: 13px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
}
</style>