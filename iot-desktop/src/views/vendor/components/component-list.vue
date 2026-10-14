<!--
  V-10 部件台账 —— 物联网厂家专属（厨具厂家访问会被守卫弹回 dashboard）
  部件 SN / 类型 / 固件版本 / 关联设备 / 数据缺失率 + 编辑固件与批次
  ⚠️ IoT 厂家视角的 stripFields 已裁剪厨具本体的型号参数与成本，本页不引用被裁字段
-->
<template>
  <PageContainer
    title="部件台账"
    desc="本厂物联网部件台账：固件版本、采集指标、关联设备与数据上报质量。"
  >
    <DemoTipBar />

    <FilterBar
      :has-filter="hasFilter"
      @clear="onClear"
    >
      <template #fields>
        <el-input
          v-model="filters.keyword"
          class="filter-input"
          placeholder="部件 SN / 设备 SN / 批次"
          clearable
        />
        <Select
          v-model="filters.type"
          label="部件类型"
          :options="typeOptions"
          placeholder="全部类型"
        />
      </template>
    </FilterBar>

    <section class="stats">
      <StatCard
        v-for="item in statCards"
        :key="item.key"
        :data="item"
        :clickable="false"
      />
    </section>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
      >
        <template #empty>
          <EmptyState
            text="无匹配部件"
            @clear="onClear"
          />
        </template>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </section>

    <FormDialog
      v-model="editVisible"
      :title="`编辑部件 · ${editing?.componentSn ?? ''}`"
      :model="form"
      :rules="rules"
      :loading="saving"
      confirm-text="保存"
      @confirm="onSave"
    >
      <el-form-item
        label="部件 SN"
        prop="componentSn"
      >
        <el-input
          v-model="form.componentSn"
          disabled
        />
      </el-form-item>
      <el-form-item
        label="部件类型"
        prop="type"
      >
        <el-select
          v-model="form.type"
          class="form-select"
          placeholder="请选择类型"
        >
          <el-option
            v-for="opt in typeOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        label="固件版本"
        prop="firmwareVersion"
      >
        <el-input
          v-model="form.firmwareVersion"
          placeholder="如 v2.1.3"
        />
      </el-form-item>
      <el-form-item
        label="生产批次"
        prop="batch"
      >
        <el-input
          v-model="form.batch"
          placeholder="如 B003"
        />
      </el-form-item>
      <el-form-item
        label="数据缺失率"
        prop="dataMissingRate"
      >
        <el-input-number
          v-model="form.dataMissingRate"
          class="form-number"
          :min="0"
          :max="100"
          :step="0.1"
          :precision="1"
        />
        <span class="form-suffix">%</span>
      </el-form-item>
      <el-form-item label="采集指标">
        <div class="metric-tags">
          <el-tag
            v-for="m in form.metricSet"
            :key="m"
            type="info"
            size="small"
          >
            {{ m }}
          </el-tag>
          <span
            v-if="!form.metricSet.length"
            class="metric-empty"
          >—</span>
        </div>
      </el-form-item>
    </FormDialog>
  </PageContainer>
</template>

<script setup lang="ts" name="ComponentList">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';
import type { FormRules } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import FormDialog from '@/components/form/FormDialog.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';
import StatCard from '@/components/data/StatCard.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { COMPONENT_TYPE_LABEL, COMPONENT_TYPE_OPTIONS } from '@/constants/dict';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';

import type { Component, ComponentType, StatCardData } from '@/types';

const typeOptions = COMPONENT_TYPE_OPTIONS;

const filters = reactive({
  keyword: '',
  type: undefined as ComponentType | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    vendorApi.getComponentList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      type: filters.type,
    }),
);

/** 概览：部件总数 / 高缺失率部件数 / 平均缺失率 / 固件版本种类 */
const statCards = computed<StatCardData[]>(() => {
  const rows = tableData.value as Array<Component & { deviceName: string }>;
  const missing = rows.filter((r) => r.dataMissingRate > 5).length;
  const avg = rows.length
    ? Number((rows.reduce((s, r) => s + r.dataMissingRate, 0) / rows.length).toFixed(1))
    : 0;
  return [
    { key: 'total', label: '部件总数', value: total.value, unit: '个', tone: 'primary' },
    { key: 'missing', label: '高缺失率部件', value: missing, unit: '个', tone: missing > 0 ? 'danger' : 'success' },
    { key: 'avg', label: '平均数据缺失率', value: avg, unit: '%', tone: avg > 5 ? 'warning' : 'info' },
    {
      key: 'firmware',
      label: '固件版本种类',
      value: new Set(rows.map((r) => r.firmwareVersion)).size,
      unit: '种',
      tone: 'purple',
    },
  ];
});

const editVisible = ref(false);
const saving = ref(false);
const editing = ref<(Component & { deviceName: string }) | null>(null);

const form = reactive({
  id: '',
  componentSn: '',
  type: 'TEMP_SENSOR' as ComponentType,
  firmwareVersion: '',
  batch: '',
  dataMissingRate: 0,
  metricSet: [] as string[],
  deviceSn: '',
});

const rules: FormRules = {
  firmwareVersion: [{ required: true, message: '固件版本为必填项', trigger: 'blur' }],
  batch: [{ required: true, message: '生产批次为必填项', trigger: 'blur' }],
};

const columns: DataTableColumn[] = [
  { prop: 'componentSn', label: '部件 SN', width: 170 },
  {
    prop: 'type',
    label: '部件类型',
    width: 130,
    render: (row) => COMPONENT_TYPE_LABEL[row.type as string] ?? row.type,
  },
  { prop: 'firmwareVersion', label: '固件版本', width: 110 },
  { prop: 'deviceSn', label: '关联设备 SN', width: 170 },
  { prop: 'deviceName', label: '关联设备', minWidth: 170, showOverflowTooltip: true },
  { prop: 'batch', label: '生产批次', width: 110 },
  {
    prop: 'metricSet',
    label: '采集指标',
    minWidth: 200,
    render: (row) => ((row.metricSet as string[]) ?? []).join('、') || '—',
  },
  {
    prop: 'dataMissingRate',
    label: '数据缺失率',
    width: 120,
    align: 'right',
    render: (row) =>
      h(StatusBadge, {
        status: undefined,
        label: `${Number(row.dataMissingRate).toFixed(1)}%`,
        tone: Number(row.dataMissingRate) > 5 ? 'reject' : 'success',
      }),
  },
  {
    label: '操作',
    width: 90,
    fixed: 'right',
    render: (row) => {
      const c = row as Component & { deviceName: string };
      return h(ElButton, { link: true, type: 'primary', onClick: () => openEdit(c) }, () => '编辑');
    },
  },
];

const openEdit = (row: Component & { deviceName: string }): void => {
  editing.value = row;
  form.id = row.id;
  form.componentSn = row.componentSn;
  form.type = row.type;
  form.firmwareVersion = row.firmwareVersion;
  form.batch = row.batch;
  form.dataMissingRate = row.dataMissingRate;
  form.metricSet = [...row.metricSet];
  form.deviceSn = row.deviceSn;
  editVisible.value = true;
};

const onSave = async (): Promise<void> => {
  saving.value = true;
  try {
    await vendorApi.saveComponent({
      id: form.id,
      type: form.type,
      firmwareVersion: form.firmwareVersion,
      batch: form.batch,
      dataMissingRate: form.dataMissingRate,
      deviceSn: form.deviceSn,
      componentSn: form.componentSn,
      metricSet: form.metricSet,
    });
    ElMessage.success('部件已更新');
    editVisible.value = false;
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(loadData);
</script>

<style scoped lang="scss">
.filter-input {
  width: 240px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}

.form-select {
  width: 100%;
}

.form-number {
  width: 160px;
}

.form-suffix {
  margin-left: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.metric-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.metric-empty {
  color: var(--color-text-disabled);
}
</style>
