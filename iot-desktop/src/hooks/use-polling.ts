import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from 'vue';

/**
 * 通用轮询 Hook(keep-alive / 页面可见性感知,勿用裸 setInterval)
 * - 组件挂载起表,到点执行回调;上一轮回调未返回时跳过本轮(慢接口不堆积请求)
 * - keep-alive 缓存页离场(onDeactivated)停表,回场(onActivated)先补刷一次再续表
 *   ——detached 组件不轮询,回场立即拿到新数据
 * - 浏览器标签页隐藏(visibilitychange)停表,重新可见同样补刷续表
 * - 首挂紧随的 onActivated 不补刷(宿主 watch immediate 已做首拉,避免重复请求)
 * 回调应为「静默刷新」语义:不清旧值不转圈,失败保持原值(大屏数字闪空不可接受)
 * @param callback 定时执行的函数(异步拉数,自身不应抛错)
 * @param interval 轮询间隔(毫秒,默认 60s)
 */
export function usePolling(callback: () => void | Promise<void>, interval: number = 1000 * 60) {
  let timer: number | null = null;
  /** 组件在场(已挂载且未被 keep-alive 缓存离场) */
  let isComponentActive = false;
  /** 浏览器标签页可见 */
  let isPageVisible = document.visibilityState === 'visible';
  /** 上一轮回调是否仍在执行 */
  let isCallbackRunning = false;
  /** 是否首挂后的首次激活(跳过补刷,防与宿主首拉重复) */
  let isFreshMount = true;

  async function tick(): Promise<void> {
    if (isCallbackRunning) return;
    isCallbackRunning = true;
    try {
      await callback();
    } finally {
      isCallbackRunning = false;
    }
  }

  function startTimer(): void {
    if (timer !== null || !isComponentActive || !isPageVisible) return;
    timer = window.setInterval(() => { void tick(); }, interval);
  }

  function stopTimer(): void {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  }

  /** 离场(缓存/标签页隐藏)后回来数据已陈旧:先补刷一次,再续表 */
  function resume(): void {
    void tick();
    startTimer();
  }

  function handleVisibilityChange(): void {
    isPageVisible = document.visibilityState === 'visible';
    if (isPageVisible && isComponentActive) resume();
    else stopTimer();
  }

  onMounted(() => {
    isComponentActive = true;
    startTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onActivated(() => {
    isComponentActive = true;
    if (isFreshMount) isFreshMount = false;
    else resume();
    startTimer();
  });

  onDeactivated(() => {
    isComponentActive = false;
    stopTimer();
  });

  onBeforeUnmount(() => {
    isComponentActive = false;
    stopTimer();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });
}
