/**
 * ECharts Hook —— 由 iot-cockpit 复制后改造：
 *   ① 删 useResizeStore import 与实例
 *   ② 删 watch(() => resizeStore.scale, ...) 整块（桌面端无大屏缩放）
 *   ③ 删 echarts-gl / echarts-liquidfill（3D/水球图桌面端不需要）
 *   ④ echarts.use 精简为基础 8 图 + 常用组件
 */
import { effectScope, nextTick, onScopeDispose, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';

import { useElementSize } from '@vueuse/core';
import { BarChart, GaugeChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  DatasetComponent,
  GeoComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

import type {
  BarSeriesOption,
  GaugeSeriesOption,
  LineSeriesOption,
  PieSeriesOption,
  ScatterSeriesOption,
} from 'echarts/charts';
import type {
  DatasetComponentOption,
  GeoComponentOption,
  GraphicComponentOption,
  GridComponentOption,
  LegendComponentOption,
  TitleComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption,
  VisualMapComponentOption,
} from 'echarts/components';

import 'echarts/lib/component/dataZoom';

/** 图表配置类型 */
export type ECOption = echarts.ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | PieSeriesOption
  | ScatterSeriesOption
  | GaugeSeriesOption
  | TitleComponentOption
  | LegendComponentOption
  | TooltipComponentOption
  | GridComponentOption
  | ToolboxComponentOption
  | DatasetComponentOption
  | GeoComponentOption
  | VisualMapComponentOption
  | GraphicComponentOption
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
  PieChart,
  ScatterChart,
  GaugeChart,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
  GraphicComponent,
  VisualMapComponent,
]);

/**
 * ECharts 实例管理
 * @param options 图表配置（ref 或 computed）
 * @param renderFun 渲染完成后的回调（如注册图表事件）
 * @param isGL 是否为 GL 图表（GL 图表变更配置需销毁重建）
 */
export function useEcharts(
  options: Ref<ECOption> | ComputedRef<ECOption>,
  renderFun?: (chartInstance: echarts.ECharts) => void,
  isGL = false,
) {
  const domRef = ref<HTMLElement>();
  const originalSize = ref({ width: 0, height: 0 });
  const { width, height } = useElementSize(domRef, { width: 0, height: 0 });

  let chart: echarts.ECharts | null = null;

  const canRender = (): boolean => originalSize.value.width > 0 && originalSize.value.height > 0;
  const isRendered = (): boolean => Boolean(domRef.value && chart);

  function destroy(): void {
    chart?.dispose();
    chart = null;
  }

  function update(updateOptions: ECOption): void {
    if (!isRendered()) return;
    if (isGL) {
      destroy();
      chart = echarts.init(domRef.value!, null, { devicePixelRatio: window.devicePixelRatio });
      if (renderFun) renderFun(chart);
      chart.setOption({ ...updateOptions, backgroundColor: 'transparent' });
    } else {
      chart!.clear();
      chart!.setOption({ ...updateOptions, backgroundColor: 'transparent' });
    }
  }

  async function render(): Promise<void> {
    if (!domRef.value) return;
    if (chart) destroy();
    await nextTick();
    chart = echarts.init(domRef.value, null, { devicePixelRatio: window.devicePixelRatio });
    if (renderFun) renderFun(chart);
    update(options.value);
  }

  function resize(): void {
    if (!chart || !domRef.value) return;
    chart.resize();
  }

  function hideTip(): void {
    chart?.dispatchAction({ type: 'hideTip' });
  }

  const scope = effectScope();

  scope.run(() => {
    watch([width, height], ([newWidth, newHeight]) => {
      originalSize.value.width = newWidth;
      originalSize.value.height = newHeight;
      if (newWidth === 0 && newHeight === 0) {
        // keep-alive 离场摘离文档：dispose 后置空，回场重新 init
        destroy();
        return;
      }
      if (canRender()) {
        if (isRendered()) resize();
        else void render();
      }
    });

    watch(options, (newValue) => update(newValue), { deep: !isGL });
  });

  onScopeDispose(() => {
    destroy();
    scope.stop();
  });

  return { domRef, hideTip, getChart: () => chart };
}