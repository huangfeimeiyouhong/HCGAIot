<!--
  附件上传占位 —— 点击选择文件后只存 { name, size }，不做真实上传（假设 A-5）
-->
<template>
  <div class="hi-upload">
    <div class="hi-upload__picker">
      <input
        ref="inputRef"
        type="file"
        class="hi-upload__input"
        :accept="accept"
        :multiple="max > 1"
        @change="onPick"
      >
      <el-button
        :disabled="disabled"
        @click="openPicker"
      >
        <el-icon><Upload /></el-icon>
        选择文件
      </el-button>
      <span class="hi-upload__hint">
        仅演示占位，不会上传真实文件{{ max > 1 ? `，最多 ${max} 个` : '' }}
      </span>
    </div>

    <ul
      v-if="files.length"
      class="hi-upload__list"
    >
      <li
        v-for="(file, index) in files"
        :key="`${file.name}-${index}`"
        class="hi-upload__item"
      >
        <el-icon class="hi-upload__item-icon"><Document /></el-icon>
        <span class="hi-upload__item-name">{{ file.name }}</span>
        <span class="hi-upload__item-size">{{ formatSize(file.size) }}</span>
        <el-icon
          class="hi-upload__item-del"
          @click="remove(index)"
        >
          <Delete />
        </el-icon>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts" name="UploadField">
import { computed, ref } from 'vue';

import { formatSize } from '@/utils/format';

import type { Attachment } from '@/types';

interface Props {
  modelValue: Attachment[];
  /** accept 属性（如 '.pdf,.jpg'） */
  accept?: string;
  /** 最大个数 */
  max?: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  accept: '',
  max: 5,
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: Attachment[]];
}>();

const inputRef = ref<HTMLInputElement>();

/** 已选文件列表（模板用名，避免与 modelValue 直连） */
const files = computed(() => props.modelValue);

/** 选择文件：只保留文件名与大小 */
const onPick = (e: Event): void => {
  const el = e.target as HTMLInputElement;
  const picked = Array.from(el.files ?? []);
  el.value = '';
  if (!picked.length) return;

  const room = Math.max(0, props.max - props.modelValue.length);
  const next: Attachment[] = picked.slice(0, room).map((f, i) => ({
    id: `AT-UPLOAD-${Date.now()}-${i}`,
    name: f.name,
    category: 'OTHER',
    size: f.size,
  }));
  emit('update:modelValue', [...props.modelValue, ...next]);
};

/** 打开系统文件选择器 */
const openPicker = (): void => {
  inputRef.value?.click();
};

const remove = (index: number): void => {
  const next = [...props.modelValue];
  next.splice(index, 1);
  emit('update:modelValue', next);
};
</script>

<style scoped lang="scss">
.hi-upload {
  &__picker {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__input {
    display: none;
  }

  &__hint {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__list {
    margin-top: 8px;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    margin-bottom: 4px;
    border-radius: 4px;
    background: var(--color-fill-light);
    font-size: 13px;
  }

  &__item-icon {
    color: var(--color-text-secondary);
  }

  &__item-name {
    flex: 1;
    min-width: 0;
    color: var(--color-text-body);
    @include ellipsis(1);
  }

  &__item-size {
    color: var(--color-text-secondary);
    font-size: 12px;
  }

  &__item-del {
    color: var(--color-text-secondary);
    cursor: pointer;

    &:hover {
      color: var(--color-danger);
    }
  }
}
</style>