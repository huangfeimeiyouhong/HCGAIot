<!--
  V-07 设备使用情况 —— 按 设备 / 型号 / 品类 三维度看在线率、运行时长、启停频次、告警频次与 MTBF
  概览指标卡 + 活跃度分布饼图 + 在线率 TOP10 + 明细表格（全部经 vendorApi 取数）
-->
<template>
  <PageContainer
    title="设备使用情况"
    desc="按设备 / 型号 / 品类三个维度分析在线率、日均运行时长、启停频次、告警频次与平均故障间隔（MTBF）。"
  >
    <DemoTipBar />

    <section class="dimension-bar">
      <el-radio-group
        v-model="dimension"
        size="large"
        @change="onDimensionChange"
      >
        <el-radio-button value="device">
          按设备
        </el-radio-button>
        <el-radio-button value="model">
          按型号
        </el-radio-button>
        <el-radio-button value="category">
          按品类
        </el-radio-button>
      </el-radio-group>
      <span class="dimension-tip">
        {{ dimensionTip }}
      </span>
    </section>

    <section class="stats">
      <StatCard
        v-for="item in statCards"
        :key="item.key"
        :data="item"
        :clickable="false"
      />
    </section>

    <section class="charts">
      <ChartCard
        title="活跃度分布"
        :sub-title="`共 ${overview.deviceTotal} 条统计样本`"
      >
        <BaseChart :option="activityOption" />
      </ChartCard>
      <ChartCard
        :title="`${dimensionName}在线率 TOP10`"
        sub-title="按在线率降序（%）"
      >
        <BaseChart :option="rankOption" />
      </ChartCard>
    </section>

    <section class="card">
      <div class="card__head">
        <h3 class="card__title">
          使用明细
        </h3>
        <el-input
          v-model="filters.keyword"
          class="card__search"
          placeholder="按设备 SN 搜索"
          clearable
        />
      </div>
      <DataTable
        :data="tableData"
        :columns="columns"
        :loading="loading"
        row-key="deviceSn"
      >
        <template #empty>
          <EmptyState
            text="暂无使用统计"
            desc="当前数据范围内没有设备产生使用统计"
            :actionable="false"
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
  </PageContainer>
</template>

<script setup lang="ts" name="UsageAnalysis">
import { computed, h, onMounted, reactive, ref } from 'vue';

import BaseChart from '@/components/data/BaseChart.vue';
import ChartCard from '@/components/data/ChartCard.vue';
import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import StatCard from '@/components/data/StatCard.vue';
import StatusBadge from '@/components/data/StatusBadge.vue';

import { DEVICE_CATEGORY_LABEL } from '@/constants/dict';
import { pieOption, rankBarOption } from '@/constants/chart';
import { labelOfActivity, toneOfActivity } from '@/constants/statusMap';
import { useTable } from '@/hooks/use-table';

import { vendorApi } from '@/api/vendor';

import type { ECOption } from '@/hooks/use-echarts';
import type { StatCardData, UsageStat } from '@/types';

type Dimension = 'device' | 'model' | 'category';

/** 表格行：使用统计 + api 层补齐的设备名 / 型号 / 品类 */
type UsageRow = UsageStat & { deviceName: string; modelCode: string; category: string };

const dimension = ref<Dimension>('device');

const DIMENSION_NAME: Record<Dimension, string> = {
  device: '设备',
  model: '型号',
  category: '品类',
};

const dimensionName = computed(() => DIMENSION_NAME[dimension.value]);

const dimensionTip = computed(
  () =>
    ({
      device: '以单台设备为粒度，定位具体机器的运行与告警表现',
      model: '以型号为粒度，横向比较同一型号的整体表现',
      category: '以品类为粒度，了解各产品线的整体健康度',
    })[dimension.value],
);

/**
 * 按当前维度聚合后的排行数据。
 *
 * ⚠️ 为什么要在前端聚合：vendorApi.getUsageRows 目前按设备粒度返回（mock 层未对
 *    dimension 做分组），直接渲染会让维度切换「没有可见效果」。这里在 api 返回的行上
 *    按维度做一次聚合，让 Tab 切换真实反映「看设备 / 看型号 / 看品类」的差异，
 *    同时不改动数据层语义（列表仍是逐台设备的明细）。
 */
const groupedRows = computed<Array<{ name: string; onlineRate: number; count: number }>>(() => {
  const rows = tableData.value;
  if (dimension.value === 'device') {
    return rows.map((r) => ({
      name: r.deviceName || r.deviceSn,
      onlineRate: Number(r.onlineRate.toFixed(1)),
      count: 1,
    }));
  }
  const keyOf = (r: UsageRow): string =>
    dimension.value === 'model' ? r.modelCode || '未知型号' : DEVICE_CATEGORY_LABEL[r.category] ?? r.category;
  const bucket = new Map<string, { sum: number; count: number }>();
  rows.forEach((r) => {
    const key = keyOf(r);
    const cur = bucket.get(key) ?? { sum: 0, count: 0 };
    cur.sum += r.onlineRate;
    cur.count += 1;
    bucket.set(key, cur);
  });
  return [...bucket.entries()].map(([name, v]) => ({
    name,
    onlineRate: Number((v.sum / v.count).toFixed(1)),
    count: v.count,
  }));
});

/** 概览指标 */
const overview = ref({
  onlineRate: 0,
  runtimePerDay: 0,
  startStopFreq: 0,
  alarmFreq: 0,
  mtbf: 0,
  componentHealth: 100,
  deviceTotal: 0,
  activityDist: [] as Array<{ name: string; value: number }>,
});

const filters = reactive({ keyword: '' });

const { query, tableData, total, loading, loadData } = useTable<UsageRow, { keyword: string }>(
  filters,
  (params) =>
    vendorApi.getUsageRows({
      dimension: dimension.value,
      keyword: params.keyword,
      page: params.page,
      pageSize: params.pageSize,
    }),
);

const statCards = computed<StatCardData[]>(() => [
  { key: 'onlineRate', label: '平均在线率', value: overview.value.onlineRate, unit: '%', tone: 'primary' },
  { key: 'runtime', label: '日均运行时长', value: overview.value.runtimePerDay, unit: 'h', tone: 'info' },
  { key: 'startStop', label: '日均启停频次', value: overview.value.startStopFreq, unit: '次', tone: 'info' },
  {
    key: 'alarm',
    label: '月均告警频次',
    value: overview.value.alarmFreq,
    unit: '次',
    tone: overview.value.alarmFreq > 3 ? 'danger' : 'success',
  },
  { key: 'mtbf', label: '平均故障间隔', value: overview.value.mtbf, unit: 'h', tone: 'success' },
  { key: 'health', label: '部件数据健康度', value: overview.value.componentHealth, unit: '%', tone: 'purple' },
]);

const activityOption = computed<ECOption>(() => pieOption(overview.value.activityDist));

const rankOption = computed<ECOption>(() =>
  rankBarOption(
    groupedRows.value
      .slice()
      .sort((a, b) => b.onlineRate - a.onlineRate)
      .slice(0, 10)
      .map((r) => ({ name: r.count > 1 ? `${r.name}（${r.count}）` : r.name, value: r.onlineRate })),
  ),
);

const columns: DataTableColumn[] = [
  { prop: 'deviceSn', label: '设备 SN', width: 170 },
  { prop: 'deviceName', label: '设备名称', minWidth: 170, showOverflowTooltip: true },
  { prop: 'modelCode', label: '型号', width: 150 },
  {
    prop: 'category',
    label: '品类',
    width: 110,
    render: (row) => DEVICE_CATEGORY_LABEL[row.category as string] ?? row.category,
  },
  {
    prop: 'onlineRate',
    label: '在线率',
    width: 100,
    align: 'right',
    render: (row) => `${Number(row.onlineRate).toFixed(1)}%`,
  },
  {
    prop: 'runtimePerDay',
    label: '日均运行',
    width: 110,
    align: 'right',
    render: (row) => `${Number(row.runtimePerDay).toFixed(1)} h`,
  },
  {
    prop: 'startStopFreq',
    label: '启停频次',
    width: 120,
    align: 'right',
    render: (row) => `${Number(row.startStopFreq).toFixed(1)} 次/天`,
  },
  {
    prop: 'alarmFreq',
    label: '告警频次',
    width: 120,
    align: 'right',
    render: (row) => `${Number(row.alarmFreq).toFixed(1)} 次/月`,
  },
  {
    prop: 'mtbf',
    label: 'MTBF',
    width: 100,
    align: 'right',
    render: (row) => `${Math.round(Number(row.mtbf))} h`,
  },
  {
    prop: 'activityLevel',
    label: '活跃度',
    width: 110,
    render: (row) =>
      h(StatusBadge, {
        status: undefined,
        label: labelOfActivity(row.activityLevel as string),
        tone: toneOfActivity(row.activityLevel as string),
      }),
  },
];

/** 概览加载（维度变化时重取） */
const loadOverview = async (): Promise<void> => {
  try {
    const res = await vendorApi.getUsageStats({ dimension: dimension.value });
    overview.value = {
      onlineRate: res.onlineRate,
      runtimePerDay: res.runtimePerDay,
      startStopFreq: res.startStopFreq,
      alarmFreq: res.alarmFreq,
      mtbf: res.mtbf,
      componentHealth: res.componentHealth,
      deviceTotal: res.activityDist.reduce((s, d) => s + d.value, 0),
      activityDist: res.activityDist,
    };
  } catch {
    overview.value = { ...overview.value, activityDist: [] };
  }
};

const onDimensionChange = async (): Promise<void> => {
  await loadOverview();
  await loadData();
};

onMounted(async () => {
  await loadOverview();
  await loadData();
});
</script>

<style scoped lang="scss">
.dimension-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: var(--layout-card-gap);
  background: var(--color-bg-container);
  border-radius: var(--layout-card-radius);
  box-shadow: var(--layout-card-shadow);
}

.dimension-tip {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}

.card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
}

.card__title {
  color: var(--color-text-title);
  font-size: 15px;
  font-weight: 600;
}

.card__search {
  width: 220px;
}
</style>
