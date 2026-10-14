<!--
  V-03 产品型号档案 —— 厂家视角型号台账（新增 / 编辑 / 启停）
  型号是设备建档与质保期计算的依据；停用后不可用于新设备建档，已建设备不受影响。
-->
<template>
  <PageContainer
    title="产品型号档案"
    desc="本厂产品型号台账：型号参数、质保期与通信协议。停用后不可用于新设备建档，已建档设备不受影响。"
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
          placeholder="型号编码 / 名称"
          clearable
        />
        <Select
          v-model="filters.category"
          label="品类"
          :options="categoryOptions"
          placeholder="全部品类"
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
      </template>
      <template #actions>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新增型号
        </el-button>
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="id"
      >
        <template #empty>
          <EmptyState
            text="无匹配型号"
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
      :title="editing ? `编辑型号 · ${editing.modelCode}` : '新增型号'"
      :model="form"
      :rules="rules"
      :loading="saving"
      confirm-text="保存"
      @confirm="onSave"
    >
      <el-form-item
        label="型号编码"
        prop="modelCode"
      >
        <el-input
          v-model="form.modelCode"
          placeholder="如 CK-XA-2026"
          :disabled="Boolean(editing)"
        />
      </el-form-item>
      <el-form-item
        label="型号名称"
        prop="name"
      >
        <el-input
          v-model="form.name"
          placeholder="如 商用燃气灶 XA 系列"
        />
      </el-form-item>
      <el-form-item
        label="所属品类"
        prop="category"
      >
        <el-select
          v-model="form.category"
          class="form-select"
          placeholder="请选择品类"
        >
          <el-option
            v-for="opt in categoryOptions"
            :key="String(opt.value)"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        label="质保期"
        prop="warrantyMonths"
      >
        <el-input-number
          v-model="form.warrantyMonths"
          class="form-number"
          :min="1"
          :max="120"
          :step="1"
        />
        <span class="form-suffix">个月</span>
      </el-form-item>
      <el-form-item
        label="通信协议"
        prop="protocol"
      >
        <el-input
          v-model="form.protocol"
          placeholder="如 MQTT/JSON"
        />
      </el-form-item>
      <el-form-item
        label="型号参数"
        prop="paramsText"
      >
        <el-input
          v-model="form.paramsText"
          type="textarea"
          :rows="3"
          placeholder="每行一条，格式：参数名=值，如 额定功率=12kW"
        />
      </el-form-item>
      <el-form-item
        label="状态"
        prop="status"
      >
        <el-radio-group v-model="form.status">
          <el-radio value="ACTIVE">
            启用
          </el-radio>
          <el-radio value="DISABLED">
            停用
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </FormDialog>
  </PageContainer>
</template>

<script setup lang="ts" name="ModelList">
import { h, onMounted, reactive, ref } from 'vue';
import { ElButton, ElMessage, ElSwitch } from 'element-plus';
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
import StatusBadge from '@/components/data/StatusBadge.vue';

import { DEVICE_CATEGORY_LABEL, DEVICE_CATEGORY_OPTIONS } from '@/constants/dict';
import { formatDateOnly } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';

import type { ProductModel, ModelStatus } from '@/types';

const categoryOptions = DEVICE_CATEGORY_OPTIONS;
const statusOptions = [
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'DISABLED' },
];

const filters = reactive({
  keyword: '',
  category: undefined as string | undefined,
  status: undefined as ModelStatus | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    vendorApi.getModelList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      category: filters.category,
      status: filters.status,
    }),
);

/** 型号 → 关联设备数（经 api 层取本厂设备后按型号编码聚合） */
const deviceCountByModel = ref<Record<string, number>>({});

const loadDeviceCount = async (): Promise<void> => {
  try {
    const res = await vendorApi.getDeviceList({ page: 1, pageSize: 500 });
    const map: Record<string, number> = {};
    res.list.forEach((d) => {
      map[d.modelCode] = (map[d.modelCode] ?? 0) + 1;
    });
    deviceCountByModel.value = map;
  } catch {
    deviceCountByModel.value = {};
  }
};

const editVisible = ref(false);
const saving = ref(false);
const editing = ref<ProductModel | null>(null);

const form = reactive({
  id: '',
  modelCode: '',
  name: '',
  category: 'COOKING' as ProductModel['category'],
  warrantyMonths: 12,
  protocol: 'MQTT/JSON',
  paramsText: '',
  status: 'ACTIVE' as ModelStatus,
});

const rules: FormRules = {
  modelCode: [
    { required: true, message: '型号编码为必填项', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9-]{4,24}$/, message: '4~24 位字母、数字或短横线', trigger: 'blur' },
  ],
  name: [{ required: true, message: '型号名称为必填项', trigger: 'blur' }],
  category: [{ required: true, message: '请选择所属品类', trigger: 'change' }],
  protocol: [{ required: true, message: '通信协议为必填项', trigger: 'blur' }],
};

/** 参数文本 → params 对象（每行「键=值」） */
const parseParams = (text: string): Record<string, string | number> => {
  const out: Record<string, string | number> = {};
  String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const idx = line.indexOf('=');
      if (idx <= 0) return;
      const key = line.slice(0, idx).trim();
      const raw = line.slice(idx + 1).trim();
      if (!key) return;
      const num = Number(raw);
      out[key] = raw !== '' && !Number.isNaN(num) && /^-?\d+(\.\d+)?$/.test(raw) ? num : raw;
    });
  return out;
};

/** params 对象 → 参数文本 */
const stringifyParams = (params: Record<string, string | number>): string =>
  Object.entries(params ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

/** 参数对象 → 表格展示串（最多 3 项，超出折叠） */
const formatParams = (params: Record<string, string | number>): string => {
  const entries = Object.entries(params ?? {});
  if (!entries.length) return '—';
  const head = entries.slice(0, 3).map(([k, v]) => `${k}：${v}`).join(' / ');
  return entries.length > 3 ? `${head} 等 ${entries.length} 项` : head;
};

const columns: DataTableColumn[] = [
  { prop: 'modelCode', label: '型号编码', width: 150 },
  { prop: 'name', label: '型号名称', minWidth: 190, showOverflowTooltip: true },
  {
    prop: 'category',
    label: '品类',
    width: 110,
    render: (row) => DEVICE_CATEGORY_LABEL[row.category as string] ?? row.category,
  },
  {
    prop: 'params',
    label: '型号参数',
    minWidth: 220,
    showOverflowTooltip: true,
    render: (row) => formatParams(row.params as Record<string, string | number>),
  },
  {
    prop: 'warrantyMonths',
    label: '质保期',
    width: 100,
    align: 'right',
    render: (row) => `${row.warrantyMonths} 个月`,
  },
  { prop: 'protocol', label: '通信协议', width: 120 },
  {
    prop: 'deviceCount',
    label: '关联设备',
    width: 100,
    align: 'right',
    render: (row) => deviceCountByModel.value[row.modelCode as string] ?? 0,
  },
  {
    prop: 'status',
    label: '状态',
    width: 90,
    render: (row) =>
      h(StatusBadge, {
        status: undefined,
        label: row.status === 'ACTIVE' ? '启用' : '停用',
        tone: row.status === 'ACTIVE' ? 'success' : 'closed',
      }),
  },
  {
    prop: 'createdAt',
    label: '建档时间',
    width: 110,
    render: (row) => formatDateOnly(row.createdAt as string),
  },
  {
    label: '操作',
    width: 150,
    fixed: 'right',
    render: (row) => {
      const m = row as ProductModel;
      return h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, [
        h(ElButton, { link: true, type: 'primary', onClick: () => openEdit(m) }, () => '编辑'),
        h(ElSwitch, {
          modelValue: m.status === 'ACTIVE',
          size: 'small',
          'before-change': () => Promise.resolve(true),
          onChange: (val: string | number | boolean) => void onToggle(m, val === true),
        }),
      ]);
    },
  },
];

const openCreate = (): void => {
  editing.value = null;
  form.id = '';
  form.modelCode = '';
  form.name = '';
  form.category = 'COOKING';
  form.warrantyMonths = 12;
  form.protocol = 'MQTT/JSON';
  form.paramsText = '';
  form.status = 'ACTIVE';
  editVisible.value = true;
};

const openEdit = (row: ProductModel): void => {
  editing.value = row;
  form.id = row.id;
  form.modelCode = row.modelCode;
  form.name = row.name;
  form.category = row.category;
  form.warrantyMonths = row.warrantyMonths;
  form.protocol = row.protocol;
  form.paramsText = stringifyParams(row.params);
  form.status = row.status;
  editVisible.value = true;
};

const onSave = async (): Promise<void> => {
  saving.value = true;
  try {
    await vendorApi.saveModel({
      id: form.id || undefined,
      modelCode: form.modelCode,
      name: form.name,
      category: form.category,
      warrantyMonths: form.warrantyMonths,
      protocol: form.protocol,
      params: parseParams(form.paramsText),
      status: form.status,
    });
    ElMessage.success(editing.value ? '型号已更新' : '型号已新增');
    editVisible.value = false;
    await loadData();
    await loadDeviceCount();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
};

/** 启停切换 */
const onToggle = async (row: ProductModel, next: boolean): Promise<void> => {
  const status: ModelStatus = next ? 'ACTIVE' : 'DISABLED';
  try {
    await vendorApi.toggleModel(row.id, status);
    ElMessage.success(next ? '型号已启用' : '型号已停用');
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(async () => {
  await loadData();
  await loadDeviceCount();
});
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 220px;
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
</style>
