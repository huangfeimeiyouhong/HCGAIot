<!--
  台账页(mock):看板面板「XX台账」LinkTag 的统一落地页。
  query.type 决定台账种类(hazard/safety/supervision/emergency/device/ai),换标题/列/mock 行;
  query.org 为视角组织 orgId(与看板上下文同口径,进页预填级联)。
  筛选/表格/分页全部使用二次封装的 ElementPlus 组件(HiCascader/HiSelect/HiDatePicker/DataTable/HiPagination);
  行内「应急指挥调度」打开任务调度弹窗。真实项目:fetchRows 换接口分页即可。
-->
<template>
  <div class="ledger">
    <!-- 筛选条 -->
    <div class="ledger__filters">
      <HiCascader
        v-model="draftOrg"
        label="组织架构"
        :options="LEDGER_ORG_OPTIONS"
        placeholder="省域公司/网格/宗地"
        check-strictly
        :emit-path="false"
        filterable
      />
      <HiSelect
        v-model="draftStatus"
        label="状态"
        :options="STATUS_OPTIONS"
        placeholder="全部状态"
      />
      <HiDatePicker
        v-model="draftDateRange"
        label="起始日期"
        type="daterange"
        unlink-panels
        :clearable="false"
        range-separator="至"
        value-format="YYYY-MM-DD"
      />
      <div class="ledger__actions">
        <button
          class="ledger-btn ledger-btn--primary"
          @click="onSearch"
        >
          查询
        </button>
        <button
          class="ledger-btn"
          @click="onReset"
        >
          重置
        </button>
      </div>
    </div>

    <!-- 台账明细 -->
    <div class="ledger__panel">
      <div class="ledger__panel-header">
        <div class="ledger__panel-title">
          {{ config.title }}明细
        </div>
      </div>
      <div
        v-loading="isLoading"
        class="ledger__table"
        element-loading-background="rgba(3, 20, 45, 0.6)"
      >
        <DataTable
          :data="pagedRows"
          :columns="columns"
        />
      </div>
      <HiPagination
        v-model:page="page"
        v-model:page-size="pageSize"
        :total="filteredRows.length"
        :page-sizes="[10, 20, 50]"
        @change="onPageChange"
      />
    </div>

    <DispatchDialog ref="dispatchDialogRef" />
  </div>
</template>

<script setup lang="ts" name="LedgerIndex">
import { computed, h, onBeforeUnmount, ref, watchEffect } from 'vue';

import { useRoute } from 'vue-router';

import type { DataTableColumn } from '@/components/data-table/data-table.vue';

import HiCascader from '@/components/cascader/index.vue';
import DataTable from '@/components/data-table/data-table.vue';
import HiDatePicker from '@/components/date-picker/index.vue';
import HiPagination from '@/components/pagination/index.vue';
import HiSelect from '@/components/select/index.vue';
import { useAppStore } from '@/store/app';
import { LEDGER_ORG_OPTIONS, orgNameOf } from '@/store/org';

import DispatchDialog from '../dashboard/components/dispatch-dialog/index.vue';
import LinkTag from '../dashboard/components/link-tag/index.vue';

interface LedgerColumn {
  prop: string;
  label: string;
  width?: string;
}

interface LedgerConfig {
  title: string;
  columns: LedgerColumn[];
  rows: Record<string, string>[];
}

/** 台账种类配置(列 + mock 行;真实项目换成接口分页数据) */
const LEDGER_CONFIGS: Record<string, LedgerConfig> = {
  hazard: {
    title: '隐患台账',
    columns: [
      { prop: 'name', label: '隐患名称' },
      { prop: 'company', label: '所属公司', width: '120px' },
      { prop: 'grid', label: '所属网格', width: '120px' },
      { prop: 'level', label: '隐患等级', width: '100px' },
      { prop: 'status', label: '整改情况', width: '100px' },
      { prop: 'time', label: '发现时间', width: '160px' },
    ],
    rows: [
      { name: '配电房堆放杂物', company: '北京公司', grid: '海淀网格', level: '一般', status: '待办', time: '2026-09-18 09:24' },
      { name: '消防通道被占用', company: '北京公司', grid: '丰台网格', level: '重大', status: '处理中', time: '2026-09-17 22:10' },
      { name: '灭火器压力不足', company: '河北公司', grid: '石家庄网格', level: '一般', status: '已完结', time: '2026-09-15 11:05' },
      { name: '安全出口指示灯损坏', company: '河北公司', grid: '廊坊网格', level: '一般', status: '待办', time: '2026-09-14 08:31' },
      { name: '电梯五方对讲失效', company: '北京公司', grid: '海淀网格', level: '重大', status: '处理中', time: '2026-09-13 16:47' },
      { name: '车库疏散指示缺失', company: '北京公司', grid: '丰台网格', level: '一般', status: '已完结', time: '2026-09-12 10:20' },
      { name: '屋面防水层破损', company: '河北公司', grid: '石家庄网格', level: '一般', status: '待办', time: '2026-09-11 14:05' },
      { name: '消火栓箱配件缺失', company: '河北公司', grid: '廊坊网格', level: '一般', status: '处理中', time: '2026-09-10 09:38' },
      { name: '有限空间标识缺失', company: '北京公司', grid: '海淀网格', level: '重大', status: '待办', time: '2026-09-09 11:26' },
      { name: '配电室绝缘垫老化', company: '北京公司', grid: '丰台网格', level: '一般', status: '已完结', time: '2026-09-08 15:52' },
      { name: '消防主机故障报警', company: '河北公司', grid: '石家庄网格', level: '重大', status: '处理中', time: '2026-09-07 20:14' },
      { name: '防撞护栏松动', company: '河北公司', grid: '廊坊网格', level: '一般', status: '待办', time: '2026-09-06 08:44' },
      { name: '水泵房积水', company: '北京公司', grid: '海淀网格', level: '一般', status: '已完结', time: '2026-09-05 13:09' },
      { name: '高空抛物防护缺失', company: '北京公司', grid: '丰台网格', level: '重大', status: '待办', time: '2026-09-04 17:33' },
      { name: '应急照明续航不足', company: '河北公司', grid: '石家庄网格', level: '一般', status: '处理中', time: '2026-09-03 10:58' },
      { name: '燃气报警器超期未检', company: '河北公司', grid: '廊坊网格', level: '重大', status: '待办', time: '2026-09-02 09:12' },
      { name: '天台护栏高度不足', company: '北京公司', grid: '海淀网格', level: '重大', status: '处理中', time: '2026-09-01 14:39' },
      { name: '地下车库渗水', company: '北京公司', grid: '丰台网格', level: '一般', status: '已完结', time: '2026-08-31 16:21' },
      { name: '充电区域无灭火器材', company: '河北公司', grid: '石家庄网格', level: '重大', status: '待办', time: '2026-08-30 11:45' },
      { name: '安全巡查记录缺失', company: '河北公司', grid: '廊坊网格', level: '一般', status: '已完结', time: '2026-08-29 08:17' },
      { name: '施工区域未围挡', company: '北京公司', grid: '海淀网格', level: '重大', status: '处理中', time: '2026-08-28 15:03' },
      { name: '通道堆物影响疏散', company: '北京公司', grid: '丰台网格', level: '一般', status: '待办', time: '2026-08-27 10:41' },
      { name: '喷淋末端试水异常', company: '河北公司', grid: '石家庄网格', level: '一般', status: '处理中', time: '2026-08-26 14:55' },
    ],
  },
  safety: {
    title: '安全台账',
    columns: [
      { prop: 'name', label: '项目名称' },
      { prop: 'company', label: '所属公司', width: '120px' },
      { prop: 'grid', label: '所属网格', width: '120px' },
      { prop: 'score', label: '考核得分', width: '100px' },
      { prop: 'level', label: '安全等级', width: '100px' },
      { prop: 'time', label: '评价周期', width: '160px' },
    ],
    rows: [
      { name: '中关村壹号', company: '北京公司', grid: '海淀网格', score: '96.5', level: '优', time: '2026-09' },
      { name: '丽泽商务中心', company: '北京公司', grid: '丰台网格', score: '91.2', level: '良', time: '2026-09' },
      { name: '裕华产业园', company: '河北公司', grid: '石家庄网格', score: '88.6', level: '良', time: '2026-09' },
    ],
  },
  supervision: {
    title: '督办台账',
    columns: [
      { prop: 'name', label: '督办事项' },
      { prop: 'company', label: '所属公司', width: '120px' },
      { prop: 'grid', label: '所属网格', width: '120px' },
      { prop: 'level', label: '督办层级', width: '100px' },
      { prop: 'status', label: '督办状态', width: '100px' },
      { prop: 'time', label: '发起时间', width: '160px' },
    ],
    rows: [
      { name: '消防通道占用整改督办', company: '北京公司', grid: '丰台网格', level: '集团级', status: '处理中', time: '2026-09-17 10:00' },
      { name: '配电房隐患整改督办', company: '北京公司', grid: '海淀网格', level: '公司级', status: '待办', time: '2026-09-18 14:30' },
    ],
  },
  emergency: {
    title: '应急台账',
    columns: [
      { prop: 'name', label: '事件名称' },
      { prop: 'company', label: '所属公司', width: '120px' },
      { prop: 'grid', label: '所属网格', width: '120px' },
      { prop: 'level', label: '事件等级', width: '100px' },
      { prop: 'status', label: '处置状态', width: '100px' },
      { prop: 'time', label: '发生时间', width: '160px' },
    ],
    rows: [
      { name: '车库烟雾告警', company: '北京公司', grid: '海淀网格', level: '较大', status: '处理中', time: '2026-09-17 22:10' },
      { name: '暴雨积水抢险', company: '河北公司', grid: '廊坊网格', level: '一般', status: '已完结', time: '2026-09-12 06:40' },
    ],
  },
  device: {
    title: '设备台账',
    columns: [
      { prop: 'name', label: '设备名称' },
      { prop: 'company', label: '所属公司', width: '120px' },
      { prop: 'grid', label: '所属网格', width: '120px' },
      { prop: 'category', label: '专业类型', width: '100px' },
      { prop: 'status', label: '运行状态', width: '100px' },
      { prop: 'time', label: '最近维保', width: '160px' },
    ],
    rows: [
      { name: '东门 1 号枪机', company: '北京公司', grid: '海淀网格', category: '安防', status: '处理中', time: '2026-09-10' },
      { name: 'B2 西区 3 号球机', company: '北京公司', grid: '海淀网格', category: '安防', status: '待办', time: '2026-09-08' },
      { name: '1# 消防泵', company: '河北公司', grid: '石家庄网格', category: '消防', status: '已完结', time: '2026-09-05' },
    ],
  },
  ai: {
    title: 'AI事件台账',
    columns: [
      { prop: 'name', label: '点位名称' },
      { prop: 'company', label: '所属公司', width: '120px' },
      { prop: 'grid', label: '所属网格', width: '120px' },
      { prop: 'category', label: '工单大类', width: '120px' },
      { prop: 'status', label: '问题状态', width: '100px' },
      { prop: 'time', label: '创建时间', width: '160px' },
    ],
    rows: [
      { name: '中关村壹号-东门通道', company: '北京公司', grid: '海淀网格', category: '消防通道占用', status: '待办', time: '2026-09-18 09:24' },
      { name: '望京科技园-B2 车库', company: '北京公司', grid: '海淀网格', category: '烟雾识别', status: '处理中', time: '2026-09-17 22:10' },
      { name: '丽泽商务中心-大堂', company: '北京公司', grid: '丰台网格', category: '人员聚集', status: '已完结', time: '2026-09-16 15:42' },
      { name: '燕郊科创园-北门', company: '河北公司', grid: '廊坊网格', category: '违停识别', status: '处理中', time: '2026-09-14 08:31' },
    ],
  },
};

const STATUS_OPTIONS = [
  { label: '待办', value: '0' },
  { label: '处理中', value: '1' },
  { label: '已完结', value: '2' },
];

const STATUS_TEXT: Record<string, string> = { 0: '待办', 1: '处理中', 2: '已完结' };
const STATUS_COLOR: Record<string, string> = { 待办: '#ffb84d', 处理中: '#0fb8ff', 已完结: '#34d399' };

const route = useRoute();

/** 台账种类(query.type 驱动,缺省隐患) */
const ledgerType = computed(() => String(route.query.type || 'hazard'));
const config = computed(() => LEDGER_CONFIGS[ledgerType.value] ?? LEDGER_CONFIGS.hazard);

// header 标题联动台账种类(离开页面还原,避免污染其他 detail 页)
const appStore = useAppStore();
watchEffect(() => {
  appStore.pageTitle = config.value.title;
});
onBeforeUnmount(() => {
  appStore.pageTitle = '';
});

// ==================== 筛选条件(草稿 → 点查询生效) ====================
/** 近 7 日默认范围 */
const defaultDateRange = (): [string, string] => {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 24 * 3600 * 1000);
  return [fmt(start), fmt(end)];
};

const draftOrg = ref(String(route.query.org || ''));
const draftStatus = ref('');
const draftDateRange = ref<[string, string]>(defaultDateRange());

// 生效条件(点「查询」/「重置」才应用)
const appliedOrg = ref(draftOrg.value);
const appliedStatus = ref('');
const appliedDateRange = ref<[string, string]>(defaultDateRange());

const isLoading = ref(false);
const page = ref(1);
const pageSize = ref(10);

/** mock 过滤:组织按选中节点名称匹配公司/网格列,状态精确匹配,日期范围内(无日期的行恒保留) */
const filteredRows = computed(() => {
  const orgName = appliedOrg.value ? orgNameOf(appliedOrg.value) : '';
  const statusText = STATUS_TEXT[appliedStatus.value] ?? '';
  const [start, end] = appliedDateRange.value ?? [];
  return config.value.rows.filter((row) => {
    if (orgName && row.company !== orgName && row.grid !== orgName && !row.name.includes(orgName)) return false;
    if (statusText && row.status !== statusText) return false;
    const day = (row.time ?? '').slice(0, 10);
    if (start && end && day.length === 10 && (day < start || day > end)) return false;
    return true;
  });
});

/** 当前页行(mock 前端分页;真实项目:page/pageSize 作接口入参,DataTable 直接吃回包 list) */
const pagedRows = computed(() => {
  const startIdx = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(startIdx, startIdx + pageSize.value);
});

/** 模拟一次查询 loading(真实项目换成接口请求,记得竞态守卫) */
const simulateFetch = () => {
  isLoading.value = true;
  window.setTimeout(() => {
    isLoading.value = false;
  }, 260);
};

const onSearch = () => {
  appliedOrg.value = draftOrg.value;
  appliedStatus.value = draftStatus.value;
  appliedDateRange.value = draftDateRange.value ?? defaultDateRange();
  page.value = 1;
  simulateFetch();
};

const onReset = () => {
  draftOrg.value = '';
  draftStatus.value = '';
  draftDateRange.value = defaultDateRange();
  onSearch();
};

const onPageChange = (nextPage: number, nextPageSize: number) => {
  page.value = nextPage;
  pageSize.value = nextPageSize;
  simulateFetch();
};

// ==================== 表格列 ====================
/** 应急指挥调度:打开任务调度弹窗 */
const dispatchDialogRef = ref<InstanceType<typeof DispatchDialog>>();

const openDispatch = (row: Record<string, string>) => {
  dispatchDialogRef.value?.open({
    title: row.name,
    device: row.category,
    location: `${row.company || ''} ${row.grid || ''}`.trim(),
    time: row.time,
    status: row.status,
  });
};

/** 列配置 → DataTableColumn:状态列彩色文字,操作列 详情 + 未完结追加应急指挥调度 */
const columns = computed<DataTableColumn[]>(() => [
  ...config.value.columns.map((column) => {
    const base: DataTableColumn = column.width
      ? { prop: column.prop, label: column.label, width: Number.parseInt(column.width, 10) }
      : { prop: column.prop, label: column.label, minWidth: 140, showOverflowTooltip: true };
    if (column.prop === 'status') {
      return {
        ...base,
        align: 'center',
        render: (row: Record<string, unknown>) => {
          const text = String((row as Record<string, string>).status ?? '');
          return `<span style="color:${STATUS_COLOR[text] ?? '#fff'};white-space:nowrap">${text || '—'}</span>`;
        },
      };
    }
    return base;
  }),
  {
    prop: 'action',
    label: '操作',
    width: 220,
    fixed: 'right',
    render: (row: Record<string, unknown>) => {
      const record = row as Record<string, string>;
      const viewBtn = () =>
        h('span', {
          style: 'color:#0fb8ff;cursor:pointer;white-space:nowrap',
          onClick: () => openDispatch(record),
        }, '详情');
      if (record.status && record.status !== '已完结') {
        return h('span', { style: 'display:inline-flex;align-items:center;gap:12px;white-space:nowrap' }, [
          viewBtn(),
          h(LinkTag, { text: '应急指挥调度', showIcon: true, onClick: () => openDispatch(record) }),
        ]);
      }
      return viewBtn();
    },
  },
]);
</script>

<style lang="scss" scoped>
.ledger {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;

  &__filters {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 14px 20px;
    background: rgba(3, 20, 45, 0.6);
    border: 1px solid rgba(15, 184, 255, 0.35);
    border-radius: 6px;
  }

  &__actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }

  &__panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 16px 20px;
    background: rgba(3, 20, 45, 0.6);
    border: 1px solid rgba(15, 184, 255, 0.35);
    border-radius: 6px;
  }

  &__panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__panel-title {
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }

  &__table {
    flex: 1;
    min-height: 0;
    margin-bottom: 12px;

    :deep(.custom-data-table) {
      --data-table-cell-padding: 16px;
      --data-table-row-height: 56px;
    }
  }
}

.ledger-btn {
  height: 34px;
  padding: 0 22px;
  border: 1px solid rgba(15, 184, 255, 0.6);
  border-radius: 4px;
  background: transparent;
  color: #0fb8ff;
  font-size: 15px;
  cursor: pointer;

  &:hover {
    background: rgba(24, 144, 255, 0.12);
  }

  &--primary {
    background: linear-gradient(90deg, #1890ff 0%, #0fb8ff 100%);
    border: none;
    color: #fff;

    &:hover {
      background: linear-gradient(90deg, #2f9dff 0%, #2cc4ff 100%);
    }
  }
}
</style>
