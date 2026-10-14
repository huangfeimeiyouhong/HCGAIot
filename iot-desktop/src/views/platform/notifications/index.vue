<!--
  P-13 通知中心（平台方）
-->
<template>
  <PageContainer
    title="通知中心"
    desc="站内信与待办提醒，支持按类型与已读状态筛选"
  >
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
        <Select
          v-model="filters.type"
          label="通知类型"
          :options="typeOptions"
          placeholder="全部类型"
        />
        <el-select
          v-model="filters.isRead"
          class="read-select"
          placeholder="阅读状态"
          clearable
        >
          <el-option label="未读" :value="false" />
          <el-option label="已读" :value="true" />
        </el-select>
      </template>
      <template #actions>
        <el-button
          type="primary"
          plain
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
          <EmptyState text="暂无通知" @clear="onClear" />
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

<script setup lang="ts" name="PlatformNotifications">
import { h, onMounted, reactive } from 'vue';
import { ElMessage } from 'element-plus';

import DataTable from '@/components/data/DataTable.vue';
import type { DataTableColumn } from '@/components/data/DataTable.vue';
import EmptyState from '@/components/data/EmptyState.vue';
import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';
import Select from '@/components/control/Select.vue';

import { NOTIFY_TYPE_LABEL, NOTIFY_TYPE_OPTIONS } from '@/constants/dict';
import { formatDateTime, fromNow } from '@/utils/date';
import { useTable } from '@/hooks/use-table';

import { commonApi, platformApi } from '@/api';

import type { NotifyType } from '@/types';

const typeOptions = NOTIFY_TYPE_OPTIONS;

const filters = reactive({
  keyword: '',
  type: undefined as NotifyType | undefined,
  isRead: undefined as boolean | undefined,
});

const { query, tableData, total, loading, loadData, resetFilters, hasFilter } = useTable(
  filters,
  (params) =>
    platformApi.getNotificationList({
      page: params.page,
      pageSize: params.pageSize,
      keyword: params.keyword,
      isRead: filters.isRead,
    }),
);

const columns: DataTableColumn[] = [
  { prop: 'title', label: '标题', minWidth: 240, showOverflowTooltip: true },
  {
    prop: 'type',
    label: '类型',
    width: 120,
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
    width: 170,
    render: (row) => `${formatDateTime(row.createdAt as string)}（${fromNow(row.createdAt as string)}）`,
  },
  {
    label: '操作',
    width: 90,
    fixed: 'right',
    render: (row) =>
      row.isRead
        ? ''
        : h(
            'el-button',
            {
              link: true,
              type: 'primary',
              onClick: async (e: MouseEvent) => {
                e.stopPropagation();
                await commonApi.markNotificationRead(row.id as string);
                await loadData();
              },
            },
            () => '标为已读',
          ),
  },
];

const onMarkAll = async (): Promise<void> => {
  await commonApi.markAllNotificationRead();
  ElMessage.success('已全部标为已读');
  await loadData();
};

const onClear = (): void => {
  void resetFilters();
};

onMounted(loadData);
</script>

<style scoped lang="scss">
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