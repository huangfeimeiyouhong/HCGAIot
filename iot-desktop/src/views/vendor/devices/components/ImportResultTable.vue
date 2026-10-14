<!--
  导入结果表 —— 成功 N 行 / 失败 M 行 + 逐行原因
-->
<template>
  <div class="import-result">
    <div class="import-result__summary">
      <span class="summary-chip summary-chip--success">成功 {{ successCount }} 行</span>
      <span class="summary-chip summary-chip--fail">失败 {{ errors.length }} 行</span>
    </div>

    <el-table
      v-if="errors.length"
      :data="errors"
      border
      max-height="260"
    >
      <el-table-column
        prop="rowNo"
        label="行号"
        width="80"
        align="center"
      />
      <el-table-column
        prop="sn"
        label="设备 SN"
        width="180"
      >
        <template #default="{ row }">
          {{ row.sn || '（空）' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="reasonCode"
        label="错误类型"
        width="150"
      >
        <template #default="{ row }">
          <StatusBadge
            :label="codeLabel(row.reasonCode)"
            tone="reject"
            size="small"
          />
        </template>
      </el-table-column>
      <el-table-column
        prop="reason"
        label="失败原因"
        min-width="260"
      />
    </el-table>

    <el-alert
      v-else
      type="success"
      :closable="false"
      title="全部行导入成功"
      description="没有失败行，无需修正。"
    />
  </div>
</template>

<script setup lang="ts" name="ImportResultTable">
import StatusBadge from '@/components/data/StatusBadge.vue';

import type { ImportErrorRow } from '@/types';

interface Props {
  successCount: number;
  errors: ImportErrorRow[];
}

defineProps<Props>();

const codeLabel = (code: string): string => {
  const map: Record<string, string> = {
    SN_DUPLICATE: 'SN 重复',
    MODEL_NOT_FOUND: '型号不存在',
    FIELD_EMPTY: '必填为空',
    INVALID_DATE: '日期格式错误',
  };
  return map[code] ?? code;
};
</script>

<style scoped lang="scss">
.import-result {
  &__summary {
    display: flex;
    gap: 10px;
    margin-bottom: 12px;
  }
}

.summary-chip {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 12px;
  border-radius: 13px;
  font-size: 13px;
  font-weight: 500;

  &--success {
    background: var(--badge-success-bg);
    color: var(--badge-success-text);
  }

  &--fail {
    background: var(--badge-reject-bg);
    color: var(--badge-reject-text);
  }
}
</style>