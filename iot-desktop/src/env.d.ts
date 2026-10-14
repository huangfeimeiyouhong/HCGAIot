/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.json' {
  const value: any;
  export default value;
}

interface ImportMetaEnv {
  /** 认证模式：mock = 演示放行 */
  readonly VITE_AUTH_MODE: string;
  /** 应用标题 */
  readonly VITE_APP_TITLE: string;
  /** IoT 大屏外链 */
  readonly VITE_COCKPIT_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}