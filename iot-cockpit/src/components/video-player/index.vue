/**
 * 通用视频播放组件(基于开源 video.js: https://github.com/videojs/video.js)
 * - 支持 MP4/WebM/HLS(m3u8,video.js 8 内置 VHS)
 * - 大屏场景常用:muted + autoplay + loop 静音轮播
 * - 卸载自动 dispose,keep-alive 回场不泄漏
 * 使用示例:在模板中引入本组件,props 传 src / poster / autoplay / muted / loop / controls / fit 即可
 * (示例用法见 views/dashboard 示例页;注意:SFC 顶部注释中不可写字面量标签,
 *  否则会被 Vue 编译器解析为自定义块,Vite 会把其 src 属性当模块导入)
 */
<template>
  <div class="video-player">
    <video
      ref="videoRef"
      class="video-js vjs-default-skin"
    />
  </div>
</template>

<script setup lang="ts" name="VideoPlayer">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

interface Props {
  /** 视频地址(mp4 / webm / m3u8) */
  src: string;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  /** 填充方式:contain 完整显示 / cover 裁切铺满(大屏监控画面常用 cover) */
  fit?: 'contain' | 'cover';
}

const props = withDefaults(defineProps<Props>(), {
  poster: '',
  autoplay: false,
  muted: true,
  loop: false,
  controls: true,
  fit: 'cover',
});

const videoRef = ref<HTMLVideoElement>();
let player: Player | null = null;

const guessType = (src: string) => {
  if (/\.m3u8(\?|$)/i.test(src)) return 'application/x-mpegURL';
  if (/\.webm(\?|$)/i.test(src)) return 'video/webm';
  return 'video/mp4';
};

onMounted(() => {
  player = videojs(videoRef.value!, {
    autoplay: props.autoplay,
    muted: props.muted,
    loop: props.loop,
    controls: props.controls,
    preload: 'auto',
    poster: props.poster || undefined,
    fluid: true,
    sources: [{ src: props.src, type: guessType(props.src) }],
  });
});

watch(
  () => props.src,
  (src) => {
    if (player && src) {
      player.src({ src, type: guessType(src) });
    }
  }
);

onBeforeUnmount(() => {
  player?.dispose();
  player = null;
});
</script>

<style lang="scss" scoped>
.video-player {
  width: 100%;
  height: 100%;
  background: #000;
  overflow: hidden;

  :deep(.video-js) {
    width: 100%;
    height: 100%;
  }

  // cover 模式:video 元素裁切铺满容器
  :deep(.vjs-tech) {
    object-fit: v-bind(fit);
  }
}
</style>
