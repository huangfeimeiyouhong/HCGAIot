import { onBeforeMount, onBeforeUnmount, onMounted } from 'vue';

import { useAppStore } from '@/store/app';

const _width = 1280;
export const useResize = () => {
  const isMobile = () => {
    const rect = document.body.getBoundingClientRect();
    return rect.width - 1 < _width;
  };

  const setDevice = () => {
    useAppStore().setDevice(isMobile() ? 'mobile' : 'desktop');
  };

  const setCollapseStatus = () => {
    const mobile = isMobile();
    if (mobile) {
      useAppStore().setCollapseStatus(true);
    } else {
      useAppStore().setCollapseStatus(false);
    }
  };

  const resizeHandler = () => {
    if (!document.hidden) {
      setDevice();
      setCollapseStatus();
    }
  };

  onBeforeMount(() => {
    window.addEventListener('resize', resizeHandler);
  });
  onBeforeUnmount(() => {
    window.removeEventListener('resize', resizeHandler);
  });
  onMounted(() => {
    setDevice();
    setCollapseStatus();
  });
};
