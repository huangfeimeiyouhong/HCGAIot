<!--
  P-15 告警规则配置
-->
<template>
  <PageContainer
    title="告警规则配置"
    desc="平台统一的告警触发规则，阈值与等级集中维护"
  >
    <DemoTipBar />

    <FilterBar :has-filter="false">
      <template #fields>
        <el-input
          v-model="keyword"
          class="filter-input"
          placeholder="规则名称"
          clearable
        />
        <Select
          v-model="categoryFilter"
          label="适用品类"
          :options="categoryOptions"
          placeholder="全部品类"
        />
      </template>
      <template #actions>
        <el-button
          type="primary"
          @click="openCreate"
        >
          新增规则
        </el-button>
      </template>
    </FilterBar>

    <section class="card">
      <DataTable
        :data="filteredRules"
        :columns="columns"
        row-key="id"
        max-height="560"
      >
        <template #empty>
          <EmptyState text="暂无告警规则" />
        </template>
      </DataTable>
    </section>

    <FormDialog
      v-model="dialogVisible"
      :title="form.id ? '编辑告警规则' : '新增告警规则'"
      :model="form"
      :loading="saving"
      @confirm="onSave"
    >
      <el-form-item label="规则名称">
        <el-input
          v-model="form.name"
          placeholder="如：制冷设备超温告警"
        />
      </el-form-item>
      <el-form-item label="适用品类">
        <el-select
          v-model="form.category"
          class="full"
        >
          <el-option label="全部品类" value="ALL" />
          <el-option
            v-for="c in categoryOptions"
            :key="c.value"
            :label="c.label"
            :value="c.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="监控指标">
        <el-select
          v-model="form.metric"
          class="full"
        >
          <el-option
            v-for="m in METRIC_OPTIONS"
            :key="m.value"
            :label="m.label"
            :value="m.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="触发条件">
        <el-select
          v-model="form.condition"
          class="half"
        >
          <el-option
            v-for="c in CONDITION_OPTIONS"
            :key="c.value"
            :label="c.label"
            :value="c.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="阈值与等级">
        <ThresholdInput
          v-model="form.threshold"
          v-model:level="form.level"
          :unit="METRIC_UNIT[form.metric] ?? ''"
          :min="0"
          :max="100000"
        />
      </el-form-item>
      <el-form-item label="通知对象">
        <el-select
          v-model="form.notifyTargets"
          class="full"
          multiple
        >
          <el-option label="平台运营" value="平台运营" />
          <el-option label="厂家管理员" value="厂家管理员" />
          <el-option label="厂家工程师" value="厂家工程师" />
          <el-option label="客户管理员" value="客户管理员" />
        </el-select>
      </el-form-item>
      <el-form-item label="启用">
        <el-switch v-model="form.enabled" />
      </el-form-item>
    </FormDialog>
  </PageContainer>
</template>

<script setup lang="ts" name="PlatformAlarmRules">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import FormDialog from '@/components/form/FormDialog.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Select from '@/components/control/Select.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';
import ThresholdInput from '@/components/form/ThresholdInput.vue';

import { CONDITION_LABEL, CONDITION_OPTIONS, DEVICE_CATEGORY_LABEL, DEVICE_CATEGORY_OPTIONS, METRIC_LABEL, METRIC_OPTIONS, METRIC_UNIT } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';

import { platformApi } from '@/api';

import type { AlarmLevel, AlarmRule, DeviceCategory, RuleCondition } from '@/types';

const categoryOptions = DEVICE_CATEGORY_OPTIONS;

const rules = ref<AlarmRule[]>([]);
const keyword = ref('');
const categoryFilter = ref<DeviceCategory | 'ALL' | undefined>(undefined);

const dialogVisible = ref(false);
const saving = ref(false);

const form = reactive<AlarmRule>({
  id: '',
  name: '',
  category: 'ALL',
  metric: 'temperature',
  condition: 'GT',
  threshold: 0,
  level: 'IMPORTANT',
  notifyTargets: [],
  enabled: true,
  updatedAt: '',
});

const filteredRules = computed(() =>
  rules.value.filter((r) => {
    const kw = keyword.value.trim().toLowerCase();
    const matchKw = !kw || r.name.toLowerCase().includes(kw) || String(r.id).toLowerCase().includes(kw);
    const matchCat = !categoryFilter.value || r.category === categoryFilter.value;
    return matchKw && matchCat;
  }),
);

const columns: DataTableColumn[] = [
  { prop: 'id', label: '规则编号', width: 110 },
  { prop: 'name', label: '规则名称', minWidth: 200, showOverflowTooltip: true },
  {
    prop: 'category',
    label: '适用品类',
    width: 110,
    render: (row) => (row.category === 'ALL' ? '全部品类' : DEVICE_CATEGORY_LABEL[row.category as string] ?? row.category),
  },
  {
    prop: 'metric',
    label: '监控指标',
    width: 110,
    render: (row) => METRIC_LABEL[row.metric as string] ?? row.metric,
  },
  {
    prop: 'condition',
    label: '条件',
    width: 130,
    render: (row) => {
      const rule = row as AlarmRule;
      return `${CONDITION_LABEL[rule.condition]} ${rule.threshold} ${METRIC_UNIT[rule.metric] ?? ''}`;
    },
  },
  {
    prop: 'level',
    label: '告警等级',
    width: 100,
    render: (row) => h(StatusBadge, { status: row.level as AlarmLevel }),
  },
  {
    prop: 'notifyTargets',
    label: '通知对象',
    minWidth: 180,
    render: (row) => ((row.notifyTargets as string[]) ?? []).join('、') || '—',
  },
  {
    prop: 'enabled',
    label: '状态',
    width: 100,
    render: (row) =>
      row.enabled
        ? h(StatusBadge, { status: 'ACTIVE', label: '已启用', tone: 'success' })
        : h(StatusBadge, { status: 'INACTIVE', label: '已停用', tone: 'closed' }),
  },
  {
    prop: 'updatedAt',
    label: '更新时间',
    width: 150,
    render: (row) => formatDateTime(row.updatedAt as string),
  },
  {
    label: '操作',
    width: 130,
    fixed: 'right',
    render: (row) => {
      const rule = row as AlarmRule;
      return h('div', { style: { display: 'flex', gap: '12px' } }, [
        h(ElButton, { link: true, type: 'primary', onClick: () => openEdit(rule) }, () => '编辑'),
        h(
          ElButton,
          {
            link: true,
            type: rule.enabled ? 'danger' : 'success',
            onClick: () => onToggle(rule),
          },
          () => (rule.enabled ? '停用' : '启用'),
        ),
      ]);
    },
  },
];

const openCreate = (): void => {
  Object.assign(form, {
    id: '',
    name: '',
    category: 'ALL' as DeviceCategory | 'ALL',
    metric: 'temperature',
    condition: 'GT' as RuleCondition,
    threshold: 0,
    level: 'IMPORTANT' as AlarmLevel,
    notifyTargets: [],
    enabled: true,
    updatedAt: '',
  });
  dialogVisible.value = true;
};

const openEdit = (rule: AlarmRule): void => {
  Object.assign(form, rule, { notifyTargets: [...rule.notifyTargets] });
  dialogVisible.value = true;
};

const onSave = async (): Promise<void> => {
  if (!form.name.trim()) {
    ElMessage.warning('请填写规则名称');
    return;
  }
  saving.value = true;
  try {
    await platformApi.saveAlarmRule({ ...form });
    ElMessage.success('规则已保存');
    dialogVisible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
};

const onToggle = async (rule: AlarmRule): Promise<void> => {
  try {
    await platformApi.toggleAlarmRule(rule.id, !rule.enabled);
    ElMessage.success(rule.enabled ? '规则已停用' : '规则已启用');
    await load();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

const load = async (): Promise<void> => {
  rules.value = await platformApi.getAlarmRuleList();
};

onMounted(load);
</script>

<style scoped lang="scss">
.card {
  @include card;
}

.filter-input {
  width: 200px;
}

.full {
  width: 100%;
}

.half {
  width: 200px;
}
</style>