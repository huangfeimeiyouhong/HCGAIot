<!--
 * 内层酷炫边框组件(设计稿 Frame 3467232)
 * 四角装饰为固定尺寸,边线/底部渐变条随容器宽高自适应
 -->
<template>
  <section
    ref="boxRef"
    class="border-box-13"
  >
    <svg
      v-if="width > 0 && height > 0"
      class="border-svg-container"
      :viewBox="`0 0 ${width} ${height}`"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- 背景 -->
      <rect
        :width="width"
        :height="height"
        fill="#00A3FF"
        fill-opacity="0.06"
      />

      <!-- 四角装饰(左上为基准,其余镜像) -->
      <g
        v-for="t in cornerTransforms"
        :key="t"
        :transform="t"
      >
        <path
          d="M43.44 0.26H17.79L0.26 20.41V45.01"
          stroke="#5569A5"
          stroke-opacity="0.55"
          stroke-width="0.52"
          fill="none"
        />
        <path
          d="M18.84 5.23L3.4 23.03V40.82"
          stroke="#556AA5"
          stroke-width="0.52"
          stroke-dasharray="2.09 1.05"
          fill="none"
        />
        <rect
          x="20.15"
          y="4.71"
          width="10.47"
          height="1.57"
          fill="#2762FF"
        />
        <path
          d="M0.26 12.82V15.7L13.87 0H11.25L0.26 12.82Z"
          fill="#25A0FF"
        />
      </g>

      <!-- 顶边虚线 -->
      <path
        :d="`M47.36 1.05H${width - 48.67}`"
        stroke="#7F94EE"
        stroke-opacity="0.68"
        stroke-width="0.52"
        stroke-dasharray="0.52 2.09"
        fill="none"
      />

      <!-- 左右侧边上/下段(左侧为基准,右侧镜像) -->
      <g
        v-for="t in sideTransforms"
        :key="t"
        :transform="t"
      >
        <path
          d="M0.79 66.46V171.65L2.36 173.22"
          stroke="#7F93EE"
          stroke-opacity="0.55"
          stroke-width="0.52"
          fill="none"
        />
        <path
          :d="`M0.79 ${height - 70.36}V${height - 175.55}L2.36 ${height - 177.12}`"
          stroke="#7F93EE"
          stroke-opacity="0.55"
          stroke-width="0.52"
          fill="none"
        />
        <!-- 中段竖线/实心竖条/两端三角:按设计稿纵向位置只对高盒子(≥260)有意义,
             矮盒子(如 h156 面板的内层)算出负高度会报 SVG attribute 错误且线条越界,整组隐藏 -->
        <g v-if="height > 260">
          <path
            :d="`M2.62 122.22L2.36 ${height - 126.12}`"
            stroke="#7F93EE"
            stroke-opacity="0.55"
            stroke-width="0.52"
            stroke-linecap="round"
            fill="none"
          />
          <path
            d="M0.26 122.36L1.31 123.41H0.26V122.36Z"
            fill="#8094EF"
          />
          <rect
            x="0.26"
            y="123.41"
            width="1.05"
            :height="height - 250.71"
            fill="#8094EF"
          />
          <path
            :d="`M0.26 ${height - 126.26}L1.31 ${height - 127.31}H0.26V${height - 126.26}Z`"
            fill="#8094EF"
          />
        </g>
      </g>

      <!-- 底部渐变条(宽度按比例) -->
      <rect
        v-for="bar in bottomBars"
        :key="bar.opacity"
        :x="width * bar.x"
        :y="height - 2.85"
        :width="width * bar.w"
        height="2.09"
        :fill="bar.color"
        :fill-opacity="bar.opacity"
      />
    </svg>

    <section class="border-box-content">
      <slot />
    </section>
  </section>
</template>

<script setup lang="ts" name="BorderBox13">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const boxRef = ref<HTMLElement>();
const width = ref(0);
const height = ref(0);

let observer: ResizeObserver | null = null;

onMounted(() => {
  if (!boxRef.value) return;
  observer = new ResizeObserver(([entry]) => {
    width.value = entry.contentRect.width;
    height.value = entry.contentRect.height;
  });
  observer.observe(boxRef.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
});

// 四角:左上基准,其余做水平/垂直镜像
const cornerTransforms = computed(() => [
  '',
  `translate(${width.value} 0) scale(-1 1)`,
  `translate(0 ${height.value}) scale(1 -1)`,
  `translate(${width.value} ${height.value}) scale(-1 -1)`,
]);

// 侧边:左侧基准,右侧水平镜像
const sideTransforms = computed(() => [
  '',
  `translate(${width.value} 0) scale(-1 1)`,
]);

// 底部渐变条(位置/宽度为设计稿 397 宽下的比例)
const bottomBars = [
  {
    x: 0.1207, w: 0.7327, color: '#8092F0', opacity: 0.34
  },
  {
    x: 0.1563, w: 0.4423, color: '#7F94EF', opacity: 0.565
  },
  {
    x: 0.2512, w: 0.2539, color: '#7F94EF', opacity: 0.714
  },
  {
    x: 0.2512, w: 0.2181, color: '#8093EE', opacity: 0.812
  },
];
</script>

<style lang="scss" scoped>
.border-box-13 {
  position: relative;
  width: 100%;
  height: 100%;

  .border-svg-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .border-box-content {
    position: relative;
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: 18px;
  }
}
</style>
