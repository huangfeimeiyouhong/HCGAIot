// src/store/resize.js
import { defineStore } from 'pinia';

export const useResizeStore = defineStore('resize', {
  state: () => ({
    resizeSignal: Date.now(), // 或者用 Date.now() 也可以
    scale: 1,
  }),
  actions: {
    triggerResize() {
      this.resizeSignal = Date.now();
    },
    setScale(scale: number) {
      this.scale = scale;
    }
  },
});