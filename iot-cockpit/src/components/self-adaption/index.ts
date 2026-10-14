import { defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref } from 'vue';
import type { CSSProperties, PropType } from 'vue';

import { useResizeStore } from '@/store/resize';

/**
 * 防抖函数
 * @param {Function} fn
 * @param {number} delay
 * @returns {() => void}
 */
function debounce(fn: Func, delay: number): () => void {
  let timer: number | undefined;
  return function (...args: any[]): void {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(
      () => {
        if (typeof fn === 'function') {
          fn(...args);
        }

        window.clearTimeout(timer);
      },
      delay > 0 ? delay : 100
    );
  };
}

interface IState {
  originalWidth: string | number
  originalHeight: string | number
  width?: string | number
  height?: string | number
}
type IAutoScale =
  | boolean
  | {
    x?: boolean
    y?: boolean
  }

export default defineComponent({
  name: 'SelfAdaptionScreen',
  props: {
    width: {
      type: [String, Number] as PropType<string | number>,
      default: 1920
    },
    height: {
      type: [String, Number] as PropType<string | number>,
      default: 1080
    },
    fullScreen: {
      type: Boolean as PropType<boolean>,
      default: false
    },
    autoScale: {
      type: [Object, Boolean] as PropType<IAutoScale>,
      default: true
    },
    delay: {
      type: Number as PropType<number>,
      default: 500
    },
    boxStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    wrapperStyle: {
      type: Object as PropType<CSSProperties>,
      default: () => ({})
    },
    bodyOverflowHidden: {
      type: Boolean,
      default: true
    }
  },
  setup(props, { slots }) {
    let bodyOverflowHidden: string;
    const state = reactive<IState>({
      width: 0,
      height: 0,
      originalWidth: 0,
      originalHeight: 0
    });

    const styles: Record<string, CSSProperties> = {
      box: {
        overflow: 'hidden',
        backgroundSize: `100% 100%`,
        width: `100vw`,
        height: `100vh`
      },
      wrapper: {
        transitionProperty: `all`,
        transitionTimingFunction: `cubic-bezier(0.4, 0, 0.2, 1)`,
        transitionDuration: `500ms`,
        position: `relative`,
        overflow: `hidden`,
        zIndex: 100,
        transformOrigin: `left top`
      }
    };

    const el = ref<HTMLElement>();
    // 缩放定位稳定前隐藏 wrapper:避免内容先从左上角渲染再跳到居中位置,
    // 也避免挂载后紧随的 resize(滚动条出现/窗口管理器调整等)触发二次缩放被 transition 动画化
    const ready = ref(false);
    // 静默窗口内没有新的 resize 重算后才认为缩放已稳定
    let settled = false;
    let settleTimer: number | undefined;
    const settle = () => {
      if (settled) return;
      settled = true;
      ready.value = true;
      // 通知首屏遮罩(#screen-loading):大屏缩放定位已稳定,可以撤掉了
      (window as any).__screenReady = true;
      window.dispatchEvent(new CustomEvent('screen-ready'));
    };
    const armSettle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 400);
    };
    /**
     * 初始化大屏容器宽高
     */
    const initSize = () => new Promise<void>(resolve => {
      nextTick(() => {
        // 获取大屏真实尺寸
        if (props.width && props.height) {
          state.width = props.width;
          state.height = props.height;
        } else {
          state.width = el.value?.clientWidth;
          state.height = el.value?.clientHeight;
        }

        // 获取画布尺寸
        if (!state.originalHeight || !state.originalWidth) {
          state.originalWidth = window.screen.width;
          state.originalHeight = window.screen.height;
        }
        resolve();
      });
    });

    function initBodyStyle() {
      if (props.bodyOverflowHidden) {
        bodyOverflowHidden = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      }
    }
    /**
     * 更新大屏容器宽高
     */
    const updateSize = () => {
      if (state.width && state.height) {
        el.value!.style.width = `${state.width}px`;
        el.value!.style.height = `${state.height}px`;
      } else {
        el.value!.style.width = `${state.originalWidth}px`;
        el.value!.style.height = `${state.originalHeight}px`;
      }
    };

    const resizeStore = useResizeStore();
    const autoScale = (scale: number) => {
      if (!props.autoScale) return;
      const domWidth = el.value!.clientWidth;
      const domHeight = el.value!.clientHeight;
      // 用视口尺寸而非 body.clientWidth/Height:body 尺寸受内容/滚动条影响,挂载初期不稳定
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      el.value!.style.transform = `scale(${scale},${scale})`;
      let mx = Math.max((currentWidth - domWidth * scale) / 2, 0);
      let my = Math.max((currentHeight - domHeight * scale) / 2, 0);
      if (typeof props.autoScale === 'object') {
        if (!props.autoScale.x) {
          mx = 0;
        }
        if (!props.autoScale.y) {
          my = 0;
        }
      }
      el.value!.style.margin = `${my}px ${mx}px`;

      // 在 updateScale 或窗口 resize 后调用
      resizeStore.triggerResize();
      resizeStore.setScale(scale);
    };
    const updateScale = () => {
      // 获取真实视口尺寸
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      // 获取大屏最终的宽高
      const realWidth = state.width || state.originalWidth;
      const realHeight = state.height || state.originalHeight;
      // 计算缩放比例
      const widthScale = currentWidth / +realWidth;
      const heightScale = currentHeight / +realHeight;
      // 若要铺满全屏，则按照各自比例缩放
      if (props.fullScreen) {
        el.value!.style.transform = `scale(${widthScale},${heightScale})`;
        return false;
      }
      // 按照宽高最小比例进行缩放
      const scale = Math.min(widthScale, heightScale);
      autoScale(scale);
    };

    const onResize = debounce(async () => {
      await initSize();
      updateSize();
      updateScale();
      // 缩放稳定前发生的每次重算都重置静默窗口,撤遮罩时机顺延到真正稳定后
      if (!settled) armSettle();
    }, props.delay);
    onMounted(() => {
      initBodyStyle();
      nextTick(async () => {
        await initSize();
        updateSize();
        updateScale();
        armSettle();
        // 兜底:最长 2s 内必须就绪,避免极端情况下遮罩一直不撤(App.vue 另有 10s 强制移除)
        window.setTimeout(settle, 2000);
        window.addEventListener('resize', onResize);
      });
    });
    onUnmounted(() => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(settleTimer);
      if (props.bodyOverflowHidden) {
        document.body.style.overflow = bodyOverflowHidden;
      }
    });

    return () => h(
      'div',
      {
        class: 'hi-screen-box',
        style: { ...styles.box, ...props.boxStyle }
      },
      [
        h(
          'div',
          {
            className: 'screen-wrapper',
            style: {
              ...styles.wrapper,
              // 稳定前禁用过渡:任何早期重算瞬时完成;稳定后恢复 500ms 供 resize 动画使用
              transitionDuration: ready.value ? '500ms' : '0ms',
              visibility: ready.value ? 'visible' : 'hidden',
              ...props.wrapperStyle
            },
            ref: el
          },
          slots.default?.()
        )
      ]
    );
  }
});
