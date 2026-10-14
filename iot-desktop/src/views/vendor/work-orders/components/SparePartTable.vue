<!--
  备件表 —— 只读展示 / 可编辑登记（含旧件回收与去向）
-->
<template>
  <div class="spare-table">
    <el-table
      v-if="parts.length"
      :data="parts"
      border
      max-height="320"
    >
      <el-table-column
        prop="name"
        label="备件名称"
        min-width="150"
      />
      <el-table-column
        prop="spec"
        label="规格"
        width="130"
      />
      <el-table-column
        prop="quantity"
        label="数量"
        width="90"
        align="right"
        type="number"
      />
      <el-table-column
        prop="sn"
        label="备件 SN"
        width="130"
      >
        <template #default="{ row }">{{ row.sn || '—' }}</template>
      </el-table-column>
      <el-table-column
        label="旧件回收"
        width="110"
      >
        <template #default="{ row }">
          <StatusBadge
            :label="row.oldPartRecycled ? '已回收' : '未回收'"
            :tone="row.oldPartRecycled ? 'success' : 'notice'"
            size="small"
          />
        </template>
      </el-table-column>
      <el-table-column
        prop="oldPartDestination"
        label="旧件去向"
        min-width="140"
      >
        <template #default="{ row }">{{ row.oldPartDestination || '—' }}</template>
      </el-table-column>
      <el-table-column
        label="操作"
        v-if="editable"
        width="80"
      >
        <template #default="{ $index }">
          <el-button
            link
            type="danger"
            @click="removeRow($index)"
          >
            移除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <EmptyState
      v-else-if="!editable"
      text="暂无备件更换记录"
      desc="反馈处理结果时可登记更换的备件"
    />

    <!-- 可编辑时：新增行 -->
    <div
      v-if="editable"
      class="spare-table__editor"
    >
      <div class="editor-row">
        <el-input
          v-model="draft.name"
          size="small"
          placeholder="备件名称"
          class="f1"
        />
        <el-input
          v-model="draft.spec"
          size="small"
          placeholder="规格"
          class="f1"
        />
        <el-input-number
          v-model="draft.quantity"
          :min="1"
          :controls="false"
          size="small"
          class="qty"
        />
        <el-input
          v-model="draft.sn"
          size="small"
          placeholder="备件 SN（选填）"
          class="f1"
        />
      </div>
      <div class="editor-row">
        <el-checkbox v-model="draft.oldPartRecycled">
          旧件已回收
        </el-checkbox>
        <el-input
          v-if="draft.oldPartRecycled"
          v-model="draft.oldPartDestination"
          size="small"
          placeholder="旧件去向，如：厂家回收仓"
          class="f1"
        />
        <el-button
          type="primary"
          plain
          size="small"
          @click="addRow"
        >
          + 添加备件
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" name="SparePartTable">
import { reactive } from 'vue';

import EmptyState from '@/components/data/EmptyState.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import type { SparePart } from '@/types';

interface Props {
  parts: SparePart[];
  /** 是否可编辑（反馈表单内登记备件时为 true） */
  editable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  editable: false,
});

const emit = defineEmits<{
  'update:parts': [value: SparePart[]];
}>();

const draft = reactive({
  name: '',
  spec: '',
  quantity: 1,
  sn: '',
  oldPartRecycled: true,
  oldPartDestination: '厂家回收仓',
});

const addRow = (): void => {
  if (!draft.name.trim()) return;
  emit('update:parts', [
    ...props.parts,
    {
      id: `SP-DRAFT-${props.parts.length + 1}`,
      orderCode: '',
      name: draft.name,
      spec: draft.spec,
      quantity: draft.quantity,
      sn: draft.sn || undefined,
      oldPartRecycled: draft.oldPartRecycled,
      oldPartDestination: draft.oldPartRecycled ? draft.oldPartDestination : undefined,
      createdAt: '',
    },
  ]);
  draft.name = '';
  draft.spec = '';
  draft.sn = '';
  draft.quantity = 1;
};

const removeRow = (index: number): void => {
  const next = [...props.parts];
  next.splice(index, 1);
  emit('update:parts', next);
};
</script>

<style scoped lang="scss">
.spare-table {
  &__editor {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed var(--color-border);
  }
}

.editor-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.f1 {
  flex: 1;
  min-width: 120px;
}

.qty {
  width: 90px;
}
</style>