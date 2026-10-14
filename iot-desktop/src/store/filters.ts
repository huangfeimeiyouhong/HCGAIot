import { defineStore } from 'pinia';

type State = {
  /** 按 route.path 存的筛选条件（切 Tab 返回时恢复，切换入口时清空） */
  filters: Record<string, Record<string, unknown>>;
};

export const useFilterStore = defineStore('_filters', {
  state: (): State => ({
    filters: {},
  }),
  actions: {
    /**
     * 取指定路径的筛选条件副本
     * 返回副本而非内部引用，避免页面修改时意外污染 store
     * @param path 路由 path
     * @returns 筛选条件对象副本
     */
    getFilters(path: string): Record<string, unknown> {
      return { ...(this.filters[path] ?? {}) };
    },

    /**
     * 写回指定路径的筛选条件
     * @param path 路由 path
     * @param state 筛选条件对象
     */
    setFilters(path: string, state: Record<string, unknown>): void {
      this.filters = { ...this.filters, [path]: { ...state } };
    },

    /**
     * 清除指定路径的筛选条件
     * @param path 路由 path
     */
    clearFilters(path: string): void {
      const next = { ...this.filters };
      delete next[path];
      this.filters = next;
    },

    /** 清空全部（切换入口 / 登出时调用） */
    clearAll(): void {
      this.filters = {};
    },
  },
});