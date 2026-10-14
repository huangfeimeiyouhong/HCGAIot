/**
 * useTable —— 列表页统一逻辑
 *
 * 职责（架构文档 A10.3 假设 A-9）：
 *   - query（page / pageSize / keyword）状态
 *   - loading + 竞态保护（快速切页时旧请求不覆盖新数据）
 *   - keyword 300ms 防抖
 *   - 筛选变化重置页码为 1
 *   - 切换 pageSize 回第 1 页
 *   - 筛选条件持久化到 store/filters（按 route.path）
 *   - keep-alive 回场补刷（见下方 onActivated）
 */
import { computed, onActivated, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { useDebounceFn } from '@vueuse/core';

import { useFilterStore } from '@/store/filters';

import type { ComputedRef, Ref } from 'vue';
import type { PageResult } from '@/types';

/** useTable 返回值 */
export interface UseTableResult<T> {
  /** 分页与关键字查询参数 */
  query: { page: number; pageSize: number; keyword: string };
  /** 当前页数据 */
  tableData: Ref<T[]>;
  /** 总条数 */
  total: Ref<number>;
  /** loading 状态 */
  loading: Ref<boolean>;
  /** 手动触发加载 */
  loadData: () => Promise<void>;
  /** 筛选变化（重置页码后加载） */
  reload: () => Promise<void>;
  /** 清空全部筛选并重载 */
  resetFilters: () => Promise<void>;
  /** 是否有筛选条件 */
  hasFilter: ComputedRef<boolean>;
}

/**
 * 列表页数据加载
 * @param filters 筛选对象（reactive，可被 FilterBar 直接 v-model 绑定）
 * @param fetcher 取数函数，接收 query 与 filters 的合并参数
 * @param options 配置
 * @returns 表格状态与操作方法
 */
export function useTable<T, Q extends Record<string, unknown>>(
  filters: Record<string, unknown>,
  fetcher: (params: Q & { page: number; pageSize: number; keyword: string }) => Promise<PageResult<T>>,
  options: { pageSize?: number; persist?: boolean } = {},
): UseTableResult<T> {
  const route = useRoute();
  const filterStore = useFilterStore();

  // 切 Tab 返回时恢复上次的筛选条件（架构文档 A10.1 S3）
  if (options.persist !== false) {
    const saved = filterStore.getFilters(route.path);
    Object.keys(saved).forEach((key) => {
      if (!(key in filters)) filters[key] = saved[key];
    });
  }

  const query = reactive({
    page: 1,
    pageSize: options.pageSize ?? 20,
    keyword: '',
  });

  const tableData = ref([]) as Ref<T[]>;
  const total = ref(0);
  const loading = ref(false);

  /** 请求序号：只有最后一次请求的结果才写入表格 */
  let requestSeq = 0;

  /** 加载数据 */
  const loadData = async (): Promise<void> => {
    const seq = requestSeq + 1;
    requestSeq = seq;
    loading.value = true;
    try {
      const res = await fetcher({ ...(filters as Q), ...query });
      if (seq !== requestSeq) return; // 竞态保护：旧请求丢弃
      tableData.value = res.list;
      total.value = res.total;
    } catch (error) {
      if (seq !== requestSeq) return;
      tableData.value = [];
      total.value = 0;
      console.error('[useTable] 取数失败：', error);
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  };

  /** 筛选变化 → 重置页码 + 持久化 + 重载 */
  const reload = async (): Promise<void> => {
    query.page = 1;
    if (options.persist !== false) filterStore.setFilters(route.path, { ...filters });
    await loadData();
  };

  /** 清空筛选 */
  const resetFilters = async (): Promise<void> => {
    Object.keys(filters).forEach((key) => {
      filters[key] = undefined;
    });
    query.keyword = '';
    await reload();
  };

  // keyword 300ms 防抖（PRD 3.5）
  const debouncedLoad = useDebounceFn(() => {
    void reload();
  }, 300);

  // 筛选对象变化 → 立即重载（下拉切换不等防抖）
  watch(
    () => ({ ...filters }),
    () => {
      if (options.persist !== false) filterStore.setFilters(route.path, { ...filters });
      void loadData();
    },
    { deep: true },
  );

  // keyword 变化 → 防抖
  watch(
    () => query.keyword,
    () => {
      debouncedLoad();
    },
  );

  // page / pageSize 变化 → 立即加载
  watch(
    () => [query.page, query.pageSize],
    () => {
      void loadData();
    },
  );

  onBeforeUnmount(() => {
    requestSeq += 1; // 卸载后丢弃在途响应
  });

  // keep-alive 回场补刷：列表页命中 meta.keepAlive 后被 <keep-alive> 缓存，
  // 离场只走 onDeactivated、onMounted 不重跑 —— 若不补刷，「在别页改完数据
  // 再回到列表」会一直看到旧数据（例：客户确认绑定后回到「我的设备」看不到新设备）。
  // 首挂紧随的那次 onActivated 与页面 onMounted 的首拉重复，跳过以避免双请求。
  let activateCount = 0;
  onActivated(() => {
    activateCount += 1;
    if (activateCount === 1) return;
    void loadData();
  });

  const hasFilter = computed(() =>
    Boolean(query.keyword) || Object.values(filters).some((v) => v !== undefined && v !== null && v !== ''),
  );

  return { query, tableData, total, loading, loadData, reload, resetFilters, hasFilter };
}