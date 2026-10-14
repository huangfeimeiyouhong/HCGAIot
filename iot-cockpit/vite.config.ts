import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
// 让 <script setup name="X"> 的 name 属性真正生效:
// 组件自引用(如 tree-node 递归渲染 <HiTreeNode>)与 keep-alive 按组件名缓存都依赖它,勿删
import vueSetupExtend from 'vite-plugin-vue-setup-extend';

export default defineConfig({
  plugins: [vue(), vueSetupExtend()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 9899,
    host: true,
    // 接口代理按需打开:
    // proxy: {
    //   '/api': { target: 'https://your-api-host', changeOrigin: true },
    // },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'],
          vendor: ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
});
