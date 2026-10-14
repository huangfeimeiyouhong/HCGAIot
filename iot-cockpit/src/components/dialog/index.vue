<template>
  <el-dialog
    v-model="dialogVisible"
    :width="width"
    :show-close="false"
    :modal="true"
    :append-to-body="true"
    :align-center="true"
    :modal-class="modalClass"
    :class="dialogClass"
    @close="handleClose"
  >
    <!--
      弹窗挂载到 body，不受大屏缩放容器（self-adaption）限制；
      为与页面保持一致的缩放比例，对弹窗整体做 transform scale（围绕中心缩放，不影响居中）。
    -->
    <div
      class="dialog-panel"
      :style="panelStyle"
    >
      <!-- 头部：56px 深色横条，左侧标题，右侧关闭按钮 -->
      <div class="dialog-header">
        <div class="dialog-title">
          <img
            v-if="showTitleIcon"
            class="dialog-title-icon"
            :src="AccentIcon"
            alt=""
          >
          <span class="dialog-title-text">{{ title }}</span>
        </div>
        <button
          type="button"
          class="dialog-close-btn"
          @click.stop="close"
        >
          <svg
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 1L1 11M1 1L11 11"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <!-- 内容区域：超出滚动，头尾固定 -->
      <div class="dialog-body">
        <slot />
      </div>

      <!-- 底部操作按钮容器：纵向居中、靠右对齐 -->
      <div
        v-if="$slots.footer"
        class="dialog-footer"
      >
        <slot name="footer" />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts" name="Dialog">
import { computed, ref } from 'vue';

import AccentIcon from '@/assets/images/components/dialog/ic-accent.png';
import { useResizeStore } from '@/store/resize';

interface Props {
  // 标题
  title?: string;
  // 标题前是否显示装饰图标
  showTitleIcon?: boolean;
  // 弹窗宽度（设计稿 600px）
  width?: string | number;
  // 弹窗最小高度
  minHeight?: string | number;
  // 弹窗最大高度，超出后内容区滚动
  maxHeight?: string | number;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showTitleIcon: false,
  width: '600px',
  minHeight: '',
  maxHeight: '',
});

const emit = defineEmits(['close']);

const dialogVisible = ref(false);

// 读取全局大屏缩放比例（self-adaption 写入 resizeStore.scale，等比缩放下 X=Y）
const resizeStore = useResizeStore();
const scale = computed(() => resizeStore.scale || 1);

// 用 class 限定样式作用域，避免影响其它 el-overlay / el-dialog
const modalClass = 'custom-dialog-modal';
const dialogClass = 'custom-dialog';

const toCssSize = (v: string | number): string => (typeof v === 'number' ? `${v}px` : v);

const panelStyle = computed(() => ({
  minHeight: props.minHeight ? toCssSize(props.minHeight) : undefined,
  maxHeight: props.maxHeight ? toCssSize(props.maxHeight) : undefined,
  transform: `scale(${scale.value})`,
}));

const open = () => {
  dialogVisible.value = true;
};

const close = () => {
  dialogVisible.value = false;
};

const handleClose = () => {
  emit('close');
};

defineExpose({
  open,
  close,
});
</script>

<style lang="scss" scoped>
.dialog-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  border-radius: 8px;
  background-color: #03142d;
  border: 1px solid #155074;
  // 围绕中心缩放，保证弹窗仍然居中
  transform-origin: center center;
}

.dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  box-sizing: border-box;
  background-color: #082747;

  .dialog-title {
    display: flex;
    align-items: center;
    min-width: 0;

    .dialog-title-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-right: 10px;
    }
  }

  .dialog-title-text {
    min-width: 0;
    font-size: 18px;
    font-weight: 600;
    color: #f0fbff;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dialog-close-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    color: #f0fbff;
    transition: transform 0.2s ease;

    svg {
      width: 12px;
      height: 12px;
      display: block;
      margin: auto;
    }

    &:hover {
      transform: scale(1.08);
    }
  }
}

.dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
  box-sizing: border-box;
}

.dialog-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 20px 20px;
  box-sizing: border-box;
}
</style>

<style lang="scss">
.custom-dialog {
  /* Element Plus Dialog 背景与内边距由 CSS 变量控制。
     实际背景在 .dialog-panel 上，因此这里必须透明。 */
  --el-dialog-bg-color: transparent;
  --el-dialog-padding-primary: 0px;

  background-color: transparent !important;
  border-radius: 8px;
  box-shadow: none !important;

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 0 !important;
    background-color: transparent !important;
  }
}

.custom-dialog-modal {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
