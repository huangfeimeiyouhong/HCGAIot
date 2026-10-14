import { defineStore } from 'pinia';

type State = {
  loading: boolean;
  device: string;
  collapsed: boolean;
  /** keep-alive 缓存组件 name 列表（路由 meta.keepAlive 驱动注册，布局层 include 消费） */
  keepAliveComponents: string[];
  /** 缓存列表容量上限（超出按 LRU 淘汰最久未访问） */
  keepAliveMax: number;
  /** 页面级标题覆盖（详情页标题优先展示），页面 onBeforeUnmount 置空 */
  pageTitle: string;
};

export const useAppStore = defineStore('_app', {
  state: (): State => ({
    loading: false,
    device: 'desktop',
    collapsed: false,
    keepAliveComponents: [],
    keepAliveMax: 20,
    pageTitle: '',
  }),
  actions: {
    /** 设置全局 loading */
    setLoadingStatus(status: boolean): void {
      this.loading = status;
    },

    /** 设置设备类型 */
    setDevice(device: string): void {
      this.device = device;
    },

    /** 侧边栏折叠状态 */
    setCollapseStatus(collapsed: boolean): void {
      this.collapsed = collapsed;
    },

    /** 注册 keep-alive 缓存（LRU：重访挪到队尾，超容量淘汰队头） */
    addKeepAlive(name: string): void {
      if (!name) return;
      this.keepAliveComponents = this.keepAliveComponents.filter((n) => n !== name);
      this.keepAliveComponents.push(name);
      while (this.keepAliveComponents.length > this.keepAliveMax) {
        this.keepAliveComponents.shift();
      }
    },

    /** 摘除缓存 */
    removeKeepAlive(name: string): void {
      this.keepAliveComponents = this.keepAliveComponents.filter((n) => n !== name);
    },

    /** 清空缓存（切换入口时调用） */
    clearKeepAlive(): void {
      this.keepAliveComponents = [];
    },
  },
});