// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import vue from "file:///Users/phil/WorkBuddy/%E5%90%8E%E5%8E%A8%E7%AE%A1%E5%AE%B6AIoT%E5%B9%B3%E5%8F%B0/iot-desktop/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { defineConfig } from "file:///Users/phil/WorkBuddy/%E5%90%8E%E5%8E%A8%E7%AE%A1%E5%AE%B6AIoT%E5%B9%B3%E5%8F%B0/iot-desktop/node_modules/vite/dist/node/index.js";
import vueSetupExtend from "file:///Users/phil/WorkBuddy/%E5%90%8E%E5%8E%A8%E7%AE%A1%E5%AE%B6AIoT%E5%B9%B3%E5%8F%B0/iot-desktop/node_modules/vite-plugin-vue-setup-extend/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/phil/WorkBuddy/%E5%90%8E%E5%8E%A8%E7%AE%A1%E5%AE%B6AIoT%E5%B9%B3%E5%8F%B0/iot-desktop/vite.config.ts";
var vite_config_default = defineConfig({
  plugins: [vue(), vueSetupExtend()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        // 全局令牌自动注入：任何 .vue 的 <style lang="scss"> 都能直接用 $primary / @include ellipsis
        additionalData: '@use "@/styles/variables.scss" as *;\n@use "@/styles/mixins.scss" as *;\n'
      }
    }
  },
  server: {
    // 端口避开 iot-cockpit 的 9899
    port: 9900,
    host: true
    // 接口代理按需打开:
    // proxy: {
    //   '/api': { target: 'https://your-api-host', changeOrigin: true },
    // },
  },
  build: {
    chunkSizeWarningLimit: 2e3,
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ["echarts/core", "echarts/charts", "echarts/components", "echarts/renderers"],
          vendor: ["vue", "vue-router", "pinia", "element-plus", "@element-plus/icons-vue"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcGhpbC9Xb3JrQnVkZHkvXHU1NDBFXHU1M0E4XHU3QkExXHU1QkI2QUlvVFx1NUU3M1x1NTNGMC9pb3QtZGVza3RvcFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3BoaWwvV29ya0J1ZGR5L1x1NTQwRVx1NTNBOFx1N0JBMVx1NUJCNkFJb1RcdTVFNzNcdTUzRjAvaW90LWRlc2t0b3Avdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3BoaWwvV29ya0J1ZGR5LyVFNSU5MCU4RSVFNSU4RSVBOCVFNyVBRSVBMSVFNSVBRSVCNkFJb1QlRTUlQjklQjMlRTUlOEYlQjAvaW90LWRlc2t0b3Avdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCc7XG5cbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuLy8gXHU4QkE5IDxzY3JpcHQgc2V0dXAgbmFtZT1cIlhcIj4gXHU3Njg0IG5hbWUgXHU1QzVFXHU2MDI3XHU3NzFGXHU2QjYzXHU3NTFGXHU2NTQ4XHVGRjFBXG4vLyBcdTdFQzRcdTRFRjZcdTgxRUFcdTVGMTVcdTc1MjhcdTRFMEUga2VlcC1hbGl2ZSBcdTYzMDlcdTdFQzRcdTRFRjZcdTU0MERcdTdGMTNcdTVCNThcdTkwRkRcdTRGOURcdThENTZcdTVCODNcdUZGMENcdTUyRkZcdTUyMjBcbmltcG9ydCB2dWVTZXR1cEV4dGVuZCBmcm9tICd2aXRlLXBsdWdpbi12dWUtc2V0dXAtZXh0ZW5kJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3Z1ZSgpLCB2dWVTZXR1cEV4dGVuZCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICB9LFxuICB9LFxuICBjc3M6IHtcbiAgICBwcmVwcm9jZXNzb3JPcHRpb25zOiB7XG4gICAgICBzY3NzOiB7XG4gICAgICAgIC8vIFx1NTE2OFx1NUM0MFx1NEVFNFx1NzI0Q1x1ODFFQVx1NTJBOFx1NkNFOFx1NTE2NVx1RkYxQVx1NEVGQlx1NEY1NSAudnVlIFx1NzY4NCA8c3R5bGUgbGFuZz1cInNjc3NcIj4gXHU5MEZEXHU4MEZEXHU3NkY0XHU2M0E1XHU3NTI4ICRwcmltYXJ5IC8gQGluY2x1ZGUgZWxsaXBzaXNcbiAgICAgICAgYWRkaXRpb25hbERhdGE6ICdAdXNlIFwiQC9zdHlsZXMvdmFyaWFibGVzLnNjc3NcIiBhcyAqO1xcbkB1c2UgXCJAL3N0eWxlcy9taXhpbnMuc2Nzc1wiIGFzICo7XFxuJyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgLy8gXHU3QUVGXHU1M0UzXHU5MDdGXHU1RjAwIGlvdC1jb2NrcGl0IFx1NzY4NCA5ODk5XG4gICAgcG9ydDogOTkwMCxcbiAgICBob3N0OiB0cnVlLFxuICAgIC8vIFx1NjNBNVx1NTNFM1x1NEVFM1x1NzQwNlx1NjMwOVx1OTcwMFx1NjI1M1x1NUYwMDpcbiAgICAvLyBwcm94eToge1xuICAgIC8vICAgJy9hcGknOiB7IHRhcmdldDogJ2h0dHBzOi8veW91ci1hcGktaG9zdCcsIGNoYW5nZU9yaWdpbjogdHJ1ZSB9LFxuICAgIC8vIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAyMDAwLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICBlY2hhcnRzOiBbJ2VjaGFydHMvY29yZScsICdlY2hhcnRzL2NoYXJ0cycsICdlY2hhcnRzL2NvbXBvbmVudHMnLCAnZWNoYXJ0cy9yZW5kZXJlcnMnXSxcbiAgICAgICAgICB2ZW5kb3I6IFsndnVlJywgJ3Z1ZS1yb3V0ZXInLCAncGluaWEnLCAnZWxlbWVudC1wbHVzJywgJ0BlbGVtZW50LXBsdXMvaWNvbnMtdnVlJ10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXNXLFNBQVMsZUFBZSxXQUFXO0FBRXpZLE9BQU8sU0FBUztBQUNoQixTQUFTLG9CQUFvQjtBQUc3QixPQUFPLG9CQUFvQjtBQU5xSyxJQUFNLDJDQUEyQztBQVFqUCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQztBQUFBLEVBQ2pDLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJLElBQUksU0FBUyx3Q0FBZSxDQUFDO0FBQUEsSUFDdEQ7QUFBQSxFQUNGO0FBQUEsRUFDQSxLQUFLO0FBQUEsSUFDSCxxQkFBcUI7QUFBQSxNQUNuQixNQUFNO0FBQUE7QUFBQSxRQUVKLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQTtBQUFBLElBRU4sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFLUjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsdUJBQXVCO0FBQUEsSUFDdkIsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osU0FBUyxDQUFDLGdCQUFnQixrQkFBa0Isc0JBQXNCLG1CQUFtQjtBQUFBLFVBQ3JGLFFBQVEsQ0FBQyxPQUFPLGNBQWMsU0FBUyxnQkFBZ0IseUJBQXlCO0FBQUEsUUFDbEY7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
