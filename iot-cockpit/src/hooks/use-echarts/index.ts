import { nextTick, effectScope, onScopeDispose, ref, watch, } from 'vue';
import type { ComputedRef, Ref } from 'vue';

import { useElementSize } from '@vueuse/core';
import { BarChart, EffectScatterChart, GaugeChart, LineChart, LinesChart, PictorialBarChart, PieChart, RadarChart, ScatterChart, } from 'echarts/charts';
import 'echarts/lib/component/dataZoom';
import { DatasetComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  GraphicComponent,
  VisualMapComponent, } from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

import type { BarSeriesOption,
  GaugeSeriesOption,
  LineSeriesOption,
  LinesSeriesOption,
  PictorialBarSeriesOption,
  PieSeriesOption,
  RadarSeriesOption,
  ScatterSeriesOption, } from 'echarts/charts';
import type { DatasetComponentOption,
  GeoComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption, } from 'echarts/components';

import 'echarts-gl';
import 'echarts-liquidfill';
import { useResizeStore } from '@/store/resize';

export type ECOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | LinesSeriesOption
  | PieSeriesOption
  | ScatterSeriesOption
  | PictorialBarSeriesOption
  | RadarSeriesOption
  | GaugeSeriesOption
  | TitleComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | ToolboxComponentOption
  | DatasetComponentOption
  | GeoComponentOption
  | VisualMapComponentOption
>;

echarts.use([
  TitleComponent,
  LegendComponent,
  TooltipComponent,
  GridComponent,
  DatasetComponent,
  GeoComponent,
  TransformComponent,
  ToolboxComponent,
  BarChart,
  LineChart,
  LinesChart,
  PieChart,
  ScatterChart,
  EffectScatterChart,
  PictorialBarChart,
  RadarChart,
  GaugeChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  GraphicComponent,
  VisualMapComponent
]);

const resizeStore = useResizeStore();

/**
 * Echarts hooks函数
 * @param options - 图表配置
 * @param renderFun - 图表渲染函数(例如：图表监听函数)
 * @description 按需引入图表组件，没注册的组件需要先引入
 */
export function useEcharts(
  options: Ref<ECOption> | ComputedRef<ECOption>,
  renderFun?: (chartInstance: echarts.ECharts) => void,
  isGL: boolean = false
) {
  const domRef = ref<HTMLElement>();

  const originalSize = ref({ width: 0, height: 0 });
  const { width, height } = useElementSize(domRef, { width: 0, height: 0 });

  let chart: echarts.ECharts | null = null;

  function canRender() {
    return originalSize.value.width > 0 && originalSize.value.height > 0;
  }

  function isRendered() {
    return Boolean(domRef.value && chart);
  }

  function update(updateOptions: ECOption) {
    if (!isRendered()) return;
    if (isGL) {
      // 3D 图表：完全销毁再重建，释放 WebGL 资源
      destroy();
      chart = echarts.init(domRef.value!, null, {
        devicePixelRatio: window.devicePixelRatio,
      });
      if (renderFun) renderFun(chart);
      chart.setOption({ ...updateOptions, backgroundColor: 'transparent' });
    } else {
      chart?.clear();
      chart!.setOption({
        ...updateOptions, backgroundColor: 'transparent'
      });
    }
  }

  function destroy() {
    chart?.dispose();
  }

  async function render() {
    if (!domRef.value) {
      return;
    }
    if (chart) {
      destroy();
    }
    await nextTick();
    chart = echarts.init(domRef.value, null, {
      // renderer: 'svg',
      devicePixelRatio: window.devicePixelRatio,
    });
    if (renderFun) {
      renderFun(chart);
    }
    update(options.value);
  }

  function resize() {
    if (!chart || !domRef.value) return;
    chart?.resize();
    // 计算实际需要的尺寸（考虑缩放比例）
    // const actualWidth = originalSize.value.width * resizeStore.scale;

    // const actualHeight = originalSize.value.height * resizeStore.scale;

    // 设置容器尺寸
    // domRef.value.style.width = `${actualWidth}px`;
    // domRef.value.style.height = `${actualHeight}px`;

    // 图表缩放（反向缩放保持清晰度）
    // const scale = 1 / resizeStore.scale;
    // domRef.value.style.transform = `scale(${scale})`;
    // domRef.value.style.transformOrigin = 'left top';
    // chart?.resize({
    //   width: originalSize.value.width,
    //   height: originalSize.value.height
    // });
    // 使用防抖避免频繁重绘
    // requestAnimationFrame(() => {
    //   chart?.resize({
    //     width: originalSize.value.width,
    //     height: originalSize.value.height
    //   });
    // });
  }

  function hideTip() {
    chart?.dispatchAction({
      type: 'hideTip',
    });
  }

  const scope = effectScope();

  scope.run(() => {
    watch([width, height], ([newWidth, newHeight]) => {
      originalSize.value.width = newWidth;
      originalSize.value.height = newHeight;
      if (newWidth === 0 && newHeight === 0) {
        // 节点被删除(keep-alive 离场摘离文档):dispose 后置空——只置空不 dispose,
        // 回场 render() 会对同 dom 二次 init,echarts 告警
        // "There is a chart instance already initialized on the dom"(复用旧实例,功能无损但有噪音)
        destroy();
        chart = null;
      }
      if (canRender()) {
        if (isRendered()) {
          resize();
        } else {
          render();
        }
      }
    });

    watch(
      options,
      (newValue) => {
        update(newValue);
      },
      { deep: !isGL }
    );

    // 监听全局缩放比例变化
    watch(
      () => resizeStore.scale,
      (newScale) => {
        if (newScale > 0 && domRef.value) {
          resize();
        }
      },
      { immediate: true }
    );
  });

  onScopeDispose(() => {
    destroy();
    scope.stop();
  });

  return {
    domRef,
    hideTip,
    getChart: () => chart,
  };
}
