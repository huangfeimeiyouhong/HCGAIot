<!--
  V-04 设备清单 —— 批量导入 + 单台新增 + 申报绑定 + 解绑 + 归档
-->
<template>
  <PageContainer
    title="设备清单"
    desc="本厂家设备的台账维护：批量导入、单台新增、绑定申报"
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
          placeholder="SN / 名称 / 型号 / 位置"
          clearable
        />
        <Select
          v-model="filters.category"
          label="品类"
          :options="categoryOptions"
          placeholder="全部品类"
        />
        <Select
          v-model="filters.modelCode"
          label="型号"
          :options="modelOptions"
          placeholder="全部型号"
          filterable
        />
        <Select
          v-model="filters.status"
          label="状态"
          :options="statusOptions"
          placeholder="全部状态"
        />
      </template>
      <template #actions>
        <el-button @click="openImport">批量导入</el-button>
        <el-button type="primary" @click="openCreate">单台新增</el-button>
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="sn"
      >
        <template #empty>
          <EmptyState text="无匹配结果" @clear="onClear" />
        </template>
      </DataTable>
      <Pagination
        v-model:page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        @change="loadData"
      />
    </section>

    <!-- 单台新增 -->
    <FormDialog
      v-model="createVisible"
      title="单台新增设备"
      :model="createForm"
      :loading="saving"
      @confirm="onCreate"
    >
      <el-form-item label="设备 SN">
        <el-input
          v-model="createForm.sn"
          placeholder="如 CK-XA-2026-0001"
        />
      </el-form-item>
      <el-form-item label="设备名称">
        <el-input
          v-model="createForm.name"
          placeholder="请输入设备名称"
        />
      </el-form-item>
      <el-form-item label="产品型号">
        <el-select
          v-model="createForm.modelCode"
          class="full"
          placeholder="选择型号"
        >
          <el-option
            v-for="m in models"
            :key="m.modelCode"
            :label="`${m.modelCode} · ${m.name}`"
            :value="m.modelCode"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="出厂日期">
        <el-date-picker
          v-model="createForm.manufactureDate"
          type="date"
          value-format="YYYY-MM-DDTHH:mm:ss.sssZ"
          class="full"
        />
      </el-form-item>
      <el-form-item label="安装位置">
        <el-input
          v-model="createForm.location"
          placeholder="如 福州一号灶档"
        />
      </el-form-item>
      <el-form-item label="质保期至">
        <el-input
          :model-value="warrantyPreview"
          disabled
        />
        <span class="form-tip">由型号质保月数自动计算，不可手动修改</span>
      </el-form-item>
    </FormDialog>

    <!-- 批量导入 -->
    <ImportDialog
      v-model="importVisible"
      @imported="onImported"
    />

    <!-- 申报绑定 -->
    <DeclareBindingDialog
      v-model="declareVisible"
      :device-sn="pendingDeviceSn"
      @declared="loadData"
    />

    <!-- 解绑申请 -->
    <ConfirmDialog
      v-model="unbindVisible"
      title="确认申请解绑"
      :message="`解绑需客户或平台确认生效，申请后该绑定进入「待解除」状态。确认对设备 ${pendingBinding?.deviceSn} 申请解绑？`"
      require-reason
      reason-label="解绑原因"
      tone="warning"
      @confirm="onUnbind"
    />

    <!-- 下线归档 -->
    <ConfirmDialog
      v-model="archiveVisible"
      title="确认下线归档"
      :message="`归档后设备状态变为「未启用」，不再接收告警与工单。确认归档设备 ${pendingDeviceSn}？`"
      tone="danger"
      @confirm="onArchive"
    />
  </PageContainer>
</template>

<script setup lang="ts" name="VendorDevices">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

import DeclareBindingDialog from './components/DeclareBindingDialog.vue';
import ImportDialog from './components/ImportDialog.vue';

import ConfirmDialog from '@/components/feedback/ConfirmDialog.vue';
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

import { DEVICE_CATEGORY_OPTIONS } from '@/constants/dict';
import { addHours, formatDateOnly, formatDateTime } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';
import { MODEL_WARRANTY } from '@/mock/factories/catalog';

import type { Binding, DeviceCategory, DeviceStatus, ProductModel } from '@/types';

const router = useRouter();

const categoryOptions = DEVICE_CATEGORY_OPTIONS;
const statusOptions = [
  { label: '在线', value: 'ONLINE' },
  { label: '离线', value: 'OFFLINE' },
  { label: '异常', value: 'ABNORMAL' },
  { label: '维修中', value: 'REPAIRING' },
  { label: '未启用', value: 'INACTIVE' },
];

const filters = reactive({
  keyword: '',
  category: undefined as DeviceCategory | undefined,
  modelCode: undefined as string | undefined,
  status: undefined as DeviceStatus | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    vendorApi.getDeviceList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      category: filters.category,
      modelCode: filters.modelCode,
      status: filters.status,
    }),
);

const models = ref<ProductModel[]>([]);
const modelOptions = computed(() => models.value.map((m) => ({ label: m.modelCode, value: m.modelCode })));

const createVisible = ref(false);
const saving = ref(false);
const createForm = reactive({
  sn: '',
  name: '',
  modelCode: '',
  manufactureDate: new Date().toISOString(),
  location: '',
});

/** 质保期至预览（型号策略自动计算） */
const warrantyPreview = computed(() => {
  const months = MODEL_WARRANTY[createForm.modelCode];
  if (!months) return '选择型号后自动计算';
  return formatDateOnly(addHours(createForm.manufactureDate, months * 24 * 30));
});

const importVisible = ref(false);
const declareVisible = ref(false);
const pendingDeviceSn = ref('');
const unbindVisible = ref(false);
const pendingBinding = ref<Binding | null>(null);
const archiveVisible = ref(false);

const columns: DataTableColumn[] = [
  { prop: 'sn', label: '设备 SN', width: 180 },
  { prop: 'name', label: '设备名称', minWidth: 170, showOverflowTooltip: true },
  { prop: 'modelCode', label: '型号', width: 130 },
  {
    prop: 'category',
    label: '品类',
    width: 100,
    render: (row) => DEVICE_CATEGORY_OPTIONS.find((c) => c.value === row.category)?.label ?? row.category,
  },
  { prop: 'location', label: '位置', minWidth: 140, showOverflowTooltip: true },
  {
    prop: 'ownerCustomerId',
    label: '产权客户',
    width: 150,
    render: (row) => (row.ownerCustomerId ? (row.ownerCustomerId as string) : '未绑定'),
  },
  {
    prop: 'manufactureDate',
    label: '出厂日期',
    width: 110,
    render: (row) => formatDateOnly(row.manufactureDate as string),
  },
  {
    prop: 'warrantyUntil',
    label: '质保期至',
    width: 110,
    render: (row) => formatDateOnly(row.warrantyUntil as string),
  },
  {
    prop: 'alarmCount',
    label: '累计告警',
    width: 100,
    align: 'right',
    type: 'number',
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.status as string }),
  },
  {
    prop: 'lastReportAt',
    label: '最近上报',
    width: 140,
    render: (row) => formatDateTime(row.lastReportAt as string),
  },
  {
    label: '操作',
    width: 250,
    fixed: 'right',
    render: (row) => {
      const sn = row.sn as string;
      return h('div', { style: { display: 'flex', gap: '8px' } }, [
        h(
          'el-button',
          {
            link: true,
            type: 'primary',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              void router.push(`/vendor/devices/${sn}`);
            },
          },
          () => '详情',
        ),
        h(
          'el-button',
          {
            link: true,
            type: 'warning',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              pendingDeviceSn.value = sn;
              declareVisible.value = true;
            },
          },
          () => '申报绑定',
        ),
        h(
          'el-button',
          {
            link: true,
            type: 'danger',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              // 解绑需先取该设备的一条生效产权绑定
              pendingBinding.value = { deviceSn: sn } as Binding;
              pendingDeviceSn.value = sn;
              unbindVisible.value = true;
            },
          },
          () => '解绑',
        ),
        h(
          'el-button',
          {
            link: true,
            type: 'danger',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              pendingDeviceSn.value = sn;
              archiveVisible.value = true;
            },
          },
          () => '归档',
        ),
      ]);
    },
  },
];

const openCreate = (): void => {
  Object.assign(createForm, {
    sn: '',
    name: '',
    modelCode: models.value[0]?.modelCode ?? '',
    manufactureDate: new Date().toISOString(),
    location: '',
  });
  createVisible.value = true;
};

const onCreate = async (): Promise<void> => {
  saving.value = true;
  try {
    const model = models.value.find((m) => m.modelCode === createForm.modelCode);
    await vendorApi.createDevice({ ...createForm, category: model?.category ?? 'COOKING' });
    ElMessage.success('设备新增成功，质保期至已按型号策略自动计算');
    createVisible.value = false;
    await loadData();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '新增失败');
  } finally {
    saving.value = false;
  }
};

const openImport = (): void => {
  importVisible.value = true;
};

const onImported = async (): Promise<void> => {
  await loadData();
};

const onUnbind = async (reason: string): Promise<void> => {
  if (!pendingBinding.value) return;
  try {
    await vendorApi.requestUnbind(pendingBinding.value.id, reason);
    ElMessage.success('解绑申请已提交，等待客户或平台确认');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

const onArchive = async (): Promise<void> => {
  try {
    await vendorApi.archiveDevice(pendingDeviceSn.value);
    ElMessage.success('设备已下线归档');
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
  models.value = await vendorApi.getOwnedModels();
});
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 220px;
}

.full {
  width: 100%;
}

.form-tip {
  margin-left: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>