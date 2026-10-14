import { defineStore } from 'pinia';

type State = {
  loading: boolean;
  currentDate: number;
  device: string;
  collapsed: boolean;
  /** 首页/集团视角标记,业务侧按需使用 */
  isGroupDashboard: boolean;
  /** keep-alive 缓存组件 name 列表(路由 meta.keepAlive 驱动注册,布局层 include 消费;队头最旧、队尾最新) */
  keepAliveComponents: string[];
  /** 缓存列表容量上限(超出按 LRU 淘汰最久未访问) */
  keepAliveMax: number;
  /** 页面级标题覆盖(详情页标题优先展示),页面 onBeforeUnmount 置空 */
  pageTitle: string;
  [key: string]: any;
};

export const useAppStore = defineStore('_app', {
  state: (): State => ({
    loading: false,
    currentDate: new Date().getTime(),
    device: 'desktop',
    collapsed: false,
    isGroupDashboard: true,
    keepAliveComponents: [],
    keepAliveMax: 20,
    pageTitle: '',
  }),
  actions: {
    setLoadingStatus(status: boolean) {
      this.loading = status;
    },
    setDevice(device: string) {
      this.device = device;
    },
    setCollapseStatus(collapsed: boolean) {
      this.collapsed = collapsed;
    },
    setCurrentDate(date: number) {
      this.currentDate = date;
    },
    setGroupDashboard(val: boolean) {
      this.isGroupDashboard = val;
    },

    /** 注册 keep-alive 缓存(LRU:重访挪到队尾视为最新,超容量淘汰队头最久未访问) */
    addKeepAlive(name: string) {
      if (!name) return;
      this.keepAliveComponents = this.keepAliveComponents.filter((n) => n !== name);
      this.keepAliveComponents.push(name);
      while (this.keepAliveComponents.length > this.keepAliveMax) {
        this.keepAliveComponents.shift();
      }
    },
    /** 摘除缓存:include 移除后 keep-alive 立即丢弃缓存实例,下次进入重新挂载 */
    removeKeepAlive(name: string) {
      this.keepAliveComponents = this.keepAliveComponents.filter((n) => n !== name);
    },
  },
});
