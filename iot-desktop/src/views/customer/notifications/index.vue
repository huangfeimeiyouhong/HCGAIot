<!--
  C-13 通知中心 —— 客户视角
  展示本租户站内信，支持全部/未读筛选，点击可跳转到关联单据。
-->
<template>
  <PageContainer
    title="通知中心"
    desc="查看工单进展、绑定确认、告警提醒等系统通知。"
  >
    <DemoTipBar />

    <FilterBar :has-filter="hasFilter">
      <template #fields>
        <el-input
          v-model="query.keyword"
          placeholder="搜索标题 / 内容"
          clearable
          style="width: 220px"
        />
        <el-select
          v-model="readFilter"
          placeholder="阅读状态"
          clearable
          style="width: 140px"
          @change="onReadChange"
        >
          <el-option
            label="全部"
            :value="undefined"
          />
          <el-option
            label="未读"
            value="unread"
          />
          <el-option
            label="已读"
            value="read"
          />
        </el-select>
      </template>
    </FilterBar>

    <section class="card">
      <el-empty
        v-if="!loading && !tableData.length"
        description="暂无通知"
      />
      <ul
        v-else
        class="notify-list"
      >
        <li
          v-for="n in tableData"
          :key="n.id"
          class="notify-item"
          :class="{ 'is-unread': !n.isRead }"
          @click="onOpen(n)"
        >
          <span
            class="notify-dot"
            :class="{ 'is-unread': !n.isRead }"
          />
          <div class="notify-body">
            <div class="notify-top">
              <span class="notify-type">{{ typeLabel(n.type) }}</span>
              <span class="notify-title">{{ n.title }}</span>
            </div>
            <p class="notify-content">
              {{ n.content }}
            </p>
            <span class="notify-time">{{ formatDateTime(n.createdAt) }}</span>
          </div>
          <el-icon
            v-if="n.refId"
            class="notify-arrow"
          >
            <ArrowRight />
          </el-icon>
        </li>
      </ul>
    </section>

    <Pagination
      v-if="total > 0"
      v-model:page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      class="pager"
    />
  </PageContainer>
</template>

<script setup lang="ts" name="CustomerNotifications">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import FilterBar from '@/components/form/FilterBar.vue';
import PageContainer from '@/components/layout/PageContainer.vue';
import Pagination from '@/components/data/Pagination.vue';

import { NOTIFY_TYPE_LABEL } from '@/constants/dict';
import { formatDateTime } from '@/utils/date';

import { customerApi } from '@/api/customer';

import type { Notification } from '@/types';

const router = useRouter();

const filters = reactive<{ isRead?: boolean }>({});
const query = reactive({ page: 1, pageSize: 20, keyword: '' });
const readFilter = ref<string | undefined>(undefined);

const tableData = ref<Notification[]>([]);
const total = ref(0);
const loading = ref(true);

const hasFilter = computed(() => Boolean(query.keyword) || readFilter.value !== undefined);

/** 取数 */
const loadData = async (): Promise<void> => {
  loading.value = true;
  try {
    const res = await customerApi.getNotificationList({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      isRead: filters.isRead,
    });
    tableData.value = res.list;
    total.value = res.total;
  } catch (error) {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

/** 阅读状态切换 */
const onReadChange = (val: string | undefined): void => {
  filters.isRead = val === 'unread' ? false : val === 'read' ? true : undefined;
  query.page = 1;
  void loadData();
};

/** 通知类型中文 */
const typeLabel = (type: string): string => NOTIFY_TYPE_LABEL[type] ?? type;

/** 关联单据跳转 */
const onOpen = (n: Notification): void => {
  if (!n.refId) return;
  const map: Record<string, string> = {
    ORDER: `/customer/work-orders/${n.refId}`,
    ALARM: `/customer/alarms/${n.refId}`,
    BINDING: '/customer/bindings',
  };
  const path = map[n.refType ?? ''];
  if (path) void router.push(path);
};

// keyword 防抖
let timer: ReturnType<typeof setTimeout> | null = null;
const onKeyword = (): void => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    query.page = 1;
    void loadData();
  }, 300);
};

// 监听 keyword 与分页变化
watch(() => query.keyword, onKeyword);
watch(() => [query.page, query.pageSize], loadData);

void loadData();
</script>

<style scoped lang="scss">
.card {
  @include card;
  margin-bottom: var(--layout-card-gap);
  padding: 8px 12px;
}

.notify-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.notify-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 12px;
  border-bottom: 1px solid var(--color-border-light);
  cursor: pointer;
  transition: background 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--color-primary-bg);
  }
}

.notify-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--color-border);

  &.is-unread {
    background: var(--color-primary-text);
  }
}

.notify-body {
  flex: 1;
  min-width: 0;
}

.notify-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notify-type {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 3px;
  background: var(--color-fill-light);
  color: var(--color-text-secondary);
  font-size: 11px;
}

.notify-title {
  color: var(--color-text-title);
  font-size: 14px;
  font-weight: 500;
}

.notify-content {
  margin: 6px 0 4px;
  color: var(--color-text-body);
  font-size: 13px;
  line-height: 1.6;
}

.notify-time {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.notify-arrow {
  flex-shrink: 0;
  margin-top: 4px;
  color: var(--color-text-disabled);
}

.pager {
  justify-content: flex-end;
}
</style>
