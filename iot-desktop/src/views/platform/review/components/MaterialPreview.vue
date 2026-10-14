<!--
  材料预览 —— 附件列表（演示环境只有文件名与大小，不做真实预览，见假设 A-5）
-->
<template>
  <div class="material">
    <ul v-if="attachments.length" class="material__list">
      <li
        v-for="file in attachments"
        :key="file.id"
        class="material__item"
      >
        <el-icon class="material__icon">
          <component :is="iconOf(file.category)" />
        </el-icon>
        <div class="material__meta">
          <span class="material__name">{{ file.name }}</span>
          <span class="material__size">{{ formatSize(file.size) }} · {{ categoryLabel(file.category) }}</span>
        </div>
        <el-tooltip content="演示环境不提供真实预览">
          <el-button
            text
            size="small"
            @click="onPreview(file)"
          >
            预览
          </el-button>
        </el-tooltip>
      </li>
    </ul>
    <p
      v-else
      class="material__empty"
    >
      暂无提交材料
    </p>
  </div>
</template>

<script setup lang="ts" name="MaterialPreview">
import { ElMessage } from 'element-plus';

import { formatSize } from '@/utils/format';

import type { Attachment } from '@/types';

interface Props {
  attachments: Attachment[];
}

defineProps<Props>();

/** 类别 → 图标 */
const iconOf = (category: Attachment['category']): string => {
  const map: Record<Attachment['category'], string> = {
    LICENSE: 'Postcard',
    PRODUCT: 'Document',
    MATERIAL: 'Files',
    SITE_PHOTO: 'Picture',
    OTHER: 'Document',
  };
  return map[category] ?? 'Document';
};

/** 类别中文名 */
const categoryLabel = (category: Attachment['category']): string => {
  const map: Record<Attachment['category'], string> = {
    LICENSE: '主体资质',
    PRODUCT: '产品资料',
    MATERIAL: '能力材料',
    SITE_PHOTO: '现场照片',
    OTHER: '其他',
  };
  return map[category] ?? '其他';
};

/** 预览（演示环境只提示，不打开真实文件） */
const onPreview = (file: Attachment): void => {
  ElMessage.info(`演示环境不提供真实文件预览：${file.name}`);
};
</script>

<style scoped lang="scss">
.material {
  &__list {
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    margin-bottom: 8px;
    border-radius: 4px;
    background: var(--color-fill-light);
  }

  &__icon {
    color: var(--color-text-secondary);
    font-size: 18px;
  }

  &__meta {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }

  &__name {
    color: var(--color-text-body);
    font-size: 13px;
    @include ellipsis(1);
  }

  &__size {
    color: var(--color-text-secondary);
    font-size: 11px;
  }

  &__empty {
    color: var(--color-text-secondary);
    font-size: 13px;
  }
}
</style>