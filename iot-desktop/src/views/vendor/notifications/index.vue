<!--
  V-13 通知中心（厂家）—— 站内信列表 + 已读/未读筛选 + 标记已读
  未读数徽标走 commonApi.getUnreadCount()（与顶栏铃铛同源）
-->
<template>
  <PageContainer
    title="通知中心"
    :desc="`本厂站内信与待办提醒${unreadCount ? `，当前 ${unreadCount} 条未读` : '，暂无未读'}`"
  >
    <DemoTipBar />

    <section class="stats">
      <StatCard
        v-for="item in statCards"
        :key="item.key"
        :data="item"
        :clickable="false"
      />
    </section>

    <FilterBar
      :has-filter="hasFilter"
      @clear="onClear"
    >
      <template #fields>
        <el-input
          v-model="filters.keyword"
          class="filter-input"
          placeholder="标题 / 内容"
          clearable
        />
        <el-select
          v-model="filters.isRead"
          class="read-select"
          placeholder="阅读状态"
          clearable
        >
          <el-option
            label="未读"
            :value="false"
          />
          <el-option
            label="已读"
            :value="true"
          />
        </el-select>
      </template>
      <template #actions>
        <el-button
          type="primary"
          plain
          :disabled="!unreadCount"
          @click="onMarkAll"
        >
          全部标为已读
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
            text="暂无通知"
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
  </PageContainer>
</template>

<script setup lang="ts" name="VendorNotifications">
import { computed, h, onMounted, reactive, ref } from 'vue';
import { ElButton, ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import DemoTipBar from '@/components/layout/DemoTipBar.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import StatCard from '@/components/data/StatCard.vue';

import { NOTIFY_TYPE_LABEL } from '@/constants/dict';
import { formatDateTime, fromNow } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { commonApi, vendorApi } from '@/api';

import type { StatCardData } from '@/types';

const filters = reactive({
  keyword: '',
  isRead: undefined as boolean | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    vendorApi.getNotificationList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      isRead: filters.isRead,
    }),
);

/** 未读数（与顶栏铃铛同源，均走 commonApi） */
const unreadCount = ref(0);

const loadUnread = async (): Promise<void> => {
  try {
    unreadCount.value = await commonApi.getUnreadCount();
  } catch {
    unreadCount.value = 0;
  }
};

const statCards = computed<StatCardData[]>(() => [
  { key: 'total', label: '通知总数', value: total.value, unit: '条', tone: 'primary' },
  { key: 'unread', label: '未读', value: unreadCount.value, unit: '条', tone: unreadCount.value > 0 ? 'warning' : 'success' },
  {
    key: 'read',
    label: '已读',
    value: Math.max(total.value - unreadCount.value, 0),
    unit: '条',
    tone: 'info',
  },
  {
    key: 'readRate',
    label: '已读率',
    value: total.value ? Number(((Math.max(total.value - unreadCount.value, 0) / total.value) * 100).toFixed(1)) : 0,
    unit: '%',
    tone: 'purple',
  },
]);

const columns: DataTableColumn[] = [
  { prop: 'title', label: '标题', minWidth: 240, showOverflowTooltip: true },
  {
    prop: 'type',
    label: '类型',
    width: 130,
    render: (row) => NOTIFY_TYPE_LABEL[row.type as string] ?? row.type,
  },
  { prop: 'content', label: '内容', minWidth: 320, showOverflowTooltip: true },
  {
    prop: 'isRead',
    label: '状态',
    width: 90,
    render: (row) =>
      row.isRead
        ? h('span', { style: { color: 'var(--color-text-secondary)' } }, '已读')
        : h('span', { style: { color: 'var(--color-primary-text)', fontWeight: '500' } }, '未读'),
  },
  {
    prop: 'createdAt',
    label: '时间',
    width: 180,
    render: (row) => `${formatDateTime(row.createdAt as string)}（${fromNow(row.createdAt as string)}）`,
  },
  {
    label: '操作',
    width: 100,
    fixed: 'right',
    render: (row) =>
      row.isRead
        ? ''
        : h(
            ElButton,
            {
              link: true,
              type: 'primary',
              onClick: async (e: MouseEvent) => {
                e.stopPropagation();
                await commonApi.markNotificationRead(row.id as string);
                await loadData();
                await loadUnread();
              },
            },
            () => '标为已读',
          ),
  },
];

const onMarkAll = async (): Promise<void> => {
  try {
    await commonApi.markAllNotificationRead();
    ElMessage.success('已全部标为已读');
    await loadData();
    await loadUnread();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败');
  }
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(async () => {
  await loadData();
  await loadUnread();
});
</script>

<style scoped lang="scss">
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--layout-card-gap);
  margin-bottom: var(--layout-card-gap);
}

.card {
  @include card;
}

.filter-input {
  width: 220px;
}

.read-select {
  width: 140px;
}
</style>
